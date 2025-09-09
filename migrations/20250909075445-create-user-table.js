'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.runSql(`
    CREATE TABLE user_tb (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      lastSeen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

exports.down = function(db) {
  return db.runSql(`DROP TABLE IF EXISTS user_tb`);
};

exports._meta = {
  "version": 1
};
