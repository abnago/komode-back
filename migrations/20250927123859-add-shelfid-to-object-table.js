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
    ADD COLUMN shelfId INT NULL,
    ADD FOREIGN KEY (shelfId) REFERENCES shelf_tb(id) ON DELETE SET NULL
  `);
};

exports.down = function(db) {
  return db.runSql(`
    ALTER TABLE object_tb 
    DROP FOREIGN KEY object_tb_ibfk_3,
    DROP COLUMN shelfId
  `);
};

exports._meta = {
  "version": 1
};