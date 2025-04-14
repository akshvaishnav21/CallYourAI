// This content script attempts to paste the query into the AI service's input field

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'pasteQuery') {
    // Store the query and selector in session storage in case page needs to reload
    sessionStorage.setItem('ai_portal_query', message.query);
    sessionStorage.setItem('ai_portal_selector', message.selector);
    
    if (message.alternativeSelectors) {
      sessionStorage.setItem('ai_portal_alt_selectors', JSON.stringify(message.alternativeSelectors));
    }
    
    console.log('Received query to paste:', message.query);
    
    // Try all possible selectors, starting with the main one
    const selectors = [message.selector];
    
    // Add alternative selectors if provided
    if (message.alternativeSelectors && Array.isArray(message.alternativeSelectors)) {
      selectors.push(...message.alternativeSelectors);
    }
    
    // Try each selector until one works
    tryEachSelector(message.query, selectors);
  }
});

/**
 * Try each selector in the array until one works
 * @param {string} query - The query to paste
 * @param {Array<string>} selectors - Array of CSS selectors to try
 */
function tryEachSelector(query, selectors) {
  if (!selectors || selectors.length === 0) {
    console.log('No selectors provided');
    return;
  }
  
  console.log('Trying selectors:', selectors);
  
  // Try the first selector
  const currentSelector = selectors[0];
  
  // Wait for the element with a timeout
  waitForElement(currentSelector, (element) => {
    // Found the element, paste the query
    console.log('Found element with selector:', currentSelector);
    pasteQueryIntoField(query, currentSelector);
  }, 5, 0, 500, () => {
    // Timeout callback - try the next selector
    console.log('Selector not found:', currentSelector);
    if (selectors.length > 1) {
      console.log('Trying next selector...');
      tryEachSelector(query, selectors.slice(1));
    } else {
      console.log('No more selectors to try');
      // Try site-specific handling as a last resort
      detectAndHandleSiteSpecifics();
    }
  });
}

/**
 * Determines which AI service we're on and applies site-specific handling
 */
function detectAndHandleSiteSpecifics() {
  const hostname = window.location.hostname;
  
  // Check for stored query from previous navigation
  const storedQuery = sessionStorage.getItem('ai_portal_query');
  const storedSelector = sessionStorage.getItem('ai_portal_selector');
  
  if (!storedQuery || !storedSelector) {
    return; // No stored query to process
  }
  
  console.log('Found stored query:', storedQuery);
  
  // Site-specific handling for different AI services
  if (hostname.includes('chat.openai.com')) {
    handleChatGPT(storedQuery, storedSelector);
  } 
  else if (hostname.includes('gemini.google.com')) {
    handleGemini(storedQuery, storedSelector);
  }
  else if (hostname.includes('bing.com')) {
    handleBingChat(storedQuery, storedSelector);
  }
  else if (hostname.includes('claude.ai')) {
    handleClaude(storedQuery, storedSelector);
  }
  else if (hostname.includes('perplexity.ai')) {
    handlePerplexity(storedQuery, storedSelector);
  }
  else {
    // Default handling for unknown sites
    pasteQueryIntoField(storedQuery, storedSelector);
  }
  
  // Clear the stored query after processing
  // sessionStorage.removeItem('ai_portal_query');
  // sessionStorage.removeItem('ai_portal_selector');
}

/**
 * Handle ChatGPT-specific behavior
 */
function handleChatGPT(query, selector) {
  // Wait for the "New chat" button to be visible indicating the UI is loaded
  waitForElement('nav a, .text-token-text-primary button', (element) => {
    // If we found a "New chat" button or we're on the conversation page
    console.log('ChatGPT page detected as ready');
    
    // Try to find the input field
    waitForElement(selector, (inputElement) => {
      console.log('Found ChatGPT input field');
      
      // Wait for any loading to complete
      setTimeout(() => {
        // Paste the query
        const result = setInputFieldValue(inputElement, query);
        
        if (result) {
          // Try to send the message by pressing Enter
          try {
            // ChatGPT sometimes has a send button we can click
            const sendButton = document.querySelector('button[data-testid="send-button"]');
            if (sendButton) {
              sendButton.click();
            } else {
              // Fall back to Enter key
              simulatePressEnter(inputElement);
            }
          } catch (e) {
            console.log('Could not auto-submit:', e);
          }
        }
      }, 500);
    }, 20);
  }, 20);
}

