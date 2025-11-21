const { isConnected } = require("./connect");

/**
 * Safely executes a database operation with connection check
 * @param {Function} operation - Async function to execute
 * @param {*} fallbackValue - Value to return if DB is unavailable
 * @returns {Promise<*>}
 */
async function safeDbOperation(operation, fallbackValue = null) {
  if (!isConnected()) {
    console.warn("⚠️  Database operation skipped - MongoDB not connected");
    return fallbackValue;
  }

  try {
    return await operation();
  } catch (error) {
    if (
      error.name === "MongoNetworkError" ||
      error.name === "MongoServerSelectionError"
    ) {
      console.error(
        "⚠️  Database operation failed - Network error:",
        error.message
      );
      return fallbackValue;
    }
    // Re-throw non-network errors
    throw error;
  }
}

/**
 * Checks if database is ready for operations
 * @returns {boolean}
 */
function isDatabaseReady() {
  return isConnected();
}

module.exports = {
  safeDbOperation,
  isDatabaseReady,
  isConnected,
};
