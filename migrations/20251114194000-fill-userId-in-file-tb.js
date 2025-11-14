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
    UPDATE file_tb SET userId = (SELECT userId FROM object_tb WHERE object_tb.id = file_tb.entityId AND file_tb.entityType = 'object');
  `);
};

exports.down = function(db) {
  return db.runSql(`
    UPDATE file_tb SET userId = null;
  `);
};

exports._meta = {
  "version": 1
};

