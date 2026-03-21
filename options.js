import { AI_SERVICES } from './services.js';

const BUILT_IN_KEYS = Object.keys(AI_SERVICES).filter(k => k !== 'bard');

// ─── State ─────────────────────────────────────────────────────────────────

let serviceOrder   = [...BUILT_IN_KEYS];
let enabledSet     = new Set(BUILT_IN_KEYS);
let customServices = [];   // [{ key, name, icon, url }]
let defaultService = 'perplexity';

// ─── Load settings ─────────────────────────────────────────────────────────

chrome.storage.local.get(
  ['serviceOrder', 'enabledServices', 'customServices', 'lastService'],
  (result) => {
    if (result.serviceOrder)    serviceOrder   = result.serviceOrder;
    if (result.enabledServices) enabledSet     = new Set(result.enabledServices);
    if (result.customServices)  customServices = result.customServices;
    if (result.lastService)     defaultService = result.lastService;

    renderDefaultSelect();
    renderServiceList();
    renderCustomList();
  }
);

// ─── Default service select ────────────────────────────────────────────────

function renderDefaultSelect() {
  const select = document.getElementById('defaultService');
  select.innerHTML = '';

  const allKeys = [...serviceOrder, ...customServices.map(s => s.key)];
  for (const key of allKeys) {
    const svc = AI_SERVICES[key] || customServices.find(s => s.key === key);
    if (!svc) continue;
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${svc.icon || '🔗'} ${svc.name}`;
    opt.selected = key === defaultService;
    select.appendChild(opt);
  }
}

// ─── Built-in service list (drag-to-reorder + toggle) ─────────────────────

function renderServiceList() {
  const container = document.getElementById('serviceToggleList');
  container.innerHTML = '';

  for (const key of serviceOrder) {
    const svc = AI_SERVICES[key];
    if (!svc) continue;

    const row = document.createElement('div');
    row.className = 'service-toggle';
    row.draggable = true;
    row.dataset.key = key;
    row.innerHTML = `
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <input type="checkbox" data-key="${key}" ${enabledSet.has(key) ? 'checked' : ''}>
      <span class="emoji">${svc.icon}</span>
      <span class="name">${svc.name}</span>
    `;
    container.appendChild(row);
  }

  addDragHandlers(container);
}

let dragSrc = null;

function addDragHandlers(container) {
  container.addEventListener('dragstart', (e) => {
    dragSrc = e.target.closest('.service-toggle');
    dragSrc.classList.add('dragging');
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('.service-toggle');
    if (!target || target === dragSrc) return;

    const rect = target.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    container.insertBefore(dragSrc, after ? target.nextSibling : target);
  });

  container.addEventListener('dragend', () => {
    if (dragSrc) dragSrc.classList.remove('dragging');
    dragSrc = null;
    // Update serviceOrder from DOM
    serviceOrder = [...container.querySelectorAll('.service-toggle')].map(
      el => el.dataset.key
    );
    renderDefaultSelect();
  });
}

// ─── Custom services ───────────────────────────────────────────────────────

function renderCustomList() {
  const container = document.getElementById('customServiceList');
  container.innerHTML = '';

  for (const svc of customServices) {
    const row = document.createElement('div');
    row.className = 'custom-service-entry';
    row.innerHTML = `
      <span>${svc.icon || '🔗'}</span>
      <span class="name">${svc.name}</span>
      <span class="url">${svc.url}</span>
      <button class="btn-danger" data-key="${svc.key}">Remove</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      customServices = customServices.filter(s => s.key !== svc.key);
      renderCustomList();
      renderDefaultSelect();
    });
    container.appendChild(row);
  }
}

document.getElementById('addCustom').addEventListener('click', () => {
  const name  = document.getElementById('customName').value.trim();
  const icon  = document.getElementById('customEmoji').value.trim() || '🔗';
  const url   = document.getElementById('customUrl').value.trim();

  if (!name || !url || !url.includes('%s')) {
    alert('Please provide a name and a URL containing %s as the query placeholder.');
    return;
  }

  const key = 'custom_' + name.toLowerCase().replace(/\s+/g, '_');
  if (customServices.find(s => s.key === key)) {
    alert('A custom service with this name already exists.');
    return;
  }

  customServices.push({ key, name, icon, url });
  renderCustomList();
  renderDefaultSelect();

  document.getElementById('customName').value  = '';
  document.getElementById('customEmoji').value = '';
  document.getElementById('customUrl').value   = '';
});

// ─── Save ──────────────────────────────────────────────────────────────────

document.getElementById('saveBtn').addEventListener('click', () => {
  // Read enabled checkboxes
  const checked = [...document.querySelectorAll('.service-toggle input[type="checkbox"]')]
    .filter(cb => cb.checked)
    .map(cb => cb.dataset.key);

  const selectedDefault = document.getElementById('defaultService').value;

  chrome.storage.local.set({
    serviceOrder,
    enabledServices: checked,
    customServices,
    lastService: selectedDefault
  }, () => {
    const msg = document.getElementById('savedMsg');
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
  });
});
