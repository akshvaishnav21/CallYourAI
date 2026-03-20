import { AI_SERVICES } from './services.js';

const STORAGE_KEY_SERVICE  = 'lastService';
const STORAGE_KEY_HISTORY  = 'queryHistory';
const STORAGE_KEY_USAGE    = 'usageCounts';
const STORAGE_KEY_ORDER    = 'serviceOrder';
const STORAGE_KEY_ENABLED  = 'enabledServices';
const STORAGE_KEY_CUSTOM   = 'customServices';
const HISTORY_MAX          = 10;
const DEFAULT_SERVICE      = 'perplexity';

let currentService  = DEFAULT_SERVICE;
let queryHistory    = [];
let usageCounts     = {};
let allServices     = {};   // merged built-in + custom
let keyboardIndex   = -1;   // for arrow-key nav in service grid

const queryInput = document.getElementById('query');

// ─── Boot ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(
    [STORAGE_KEY_SERVICE, STORAGE_KEY_HISTORY, STORAGE_KEY_USAGE,
     STORAGE_KEY_ORDER, STORAGE_KEY_ENABLED, STORAGE_KEY_CUSTOM],
    (result) => {
      const order   = result[STORAGE_KEY_ORDER]   || Object.keys(AI_SERVICES).filter(k => k !== 'bard');
      const enabled = result[STORAGE_KEY_ENABLED] ? new Set(result[STORAGE_KEY_ENABLED]) : null;
      const custom  = result[STORAGE_KEY_CUSTOM]  || [];

      // Build merged service map respecting order + enabled
      allServices = {};
      for (const key of order) {
        if (AI_SERVICES[key] && (!enabled || enabled.has(key))) {
          allServices[key] = AI_SERVICES[key];
        }
      }
      for (const svc of custom) {
        allServices[svc.key] = {
          name: svc.name, icon: svc.icon || '🔗',
          url: svc.url, directUrl: svc.url, queryParam: 'q'
        };
      }

      queryHistory = result[STORAGE_KEY_HISTORY] || [];
      usageCounts  = result[STORAGE_KEY_USAGE]   || {};

      // Determine current service
      const saved = result[STORAGE_KEY_SERVICE];
      currentService = (saved && allServices[saved]) ? saved : Object.keys(allServices)[0] || DEFAULT_SERVICE;

      renderServiceGrid();
      renderHistory();
      setSelectedService(currentService, false);

      queryInput.focus();
    }
  );

  // Submit handlers
  document.getElementById('submitQuery').addEventListener('click', handleSubmit);
  document.getElementById('askAllBtn').addEventListener('click', handleAskAll);
  document.getElementById('summarizeBtn').addEventListener('click', handleSummarizePage);
  document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  queryInput.addEventListener('keydown', onInputKeyDown);
});

// ─── Service grid ──────────────────────────────────────────────────────────

function renderServiceGrid() {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = '';

  for (const [key, svc] of Object.entries(allServices)) {
    const tile = document.createElement('div');
    tile.className = 'service';
    tile.dataset.service = key;

    const count = usageCounts[key] || 0;
    tile.innerHTML = `
      <span class="emoji">${svc.icon}</span>
      <span class="svc-name">${svc.name}</span>
      ${count > 0 ? `<span class="usage-badge">${count}</span>` : ''}
    `;
    tile.addEventListener('click', () => setSelectedService(key));
    grid.appendChild(tile);
  }
}

function setSelectedService(key, persist = true) {
  currentService = key;
  document.querySelectorAll('.service').forEach(el => {
    el.classList.toggle('selected', el.dataset.service === key);
  });
  const svc = allServices[key];
  if (svc) queryInput.placeholder = `Ask ${svc.name}...`;
  if (persist) chrome.storage.local.set({ [STORAGE_KEY_SERVICE]: key });
}

// ─── Keyboard navigation in service grid ──────────────────────────────────

function onInputKeyDown(e) {
  const tiles = [...document.querySelectorAll('.service')];
  if (!tiles.length) return;

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    keyboardIndex = (keyboardIndex + 1) % tiles.length;
    setSelectedService(tiles[keyboardIndex].dataset.service);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    keyboardIndex = (keyboardIndex - 1 + tiles.length) % tiles.length;
    setSelectedService(tiles[keyboardIndex].dataset.service);
  } else if (e.key === 'Enter') {
    handleSubmit();
  }
}

// ─── Query history ─────────────────────────────────────────────────────────

function renderHistory() {
  const container = document.getElementById('historyList');
  container.innerHTML = '';

  if (!queryHistory.length) {
    document.getElementById('historySection').style.display = 'none';
    return;
  }

  document.getElementById('historySection').style.display = 'block';

  for (const entry of queryHistory) {
    const svc = allServices[entry.service];
    const icon = svc ? svc.icon : '🔗';

    const item = document.createElement('div');
    item.className = 'history-item';
    item.title = entry.query;
    item.innerHTML = `
      <span class="h-icon">${icon}</span>
      <span class="h-text">${entry.query}</span>
    `;
    item.addEventListener('click', () => {
      queryInput.value = entry.query;
      if (allServices[entry.service]) setSelectedService(entry.service);
      queryInput.focus();
    });
    container.appendChild(item);
  }
}

function addToHistory(serviceKey, query) {
  // Remove duplicate if same query+service exists
  queryHistory = queryHistory.filter(
    e => !(e.service === serviceKey && e.query === query)
  );
  queryHistory.unshift({ service: serviceKey, query });
  if (queryHistory.length > HISTORY_MAX) queryHistory.length = HISTORY_MAX;
  chrome.storage.local.set({ [STORAGE_KEY_HISTORY]: queryHistory });
}

// ─── Usage counts ──────────────────────────────────────────────────────────

function incrementUsage(serviceKey) {
  usageCounts[serviceKey] = (usageCounts[serviceKey] || 0) + 1;
  chrome.storage.local.set({ [STORAGE_KEY_USAGE]: usageCounts });
}

// ─── URL builder ───────────────────────────────────────────────────────────

function buildUrl(svc, query) {
  if (svc.directUrl) {
    return svc.directUrl.replace('%s', encodeURIComponent(query));
  }
  const sep = svc.url.includes('?') ? '&' : '?';
  return `${svc.url}${sep}${svc.queryParam}=${encodeURIComponent(query)}`;
}

// ─── Actions ───────────────────────────────────────────────────────────────

function handleSubmit() {
  const query = queryInput.value.trim();
  if (!query) return;

  const svc = allServices[currentService];
  if (!svc) return;

  addToHistory(currentService, query);
  incrementUsage(currentService);
  renderHistory();
  renderServiceGrid();  // refresh badges
  setSelectedService(currentService, false);

  chrome.tabs.create({ url: buildUrl(svc, query) });
}

function handleAskAll() {
  const query = queryInput.value.trim();
  if (!query) return;

  for (const [key, svc] of Object.entries(allServices)) {
    chrome.tabs.create({ url: buildUrl(svc, query) });
    incrementUsage(key);
  }
  addToHistory('all', query);
  renderHistory();
  renderServiceGrid();
}

function handleSummarizePage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

    const query = `Summarize this page: ${tab.url}`;
    queryInput.value = query;

    const svc = allServices[currentService];
    if (!svc) return;

    addToHistory(currentService, query);
    incrementUsage(currentService);
    renderHistory();
    renderServiceGrid();
    setSelectedService(currentService, false);

    chrome.tabs.create({ url: buildUrl(svc, query) });
  });
}
