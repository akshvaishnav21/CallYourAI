import { AI_SERVICES } from './services.js';

// ─── Context Menu Setup ────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Parent menu item
  chrome.contextMenus.create({
    id: 'ask-ai',
    title: 'Ask AI about "%s"',
    contexts: ['selection']
  });

  // One sub-item per service (skip legacy 'bard' alias)
  for (const [key, svc] of Object.entries(AI_SERVICES)) {
    if (key === 'bard') continue;
    chrome.contextMenus.create({
      id: `ask-ai-${key}`,
      parentId: 'ask-ai',
      title: `${svc.icon} ${svc.name}`,
      contexts: ['selection']
    });
  }
});

chrome.contextMenus.onClicked.addListener((info) => {
  const prefix = 'ask-ai-';
  if (!info.menuItemId.startsWith(prefix)) return;

  const serviceKey = info.menuItemId.slice(prefix.length);
  const service = AI_SERVICES[serviceKey];
  if (!service || !info.selectionText) return;

  const url = buildUrl(service, info.selectionText.trim());
  chrome.tabs.create({ url });
});

// ─── Navigation Interception ───────────────────────────────────────────────

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;

  try {
    const url = new URL(details.url);

    if (url.pathname === '/@' || url.pathname.startsWith('/@')) {
      const query = url.pathname.substring(2);
      if (query) {
        chrome.tabs.update(details.tabId, { url: 'about:blank' });
        handleAIQuery('@' + query, details.tabId);
        return;
      }
    }

    if (
      url.hostname.includes('google.com') ||
      url.hostname.includes('bing.com') ||
      url.hostname.includes('yahoo.com') ||
      url.hostname.includes('duckduckgo.com')
    ) {
      for (const key of ['q', 'query', 'p', 'text']) {
        const query = url.searchParams.get(key);
        if (query && query.startsWith('@')) {
          chrome.tabs.update(details.tabId, { url: 'about:blank' });
          handleAIQuery(query, details.tabId);
          return;
        }
      }
    }
  } catch (e) {
    console.error('Error processing navigation:', e);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;

  try {
    const url = new URL(changeInfo.url);
    if (url.href.startsWith('http://@') || url.href.startsWith('https://@')) {
      const query = changeInfo.url.split('://')[1];
      if (query.startsWith('@')) {
        chrome.tabs.update(tabId, { url: 'about:blank' });
        handleAIQuery(query, tabId);
      }
    }
  } catch (e) {
    console.error('Error in address bar handler:', e);
  }
});

// ─── Query Parsing ─────────────────────────────────────────────────────────

/**
 * Resolve a typed service name to a key in AI_SERVICES.
 * Supports exact match first, then prefix match (single unambiguous result).
 */
function resolveServiceKey(typed) {
  const lower = typed.toLowerCase();

  if (AI_SERVICES[lower]) return lower;

  const prefixMatches = Object.keys(AI_SERVICES).filter(k => k.startsWith(lower));
  if (prefixMatches.length === 1) return prefixMatches[0];

  return null;
}

/**
 * Parse "@<service> <query>" or "@all <query>" from user input.
 */
function extractServiceFromInput(input) {
  const match = input.match(/^@([a-zA-Z]+)\s+(.+)/);
  if (!match) return null;

  const typed = match[1].toLowerCase();
  const query = match[2].trim();

  // Broadcast mode
  if (typed === 'all') {
    return { all: true, query };
  }

  const serviceKey = resolveServiceKey(typed);
  if (!serviceKey) return null;

  return { service: AI_SERVICES[serviceKey], serviceKey, query };
}

// ─── URL Builder ───────────────────────────────────────────────────────────

function buildUrl(service, query) {
  if (service.directUrl) {
    return service.directUrl.replace('%s', encodeURIComponent(query));
  }
  const sep = service.url.includes('?') ? '&' : '?';
  return `${service.url}${sep}${service.queryParam}=${encodeURIComponent(query)}`;
}

// ─── Main Handler ──────────────────────────────────────────────────────────

function handleAIQuery(input) {
  const extracted = extractServiceFromInput(input);
  if (!extracted) return;

  const { query } = extracted;

  if (extracted.all) {
    // Open every service in a new tab
    for (const [key, svc] of Object.entries(AI_SERVICES)) {
      if (key === 'bard') continue; // skip alias
      chrome.tabs.create({ url: buildUrl(svc, query) });
    }
    return;
  }

  const { service } = extracted;
  const url = buildUrl(service, query);

  chrome.tabs.query({}, (tabs) => {
    const existing = tabs.find(t => t.url && t.url.startsWith(service.url));
    if (existing) {
      chrome.tabs.update(existing.id, { active: true, url });
    } else {
      chrome.tabs.create({ url });
    }
  });
}

// ─── Omnibox ───────────────────────────────────────────────────────────────

chrome.omnibox.setDefaultSuggestion({
  description: 'Type: @chatgpt, @gemini, @claude, @perplexity, @copilot, or @all &lt;query&gt;'
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const serviceMatch = text.match(/^([a-zA-Z]*)(?:\s+(.*))?$/);
  if (!serviceMatch) return;

  const typed = serviceMatch[1].toLowerCase();
  const queryPart = serviceMatch[2] || '';

  const allEntry = {
    content: `all${queryPart ? ' ' + queryPart : ''}`,
    description: `🌐 <match>all</match>: Ask every AI service${queryPart ? ` "${queryPart}"` : ''}`
  };

  const serviceSuggestions = Object.entries(AI_SERVICES)
    .filter(([key]) => key !== 'bard')
    .map(([key, svc]) => ({
      content: `${key}${queryPart ? ' ' + queryPart : ''}`,
      description: `${svc.icon} <match>${key}</match>: ${svc.description}${queryPart ? ` "${queryPart}"` : ''}`,
      _matchScore: key === typed ? 2 : key.startsWith(typed) ? 1 : 0
    }))
    .sort((a, b) => b._matchScore - a._matchScore)
    .slice(0, 4);

  suggest([allEntry, ...serviceSuggestions]);
});

chrome.omnibox.onInputEntered.addListener((text) => {
  handleAIQuery('@' + text);
});
