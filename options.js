// Saves options to chrome.storage
function saveOptions() {
  const perplexityApiKey = document.getElementById('perplexityApiKey').value;
  
  chrome.storage.local.set({
    perplexityApiKey: perplexityApiKey
  }, () => {
    // Update status to let user know options were saved
    const status = document.getElementById('status');
    status.textContent = 'Options saved successfully!';
    status.className = 'status success';
    status.style.display = 'block';
    
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  });
}

// Restores options state from chrome.storage
function restoreOptions() {
  chrome.storage.local.get({
    perplexityApiKey: '' // default value
  }, (items) => {
    document.getElementById('perplexityApiKey').value = items.perplexityApiKey;
  });
}

// Toggle password visibility
function togglePasswordVisibility(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = 'Hide';
  } else {
    input.type = 'password';
    button.textContent = 'Show';
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveButton').addEventListener('click', saveOptions);
document.getElementById('togglePerplexityKey').addEventListener('click', () => {
  togglePasswordVisibility('perplexityApiKey', 'togglePerplexityKey');
});