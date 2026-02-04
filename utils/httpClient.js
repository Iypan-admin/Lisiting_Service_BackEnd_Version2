/**
 * Utility for safe network requests with retry logic.
 * Handles intermittent connectivity issues and "fetch failed" errors.
 */

/**
 * Executes a function that returns a Promise with retry logic.
 * Useful for wrapping Supabase queries or raw fetch calls.
 * 
 * @param {Function} asyncFn - The function to retry (must return a promise)
 * @param {number} retries - Number of retry attempts (default: 3)
 * @param {number} delay - Delay between retries in ms (default: 2000)
 * @param {string} label - Context label for logging
 */
const withRetry = async (asyncFn, retries = 3, delay = 2000, label = 'Request') => {
  let lastError = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const result = await asyncFn();
      
      // If result has a Supabase error, we might want to retry that too
      if (result && result.error && result.error.message && result.error.message.includes('fetch failed')) {
        throw new Error(result.error.message);
      }
      
      return result;
    } catch (err) {
      lastError = err;
      const isFetchError = err.message.includes('fetch failed') || 
                           err.message.includes('ECONNRESET') || 
                           err.message.includes('ETIMEDOUT');
      
      console.warn(`⚠️ [${label}] Attempt ${i + 1} failed: ${err.message}`);
      
      if (i < retries - 1 && isFetchError) {
        console.log(`🔄 Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Exponential backoff could be added here: delay = delay * 2;
      } else {
        break;
      }
    }
  }
  
  console.error(`🚨 [${label}] All ${retries} attempts failed.`);
  throw lastError;
};

/**
 * Standard fetch with retry
 */
const fetchWithRetry = async (url, options = {}, retries = 3, delay = 2000) => {
  return withRetry(
    async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
    retries,
    delay,
    `Fetch: ${url}`
  );
};

module.exports = {
  withRetry,
  fetchWithRetry
};
