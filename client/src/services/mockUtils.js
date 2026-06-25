/**
 * Utility functions for mocking API responses
 */

/**
 * Creates a mock successful response with the provided data
 * @param {Object} data - The data to include in the response
 * @param {number} delay - Optional delay in milliseconds to simulate network latency
 * @returns {Promise} Promise that resolves with the mock response
 */
export const mockResponse = async (data, delay = 300) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 200,
        statusText: 'OK',
        ...data
      });
    }, delay);
  });
};

/**
 * Creates a mock error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {number} delay - Optional delay in milliseconds to simulate network latency
 * @returns {Promise} Promise that rejects with the mock error
 */
export const mockError = async (message = 'An error occurred', status = 500, delay = 300) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject({
        response: {
          status,
          data: { message }
        }
      });
    }, delay);
  });
};

/**
 * Simulates a random failure based on the provided probability
 * @param {Function} successFn - Function to call on success
 * @param {Function} errorFn - Function to call on error
 * @param {number} errorProbability - Probability of error (0-1)
 * @returns {Promise} Promise that resolves with success or rejects with error
 */
export const simulateRandomFailure = async (successFn, errorFn, errorProbability = 0.1) => {
  if (Math.random() < errorProbability) {
    return errorFn();
  }
  return successFn();
};
