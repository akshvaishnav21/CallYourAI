import { AI_SERVICES } from './services.js';

// Add listener for webNavigation events to intercept address bar navigation
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Only process main frame navigations
  if (details.frameId === 0) {
    try {
      const url = new URL(details.url);

      // Check if this is a direct navigation to an @ command
      if (url.pathname === '/@' || url.pathname.startsWith('/@')) {
        const query = url.pathname.substring(2);
        if (query) {
          chrome.tabs.update(details.tabId, { url: 'about:blank' });
          handleAIQuery('@' + query);
          return;
        }
      }

      // Check for search engine queries containing @ commands
      if (url.hostname.includes('google.com') ||
          url.hostname.includes('bing.com') ||
          url.hostname.includes('yahoo.com') ||
          url.hostname.includes('duckduckgo.com')) {

        const searchParams = url.searchParams;
        const searchKeys = ['q', 'query', 'p', 'text'];

        for (const key of searchKeys) {
          if (searchParams.has(key)) {
            const query = searchParams.get(key);
            if (query && query.startsWith('@')) {
              chrome.tabs.update(details.tabId, { url: 'about:blank' });
              handleAIQuery(query);
              return;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error processing navigation:', e);
    }
  }
});

// Direct address bar handler
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    try {
      const url = new URL(changeInfo.url);

      if (url.href.startsWith('http://@') || url.href.startsWith('https://@')) {
        const query = changeInfo.url.split('://')[1];
        if (query.startsWith('@')) {
          chrome.tabs.update(tabId, { url: 'about:blank' });
          handleAIQuery(query);
        }
      }
    } catch (e) {
      console.error('Error in address bar handler:', e);
    }
  }
});

/**
 * Extracts the AI service and query from user input.
 * @param {string} input - User input text (e.g. "@chatgpt what is AI")
 * @returns {Object|null}
 */
function extractServiceFromInput(input) {
  const match = input.match(/^@([a-zA-Z]+)\s+(.+)/);

  if (match) {
    const serviceName = match[1].toLowerCase();
    const query = match[2].trim();

    if (AI_SERVICES[serviceName]) {
      return {
        service: AI_SERVICES[serviceName],
        serviceKey: serviceName,
        query
      };
    }
  }

  return null;
}

/**
 * Main handler for processing AI queries.
 * @param {string} input - User input from address bar
 */
function handleAIQuery(input) {
  const extractedData = extractServiceFromInput(input);

  if (!extractedData) {
    return;
  }

  const { service, query } = extractedData;

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

  chrome.tabs.query({}, (tabs) => {
    const existingTab = tabs.find(tab => tab.url && tab.url.startsWith(service.url));

    if (existingTab) {
      chrome.tabs.update(existingTab.id, { active: true, url });
    } else {
      chrome.tabs.create({ url });
    }
  });
}

// Set default suggestion text shown when user types "@" in the address bar
chrome.omnibox.setDefaultSuggestion({
  description: 'Type an AI service name: @chatgpt, @gemini, @claude, @perplexity, @copilot'
});

// Fired each time the user updates the text in the omnibox
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const serviceMatch = text.match(/^([a-zA-Z]+)(?:\s+(.*))?$/);

  if (serviceMatch) {
    const serviceName = serviceMatch[1].toLowerCase();
    const serviceObj = AI_SERVICES[serviceName];

    if (serviceObj) {
      const suggestions = [{
        content: text,
        description: `${serviceObj.icon} <match>${serviceName}</match>: ${serviceObj.description} ${serviceMatch[2] ? `"${serviceMatch[2]}"` : ''}`
      }];

      const otherSuggestions = Object.entries(AI_SERVICES)
        .filter(([key]) => key !== serviceName)
        .map(([key, svc]) => ({
          content: `${key}${serviceMatch[2] ? ' ' + serviceMatch[2] : ''}`,
          description: `${svc.icon} <match>${key}</match>: ${svc.description} ${serviceMatch[2] ? `"${serviceMatch[2]}"` : ''}`
        }));

      suggest([...suggestions, ...otherSuggestions.slice(0, 4)]);
    } else {
      const allSuggestions = Object.entries(AI_SERVICES).map(([key, svc]) => ({
        content: `${key}${serviceMatch[2] ? ' ' + serviceMatch[2] : ''}`,
        description: `${svc.icon} <match>${key}</match>: ${svc.description} ${serviceMatch[2] ? `"${serviceMatch[2]}"` : ''}`
      }));

      suggest(allSuggestions.slice(0, 5));
    }
  }
});

// Fired when the user accepts a suggestion from the omnibox
chrome.omnibox.onInputEntered.addListener((text) => {
  handleAIQuery('@' + text);
});
