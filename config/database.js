const mysql = require('mysql2');
const util = require('util');

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

if(process.env.LOG_MYSQL_QUERIES && (process.env.LOG_MYSQL_QUERIES == "true" || process.env.LOG_MYSQL_QUERIES == "1")) {
  const originalQuery = pool.query;
  console.log( pool.query)
  pool.query = function (...args) {
    const query = mysql.format(args[0], args[1]);
    console.log('\x1b[33mExecuting query: %s\x1b[0m', query);

    const start = Date.now();
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      args[args.length - 1] = function (...callbackArgs) {
        const duration = Date.now() - start;
        console.log('\x1b[33m%s\x1b[0m', `Executed in ${duration}ms`);
        console.log('-------------------------------------------------------')
        callback.apply(this, callbackArgs);
      };
    }

    return originalQuery.apply(pool, args);
  };
}

pool.queryAsync = util.promisify(pool.query);

module.exports = pool;
