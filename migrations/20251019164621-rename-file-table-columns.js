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
    ALTER TABLE file_tb 
    CHANGE COLUMN entity_id entityId INT,
    CHANGE COLUMN entity_type entityType VARCHAR(255),
    CHANGE COLUMN is_primary isPrimary BOOLEAN DEFAULT FALSE,
    CHANGE COLUMN created_at createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHANGE COLUMN updated_at updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  `);
};

exports.down = function(db) {
  return db.runSql(`
    ALTER TABLE file_tb 
    CHANGE COLUMN entityId entity_id INT,
    CHANGE COLUMN entityType entity_type VARCHAR(255),
    CHANGE COLUMN isPrimary is_primary BOOLEAN DEFAULT FALSE,
    CHANGE COLUMN createdAt created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHANGE COLUMN updatedAt updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  `);
};

exports._meta = {
  "version": 1
};

