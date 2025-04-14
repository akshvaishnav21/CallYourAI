/**
 * Helper functions for interacting with the Perplexity API
 */

/**
 * Makes a request to the Perplexity API
 * @param {string} query - The user's query
 * @param {Function} callback - Function to call with the response
 */
async function queryPerplexityAPI(query, callback) {
  try {
    // Check if we have the API key
    const apiKey = await chrome.storage.local.get('perplexityApiKey');
    
    if (!apiKey.perplexityApiKey) {
      callback({
        error: true,
        message: "Perplexity API key not found. Please set it in the extension options."
      });
      return;
    }
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "Be precise and concise."
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.2,
        max_tokens: 300,
        top_p: 0.9,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: "month",
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      callback({
        error: true,
        message: `API Error: ${errorData.error?.message || response.statusText}`
      });
      return;
    }
    
    const data = await response.json();
    callback({
      error: false,
      result: data.choices[0].message.content,
      citations: data.citations || []
    });
    
  } catch (error) {
    console.error("Error querying Perplexity API:", error);
    callback({
      error: true,
      message: `Error: ${error.message}`
    });
  }
}

// Export the function
export { queryPerplexityAPI };