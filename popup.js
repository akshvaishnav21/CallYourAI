// No perplexity API integration

// AI services configuration (should match the ones in background.js)
const AI_SERVICES = {
  'chatgpt': {
    name: 'ChatGPT',
    url: 'https://chat.openai.com/',
    directUrl: 'https://chatgpt.com/?q=%s',
    queryParam: 'q',
    description: 'Ask ChatGPT',
    icon: '🤖'
  },
  'gemini': {
    name: 'Google Gemini',
    url: 'https://gemini.google.com/',
    directUrl: 'https://gemini.google.com/?text=%s',
    queryParam: 'text',
    description: 'Ask Gemini',
    icon: '🔮'
  },
  'copilot': {
    name: 'Microsoft Copilot',
    url: 'https://copilot.microsoft.com/',
    directUrl: 'https://copilot.microsoft.com/?q=%s',
    queryParam: 'q',
    description: 'Ask Microsoft Copilot',
    icon: '🔍'
  },
  'claude': {
    name: 'Claude',
    url: 'https://claude.ai/',
    directUrl: 'https://claude.ai/new?q=%s',
    queryParam: 'q',
    description: 'Ask Claude',
    icon: '🧠'
  },
  'perplexity': {
    name: 'Perplexity AI',
    url: 'https://www.perplexity.ai/',
    directUrl: 'https://www.perplexity.ai/search?q=%s',
    queryParam: 'q',
    description: 'Search with Perplexity AI',
    icon: '🔎'
  }
};

// Default service when opening popup
let currentService = 'perplexity';

// DOM elements
const queryInput = document.getElementById('query');
const submitButton = document.getElementById('submitButton');
const resultsDiv = document.getElementById('results');
const serviceNameSpan = document.getElementById('serviceName');
const resultContentDiv = document.getElementById('resultContent');
const citationsDiv = document.getElementById('citations');
// No options page

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Setup event listeners for service selection
  document.querySelectorAll('.service').forEach(serviceEl => {
    serviceEl.addEventListener('click', () => {
      currentService = serviceEl.dataset.service;
      document.querySelectorAll('.service').forEach(el => {
        el.style.fontWeight = el === serviceEl ? 'bold' : 'normal';
      });
      serviceEl.style.fontWeight = 'bold';
      
      // Update input placeholder
      queryInput.placeholder = `Ask ${AI_SERVICES[currentService].name}...`;
    });
  });
  
  // Highlight default service
  document.querySelector(`.service[data-service="${currentService}"]`).style.fontWeight = 'bold';
  
  // Setup submit button
  document.getElementById('submitQuery').addEventListener('click', handleSubmit);
  
  // Allow submitting with Enter key
  queryInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  });
  
  // No options page functionality
  
  // Focus the input field
  queryInput.focus();
});

// Handle query submission
function handleSubmit() {
  const query = queryInput.value.trim();
  
  if (!query) {
    return; // Empty query
  }
  
  const service = AI_SERVICES[currentService];
  
  // Always open the service webpage
  openServicePage(query);
}

// Check for API key for Perplexity
async function checkApiKeyAndQuery(query) {
  const apiKey = await chrome.storage.local.get('perplexityApiKey');
  
  if (apiKey.perplexityApiKey) {
    // Show loading state
    resultsDiv.style.display = 'block';
    resultsDiv.classList.add('loading');
    serviceNameSpan.textContent = AI_SERVICES[currentService].name;
    resultContentDiv.innerHTML = 'Loading...';
    citationsDiv.innerHTML = '';
    
    // Query Perplexity API
    queryPerplexityAPI(query, handleApiResponse);
  } else {
    // No API key - show error message
    resultsDiv.style.display = 'block';
    serviceNameSpan.textContent = AI_SERVICES[currentService].name;
    resultContentDiv.innerHTML = `
      <div class="error">
        <p>Perplexity API key not found. You have two options:</p>
        <p>1. <a href="#" id="openOptions">Add your API key</a> to enable direct responses here</p>
        <p>2. <a href="#" id="openPerplexity">Open Perplexity website</a> instead</p>
      </div>
    `;
    
    // Setup links
    document.getElementById('openOptions').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    
    document.getElementById('openPerplexity').addEventListener('click', (e) => {
      e.preventDefault();
      openServicePage(query);
    });
  }
}

// Handle API response
function handleApiResponse(response) {
  resultsDiv.classList.remove('loading');
  
  if (response.error) {
    resultContentDiv.innerHTML = `<div class="error">${response.message}</div>`;
    return;
  }
  
  // Display result
  resultContentDiv.textContent = response.result;
  
  // Display citations if available
  if (response.citations && response.citations.length > 0) {
    citationsDiv.innerHTML = '<h4>Sources:</h4>';
    
    response.citations.forEach(citation => {
      const link = document.createElement('a');
      link.href = citation;
      link.textContent = citation;
      link.target = '_blank';
      citationsDiv.appendChild(link);
    });
  } else {
    citationsDiv.innerHTML = '';
  }
}

// Open the service website
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