import { AI_SERVICES } from './services.js';

const STORAGE_KEY = 'lastService';
const DEFAULT_SERVICE = 'perplexity';

let currentService = DEFAULT_SERVICE;

const queryInput = document.getElementById('query');

function setSelectedService(serviceKey) {
  currentService = serviceKey;
  document.querySelectorAll('.service').forEach(el => {
    el.classList.toggle('selected', el.dataset.service === serviceKey);
  });
  queryInput.placeholder = `Ask ${AI_SERVICES[serviceKey].name}...`;
  chrome.storage.local.set({ [STORAGE_KEY]: serviceKey });
}

document.addEventListener('DOMContentLoaded', () => {
  // Restore last used service, then fall back to default
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const saved = result[STORAGE_KEY];
    const serviceKey = (saved && AI_SERVICES[saved]) ? saved : DEFAULT_SERVICE;
    setSelectedService(serviceKey);
  });

  // Service tile click handlers
  document.querySelectorAll('.service').forEach(serviceEl => {
    serviceEl.addEventListener('click', () => {
      setSelectedService(serviceEl.dataset.service);
    });
  });

  // Submit handlers
  document.getElementById('submitQuery').addEventListener('click', handleSubmit);
  queryInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  });

  queryInput.focus();
});

function handleSubmit() {
  const query = queryInput.value.trim();
  if (!query) return;
  openServicePage(query);
}

function openServicePage(query) {
  const service = AI_SERVICES[currentService];
  let url;

  if (service.directUrl) {
    url = service.directUrl.replace('%s', encodeURIComponent(query));
  } else {
    url = service.url;
    if (service.queryParam) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}${service.queryParam}=${encodeURIComponent(query)}`;
    }
  }

  chrome.tabs.create({ url });
}
