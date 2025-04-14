// Dictionary of supported AI services with their details
const AI_SERVICES = {
  'chatgpt': {
    name: 'ChatGPT',
    url: 'https://chat.openai.com/',
    directUrl: 'https://chat.openai.com/chat?q=%s', // URL with query parameter support
    queryParam: 'q', // Parameter name for query
    selector: 'textarea[data-id="root"]', // Primary selector for main input field
    alternativeSelectors: [
      'textarea[placeholder="Message ChatGPT…"]', 
      'textarea.w-full'
    ]
  },
  'gemini': {
    name: 'Google Gemini',
    url: 'https://gemini.google.com/',
    directUrl: 'https://gemini.google.com/?text=%s', // URL with query parameter
    queryParam: 'text',
    selector: 'input[aria-label="Ask Gemini"]', // Selector for the input field
    alternativeSelectors: [
      'textarea[placeholder="Ask me anything..."]',
      'textarea.message-input'
    ]
  },
  'bard': {
    name: 'Google Gemini', // Bard is now Gemini
    url: 'https://gemini.google.com/',
    directUrl: 'https://gemini.google.com/?text=%s',
    queryParam: 'text',
    selector: 'input[aria-label="Ask Gemini"]',
    alternativeSelectors: [
      'textarea[placeholder="Ask me anything..."]',
      'textarea.message-input'
    ]
  },
  'bingchat': {
    name: 'Bing Chat',
    url: 'https://www.bing.com/chat',
    directUrl: 'https://www.bing.com/chat?q=%s',
    queryParam: 'q',
    selector: 'textarea#searchbox',
    alternativeSelectors: [
      'cib-serp-main textarea',
      'textarea[placeholder="Ask me anything..."]'
    ]
  },
  'claude': {
    name: 'Claude',
    url: 'https://claude.ai/',
    directUrl: 'https://claude.ai/new?q=%s', // Direct URL with query parameter
    queryParam: 'q',
    selector: 'div[contenteditable="true"]',
    alternativeSelectors: [
      '.text-input__content-editor',
      'div[role="textbox"]'
    ]
  },
  'perplexity': {
    name: 'Perplexity AI',
    url: 'https://www.perplexity.ai/',
    directUrl: 'https://www.perplexity.ai/search?q=%s', // Direct URL with query parameter
    queryParam: 'q',
    selector: 'textarea.ProseMirror',
    alternativeSelectors: [
      'div.ProseMirror[contenteditable="true"]',
      'textarea[placeholder="Ask anything..."]'
    ]
  }
};

// Listen for omnibox (address bar) input
chrome.webNavigation = chrome.webNavigation || {};
chrome.webNavigation.onBeforeNavigate = chrome.webNavigation.onBeforeNavigate || { addListener: () => {} };

// Add listener for the webNavigation events to intercept address bar navigation
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Only process main frame navigations (the main webpage, not iframes or other embedded content)
  if (details.frameId === 0) {
    try {
      const url = new URL(details.url);
      
      // Check if this is a direct navigation to an @ command
      if (url.pathname === '/@' || url.pathname.startsWith('/@')) {
        // Extract the query - remove the leading /@ 
        const query = url.pathname.substring(2);
        if (query) {
          // Cancel this navigation by redirecting to about:blank
          chrome.tabs.update(details.tabId, { url: 'about:blank' });
          
          // Process the AI query
          handleAIQuery('@' + query);
          return;
        }
      }
      
      // Check for search engine queries containing @ commands
      if (url.hostname.includes('google.com') || 
          url.hostname.includes('bing.com') || 
          url.hostname.includes('yahoo.com') || 
          url.hostname.includes('duckduckgo.com')) {
        
        // Get search query from common search engines
        const searchParams = url.searchParams;
        const searchKeys = ['q', 'query', 'p', 'text'];
        
        for (const key of searchKeys) {
          if (searchParams.has(key)) {
            const query = searchParams.get(key);
            if (query && query.startsWith('@')) {
              // Cancel the search and handle our command
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
  // Only process if the URL is changing and it's not empty
  if (changeInfo.url) {
    try {
      const url = new URL(changeInfo.url);
      
      // Handle direct @ commands in address bar
      if (url.href.startsWith('http://@') || url.href.startsWith('https://@')) {
        // This is likely someone typing @something directly in the address bar
        const query = changeInfo.url.split('://')[1]; // Get everything after the protocol
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
 * Extracts the AI service and query from the user input
 * @param {string} input - User input text
 * @returns {Object|null} - Object containing service and query, or null if no match
 */
function extractServiceFromInput(input) {
  // Match pattern: @servicename query
  const match = input.match(/^@([a-zA-Z]+)\s+(.+)/);
  
  if (match) {
    const serviceName = match[1].toLowerCase();
    const query = match[2].trim();
    
    // Check if the service is supported
    if (AI_SERVICES[serviceName]) {
      return {
        service: AI_SERVICES[serviceName],
        serviceKey: serviceName,
        query: query
      };
    }
  }
  
  return null;
}

/**
 * Main handler for processing AI queries
 * @param {string} input - User input from address bar
 */
function handleAIQuery(input) {
  const extractedData = extractServiceFromInput(input);
  
  if (!extractedData) {
    // If it doesn't match our pattern, let the navigation continue
    return;
  }
  
  const { service, serviceKey, query } = extractedData;
  
  // Use direct URL with query parameter if available
  let url;
  if (service.directUrl) {
    // Replace %s placeholder with encoded query
    url = service.directUrl.replace('%s', encodeURIComponent(query));
  } else {
    // Fall back to constructing URL with query parameters
    url = service.url;
    if (service.queryParam) {
      // If the service accepts query parameters, add it to the URL
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}${service.queryParam}=${encodeURIComponent(query)}`;
    }
  }
  
  console.log('Opening URL:', url);
  
  // Check if there's already a tab open with this service
  chrome.tabs.query({}, (tabs) => {
    const existingTab = tabs.find(tab => tab.url && tab.url.startsWith(service.url));
    
    if (existingTab) {
      // Reuse the existing tab with the new URL
      chrome.tabs.update(existingTab.id, { 
        active: true,
        url: url
      });
    } else {
      // Create a new tab with our service URL
      chrome.tabs.create({ url: url });
    }
  });
}

// Add listener for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'queryPasted') {
    console.log('Query pasted successfully');
  }
});