/**
 * Handle Google Gemini-specific behavior
 */
function handleGemini(query, selector) {
  // For Gemini, wait for the input field and then paste
  waitForElement(selector, (inputElement) => {
    console.log('Found Gemini input field');
    
    // Paste the query
    const result = setInputFieldValue(inputElement, query);
    
    if (result) {
      // For Gemini, try clicking the send button
      const sendButtons = document.querySelectorAll('button');
      let sendButton = null;
      
      // Look for a button with a send icon or text
      for (const button of sendButtons) {
        if (button.innerText === 'Send' || 
            button.getAttribute('aria-label') === 'Send message' ||
            button.querySelector('svg[aria-label="Send"]')) {
          sendButton = button;
          break;
        }
      }
      
      if (sendButton) {
        sendButton.click();
      } else {
        // Fall back to Enter key
        simulatePressEnter(inputElement);
      }
    }
  }, 20);
}

/**
 * Handle Bing Chat-specific behavior
 */
function handleBingChat(query, selector) {
  // Similar pattern for Bing Chat
  waitForElement(selector, (inputElement) => {
    console.log('Found Bing Chat input field');
    
    // For Bing, wait a bit longer for the page to be fully interactive
    setTimeout(() => {
      const result = setInputFieldValue(inputElement, query);
      
      if (result) {
        // Try to find and click the send button
        const sendButton = document.querySelector('button[aria-label="Submit"]');
        if (sendButton) {
          sendButton.click();
        } else {
          simulatePressEnter(inputElement);
        }
      }
    }, 1000);
  }, 20);
}

/**
 * Handle Claude-specific behavior
 */
function handleClaude(query, selector) {
  // Wait for Claude's chat interface to load
  waitForElement(selector, (inputElement) => {
    console.log('Found Claude input field');
    
    // Claude uses a contenteditable div
    if (inputElement.getAttribute('contenteditable') === 'true') {
      // Set the text with HTML
      inputElement.innerHTML = query;
      
      // Trigger events to make Claude recognize the input
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Claude's send button
      setTimeout(() => {
        // Try to find the send button
        const sendButton = document.querySelector('button[aria-label="Send message"]');
        if (sendButton) {
          sendButton.click();
        } else {
          simulatePressEnter(inputElement);
        }
      }, 500);
    }
  }, 20);
}

/**
 * Handle Perplexity-specific behavior
 */
function handlePerplexity(query, selector) {
  // Perplexity might have the query already in the URL, but we'll handle it anyway
  waitForElement(selector, (inputElement) => {
    console.log('Found Perplexity input field');
    
    // Perplexity uses ProseMirror
    const result = setInputFieldValue(inputElement, query);
    
    if (result) {
      // Try to find and click the search button
      setTimeout(() => {
        const searchButton = document.querySelector('button[type="submit"]');
        if (searchButton) {
          searchButton.click();
        } else {
          simulatePressEnter(inputElement);
        }
      }, 500);
    }
  }, 20);
}

/**
 * Attempts to paste the query into the appropriate input field
 * @param {string} query - The query to paste
 * @param {string} selector - CSS selector for the input field
 */
function pasteQueryIntoField(query, selector) {
  console.log('Attempting to paste query:', query);
  
  // Try immediately for already loaded pages
  if (document.readyState === 'complete') {
    tryPasteQuery(query, selector, 0);
  } else {
    // Wait for the page to fully load and then try
    window.addEventListener('load', () => {
      tryPasteQuery(query, selector, 0);
    });
  }
}

