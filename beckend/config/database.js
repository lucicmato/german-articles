const mongoose = require('mongoose');

let connection = null;

/**
 * On Vercel the module lives as long as the function instance, so the connection is shared across
 * requests. A failed attempt drops the cached promise — otherwise one bad cold start would poison the
 * instance until Vercel recycles it, instead of the next request simply retrying.
 */
exports.connect = () => {
  if (!process.env.MONGO_URL) {
    return Promise.reject(new Error('MONGO_URL is not set'));
  }

  if (!connection) {
    connection = mongoose
      .connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 5000 })
      .then((instance) => {
        console.log('Database connected');
        return instance;
      })
      .catch((error) => {
        connection = null;
        console.error('Database connection failed:', error.message);
        throw error;
      });
  }

  return connection;
};
