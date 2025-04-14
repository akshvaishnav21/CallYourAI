// Dictionary of supported AI services with their details
const AI_SERVICES = {
  'chatgpt': {
    name: 'ChatGPT',
    url: 'https://chat.openai.com/',
    queryParam: null, // ChatGPT does not support direct query parameters
    selector: 'textarea[data-id="root"]', // The input field selector
    needsClipboard: true
  },
  'gemini': {
    name: 'Google Gemini',
    url: 'https://gemini.google.com/',
    queryParam: null, // Gemini doesn't support direct query parameters
    selector: 'input[aria-label="Ask Gemini"]', // Selector for the input field
    needsClipboard: true
  },
  'bard': {
    name: 'Google Gemini', // Bard is now Gemini
    url: 'https://gemini.google.com/',
    queryParam: null,
    selector: 'input[aria-label="Ask Gemini"]',
    needsClipboard: true
  },
  'bingchat': {
    name: 'Bing Chat',
    url: 'https://www.bing.com/chat',
    queryParam: null, // Bing Chat doesn't support direct query parameters
    selector: 'textarea#searchbox',
    needsClipboard: true
  },
  'claude': {
    name: 'Claude',
    url: 'https://claude.ai/',
    queryParam: null, // Claude doesn't support direct query parameters
    selector: 'div[contenteditable="true"]',
    needsClipboard: true
  },
  'perplexity': {
    name: 'Perplexity AI',
    url: 'https://www.perplexity.ai/',
    queryParam: 'q', // Perplexity supports direct query via URL
    selector: 'textarea.ProseMirror',
    needsClipboard: true
  }
};

// Initialize the omnibox suggestion
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: 'Type @service followed by your query (e.g., @chatgpt What is machine learning?)'
  });
});

// When the user types in the omnibox
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const suggestions = [];
  
  // If the input starts with @ but doesn't match a known service yet
  if (text.startsWith('@') && !extractServiceFromInput(text)) {
    // Generate suggestions for available services
    for (const [key, service] of Object.entries(AI_SERVICES)) {
      suggestions.push({
        content: `@${key} `,
        description: `Use ${service.name}: <match>@${key}</match> [your query]`
      });
    }
    suggest(suggestions);
  }
});

// When the user selects something from the omnibox
chrome.omnibox.onInputEntered.addListener((text) => {
  handleAIQuery(text);
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
 * @param {string} input - User input from omnibox
 */
function handleAIQuery(input) {
  const extractedData = extractServiceFromInput(input);
  
  if (!extractedData) {
    // If the input doesn't match our pattern, just search for it using the default search engine
    chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(input)}` });
    return;
  }
  
  const { service, serviceKey, query } = extractedData;
  
  // Construct the URL based on whether the service supports query parameters
  let url = service.url;
  if (service.queryParam) {
    // If the service accepts query parameters, add it to the URL
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}${service.queryParam}=${encodeURIComponent(query)}`;
  }
  
  // Check if there's already a tab open with this service
  chrome.tabs.query({}, (tabs) => {
    const existingTab = tabs.find(tab => tab.url && tab.url.startsWith(service.url));
    
    if (existingTab) {
      // Reuse the existing tab
      chrome.tabs.update(existingTab.id, { active: true });
      
      // If clipboard is needed to paste the query (most AI services need this)
      if (service.needsClipboard) {
        // Write the query to clipboard
        navigator.clipboard.writeText(query).then(() => {
          // Execute content script to assist with pasting
          chrome.tabs.sendMessage(existingTab.id, { 
            action: 'pasteQuery', 
            query: query,
            selector: service.selector
          });
        });
      }
    } else {
      // Create a new tab
      chrome.tabs.create({ url: url }, (tab) => {
        // If the service needs clipboard support to paste the query
        if (service.needsClipboard) {
          // Write the query to clipboard
          navigator.clipboard.writeText(query);
          
          // We'll need to wait for the page to load before we can inject our content script
          // The content script will handle pasting the query into the input field
        }
      });
    }
  });
}

// Add listener for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'queryPasted') {
    console.log('Query pasted successfully');
  }
});
