/**
 * Async handler middleware to avoid try-catch blocks in route handlers
 * This middleware wraps async route handlers to automatically catch errors
 * and pass them to the Express error handler
 */
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