/**
 * Recursively tries to find an element on the page, with multiple attempts
 * @param {string} selector - CSS selector for the element
 * @param {function} callback - Function to call when element is found
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} attempt - Current attempt number
 * @param {number} delay - Delay between attempts in ms
 * @param {function} timeoutCallback - Optional function to call when max attempts reached
 */
function waitForElement(selector, callback, maxAttempts = 10, attempt = 0, delay = 1000, timeoutCallback = null) {
  const element = document.querySelector(selector);
  
  if (element) {
    callback(element);
    return true;
  } else if (attempt < maxAttempts) {
    setTimeout(() => {
      waitForElement(selector, callback, maxAttempts, attempt + 1, delay, timeoutCallback);
    }, delay);
    return false;
  } else {
    console.log('Element not found after maximum attempts:', selector);
    if (timeoutCallback && typeof timeoutCallback === 'function') {
      timeoutCallback();
    }
    return false;
  }
}

/**
 * Sets the value of an input field based on its type
 * @param {Element} element - The input element
 * @param {string} value - The value to set
 * @returns {boolean} - Whether setting the value was successful
 */
function setInputFieldValue(element, value) {
  try {
    // Focus the element
    element.focus();
    
    // For contenteditable elements
    if (element.getAttribute('contenteditable') === 'true') {
      element.innerHTML = value;
      
      // Create and dispatch an input event
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
    } 
    // For textarea/input elements
    else {
      element.value = value;
      
      // Create and dispatch input event to trigger any listeners
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
      
      // Dispatch a change event
      const changeEvent = new Event('change', { bubbles: true });
      element.dispatchEvent(changeEvent);
    }
    
    // Alert the background script that we succeeded
    chrome.runtime.sendMessage({ action: 'queryPasted' });
    return true;
  } catch (error) {
    console.error('Error setting input value:', error);
    return false;
  }
}

/**
 * Simulates pressing the Enter key on an element
 * @param {Element} element - The element to press Enter on
 */
function simulatePressEnter(element) {
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true
  });
  
  element.dispatchEvent(enterEvent);
}

/**
 * Recursive function to try pasting the query with retries
 * @param {string} query - The query to paste
 * @param {string} selector - CSS selector for the input field
 * @param {number} attempts - Number of attempts made so far
 */
function tryPasteQuery(query, selector, attempts) {
  if (attempts >= 10) {
    console.log('Failed to paste query after multiple attempts');
    return;
  }

  const inputElement = document.querySelector(selector);
  
  if (!inputElement) {
    // Element not found yet, retry after a delay
    setTimeout(() => {
      tryPasteQuery(query, selector, attempts + 1);
    }, 1000);
    return;
  }

  try {
    // Focus the element
    inputElement.focus();
    
    // For contenteditable elements
    if (inputElement.getAttribute('contenteditable') === 'true') {
      inputElement.innerHTML = query;
      
      // Create and dispatch an input event
      const inputEvent = new Event('input', { bubbles: true });
      inputElement.dispatchEvent(inputEvent);
    } 
    // For textarea/input elements
    else {
      inputElement.value = query;
      
      // Create and dispatch input event to trigger any listeners
      const inputEvent = new Event('input', { bubbles: true });
      inputElement.dispatchEvent(inputEvent);
      
      // Dispatch a change event
      const changeEvent = new Event('change', { bubbles: true });
      inputElement.dispatchEvent(changeEvent);
    }
    
    // Attempt to press Enter to submit immediately
    simulatePressEnter(inputElement);
    
    // Alert the background script that we succeeded
    chrome.runtime.sendMessage({ action: 'queryPasted' });
    
  } catch (error) {
    console.error('Error pasting query:', error);
    
    // Retry after a delay
    setTimeout(() => {
      tryPasteQuery(query, selector, attempts + 1);
    }, 1000);
  }
}

// Initialize our script when the page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('AI Portal content script loaded and ready');
  
  // Check if we have a stored query to process
  detectAndHandleSiteSpecifics();
});

// Also run on complete in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  detectAndHandleSiteSpecifics();
}
