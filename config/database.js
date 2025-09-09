const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'komode',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Create a promise-based wrapper for the pool
const db = {
  // Execute a query and return a promise
  queryAsync: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      pool.execute(sql, params, (err, results, fields) => {
        if (err) {
          reject(err);
        } else {
          resolve({ results, fields });
        }
      });
    });
  },

  // Get a connection from the pool
  getConnection: () => {
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });
  },

  // Close the connection pool
  close: () => {
    return new Promise((resolve) => {
      pool.end(() => {
        resolve();
      });
    });
  },

  // Get pool statistics
  getPoolStats: () => {
    return {
      totalConnections: pool._allConnections.length,
      freeConnections: pool._freeConnections.length,
      acquiringConnections: pool._acquiringConnections.length
    };
  }
};

module.exports = db;
