'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  return db.runSql(`
    CREATE TABLE IF NOT EXISTS file_tb (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_id INT,
      entity_type VARCHAR(255),
      url VARCHAR(255),
      is_primary BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);
};

exports.down = function (db) {
  return db.runSql('DROP TABLE IF EXISTS file_tb');
};

exports._meta = {
  "version": 1
};
