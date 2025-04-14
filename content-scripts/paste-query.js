// This content script attempts to paste the query into the AI service's input field

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'pasteQuery') {
    pasteQueryIntoField(message.query, message.selector);
  }
});

/**
 * Attempts to paste the query into the appropriate input field
 * @param {string} query - The query to paste
 * @param {string} selector - CSS selector for the input field
 */
function pasteQueryIntoField(query, selector) {
  // Wait for the page to fully load and the input element to be available
  setTimeout(() => {
    tryPasteQuery(query, selector, 0);
  }, 1000);
}

/**
 * Recursive function to try pasting the query with retries
 * @param {string} query - The query to paste
 * @param {string} selector - CSS selector for the input field
 * @param {number} attempts - Number of attempts made so far
 */
function tryPasteQuery(query, selector, attempts) {
  if (attempts >= 5) {
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
    
    // Alert the background script that we succeeded
    chrome.runtime.sendMessage({ action: 'queryPasted' });
    
    // Display a notification to the user that they can press Enter to submit
    const notification = document.createElement('div');
    notification.textContent = 'Query pasted! Press Enter to submit.';
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px 20px';
    notification.style.background = 'rgba(0, 0, 0, 0.7)';
    notification.style.color = 'white';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    notification.style.fontSize = '14px';
    
    document.body.appendChild(notification);
    
    // Remove the notification after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
    
  } catch (error) {
    console.error('Error pasting query:', error);
    
    // Retry after a delay
    setTimeout(() => {
      tryPasteQuery(query, selector, attempts + 1);
    }, 1000);
  }
}

// Since this content script loads when the page loads, check if there's
// a query in the clipboard that needs to be pasted immediately
document.addEventListener('DOMContentLoaded', () => {
  // The actual pasting will be triggered by the background script
  console.log('AI Portal content script loaded and ready to paste queries');
});
