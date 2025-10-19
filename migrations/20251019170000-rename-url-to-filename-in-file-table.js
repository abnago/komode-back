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
    -- First, update existing data to remove /uploads/ prefix
    UPDATE file_tb 
    SET url = CASE 
      WHEN url LIKE '/uploads/%' THEN SUBSTRING(url, 10)
      WHEN url LIKE 'uploads/%' THEN SUBSTRING(url, 9)
      ELSE url 
    END;
    
    -- Then rename the column from url to filename
    ALTER TABLE file_tb 
    CHANGE COLUMN url filename VARCHAR(255);
  `);
};

exports.down = function(db) {
  return db.runSql(`
    -- Rename the column back from filename to url
    ALTER TABLE file_tb 
    CHANGE COLUMN filename url VARCHAR(255);
    
    -- Add back the /uploads/ prefix
    UPDATE file_tb 
    SET url = CONCAT('/uploads/', url);
  `);
};

exports._meta = {
  "version": 1
};

