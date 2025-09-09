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
    ALTER TABLE user_tb 
    ADD COLUMN name VARCHAR(255) AFTER email,
    ADD COLUMN googleId VARCHAR(255) UNIQUE AFTER name
  `);
};

exports.down = function(db) {
  return db.runSql(`
    ALTER TABLE user_tb 
    DROP COLUMN name,
    DROP COLUMN googleId
  `);
};

exports._meta = {
  "version": 1
};
