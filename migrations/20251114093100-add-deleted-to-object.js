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
    ALTER TABLE object_tb 
    ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN deleted_at TIMESTAMP NULL
  `);
};

exports.down = function(db) {
  return db.runSql(`
    ALTER TABLE object_tb 
    DROP COLUMN deleted,
    DROP COLUMN deleted_at
  `);
};

exports._meta = {
  "version": 1
};

