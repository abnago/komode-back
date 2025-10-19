const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Create a promise-based wrapper for the pool
const db = {
  // Execute a query and return a promise
  queryAsync: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      try {
        pool.execute(sql, params, (err, results, fields) => {
          if (err) {
            console.error(67174, err);
            reject(err);
          } else {
            resolve(results);
          }
        });
      } catch (error) {
        console.error(67175, error);
        reject(error);
      }
    });
  },

  // Get a connection from the pool
  getConnection: () => {
    return new Promise((resolve, reject) => {
      try {
        pool.getConnection((err, connection) => {
          if (err) {
            console.error(67176, err);
            reject(err);
          } else {
            resolve(connection);
          }
        });
      } catch (error) {
        console.error(67177, error);
        reject(error);
      }
    });
  },

  // Close the connection pool
  close: () => {
    return new Promise((resolve) => {
      try {
        pool.end(() => {
          resolve();
        });
      } catch (error) {
        console.error(67178, error);
        resolve(); // Still resolve to prevent hanging
      }
    });
  },

  // Get pool statistics
  getPoolStats: () => {
    try {
      return {
        totalConnections: pool._allConnections.length,
        freeConnections: pool._freeConnections.length,
        acquiringConnections: pool._acquiringConnections.length
      };
    } catch (error) {
      console.error(67179, error);
      return {
        totalConnections: 0,
        freeConnections: 0,
        acquiringConnections: 0
      };
    }
  }
};

module.exports = db;
