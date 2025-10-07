var db = require('../config/database');
var { deleteFilesFromDisk } = require('./fileHelper');

/**
 * Insert files into file_tb
 * @param {number} entityId - The ID of the entity (object or inventory)
 * @param {string} entityType - The type of entity ('object' or 'inventory')
 * @param {Array} files - Array of file objects from multer
 * @param {boolean} isPrimary - Whether this is the primary file (for inventory)
 * @returns {Promise<Array>} Array of inserted file records
 */
async function insertFiles(entityId, entityType, files, isPrimary = false) {
    if (!files || files.length === 0) return [];

    const fileRecords = files.map((file, index) => ({
        entity_id: entityId,
        entity_type: entityType,
        url: `/uploads/${file.filename}`,
        is_primary: isPrimary && index === 0 // First file is primary for inventory
    }));

    const insertPromises = fileRecords.map(record =>
        db.queryAsync(
            'INSERT INTO file_tb (entity_id, entity_type, url, is_primary) VALUES (?, ?, ?, ?)',
            [record.entity_id, record.entity_type, record.url, record.is_primary]
        )
    );

    const results = await Promise.all(insertPromises);
    return results.map((result, index) => ({
        id: result.results.insertId,
        ...fileRecords[index]
    }));
}

/**
 * Get files for an entity
 * @param {number} entityId - The ID of the entity
 * @param {string} entityType - The type of entity ('object' or 'inventory')
 * @returns {Promise<Array>} Array of file records
 */
async function getFiles(entityId, entityType) {
    const result = await db.queryAsync(
        'SELECT * FROM file_tb WHERE entity_id = ? AND entity_type = ? ORDER BY is_primary DESC, id ASC',
        [entityId, entityType]
    );
    return result.results;
}

/**
 * Get primary file for an entity (for inventory)
 * @param {number} entityId - The ID of the entity
 * @param {string} entityType - The type of entity ('object' or 'inventory')
 * @returns {Promise<Object|null>} Primary file record or null
 */
async function getPrimaryFile(entityId, entityType) {
    const result = await db.queryAsync(
        'SELECT * FROM file_tb WHERE entity_id = ? AND entity_type = ? AND is_primary = true LIMIT 1',
        [entityId, entityType]
    );
    return result.results.length > 0 ? result.results[0] : null;
}

/**
 * Delete files by IDs
 * @param {Array} fileIds - Array of file IDs to delete
 * @returns {Promise<number>} Number of deleted files
 */
async function deleteFiles(fileIds) {
  if (!fileIds || fileIds.length === 0) return 0;
  
  // First get the file URLs before deleting from database
  const placeholders = fileIds.map(() => '?').join(',');
  const filesResult = await db.queryAsync(
    `SELECT url FROM file_tb WHERE id IN (${placeholders})`,
    fileIds
  );
  
  // Delete files from disk
  const fileUrls = filesResult.results.map(file => file.url);
  await deleteFilesFromDisk(fileUrls);
  
  // Delete from database
  const result = await db.queryAsync(
    `DELETE FROM file_tb WHERE id IN (${placeholders})`,
    fileIds
  );
  return result.results.affectedRows;
}

/**
 * Delete files by URLs (for handling frontend deletions)
 * @param {Array} fileUrls - Array of file URLs to delete
 * @returns {Promise<number>} Number of deleted files
 */
async function deleteFilesByUrls(fileUrls) {
  if (!fileUrls || fileUrls.length === 0) return 0;
  
  // Delete files from disk first
  await deleteFilesFromDisk(fileUrls);
  
  // Delete from database
  const placeholders = fileUrls.map(() => '?').join(',');
  const result = await db.queryAsync(
    `DELETE FROM file_tb WHERE url IN (${placeholders})`,
    fileUrls
  );
  return result.results.affectedRows;
}

/**
 * Delete all files for an entity
 * @param {number} entityId - The ID of the entity
 * @param {string} entityType - The type of entity ('object' or 'inventory')
 * @returns {Promise<number>} Number of deleted files
 */
async function deleteEntityFiles(entityId, entityType) {
    // First get the file URLs before deleting from database
    const filesResult = await db.queryAsync(
        'SELECT url FROM file_tb WHERE entity_id = ? AND entity_type = ?',
        [entityId, entityType]
    );
    
    // Delete files from disk
    const fileUrls = filesResult.results.map(file => file.url);
    await deleteFilesFromDisk(fileUrls);
    
    // Delete from database
    const result = await db.queryAsync(
        'DELETE FROM file_tb WHERE entity_id = ? AND entity_type = ?',
        [entityId, entityType]
    );
    return result.results.affectedRows;
}

/**
 * Update primary file for an entity (for inventory)
 * @param {number} entityId - The ID of the entity
 * @param {string} entityType - The type of entity ('object' or 'inventory')
 * @param {string} newFileUrl - URL of the new primary file
 * @returns {Promise<Object>} Updated file record
 */
async function updatePrimaryFile(entityId, entityType, newFileUrl) {
    // First, get the old primary file URLs to delete them from disk
    const oldFilesResult = await db.queryAsync(
        'SELECT url FROM file_tb WHERE entity_id = ? AND entity_type = ? AND is_primary = true',
        [entityId, entityType]
    );
    
    // Delete old files from disk
    const oldFileUrls = oldFilesResult.results.map(file => file.url);
    await deleteFilesFromDisk(oldFileUrls);
    
    // Set all files for this entity to not primary
    await db.queryAsync(
        'UPDATE file_tb SET is_primary = false WHERE entity_id = ? AND entity_type = ?',
        [entityId, entityType]
    );

    // Then insert the new primary file
    const result = await db.queryAsync(
        'INSERT INTO file_tb (entity_id, entity_type, url, is_primary) VALUES (?, ?, ?, true)',
        [entityId, entityType, newFileUrl]
    );

    return {
        id: result.results.insertId,
        entity_id: entityId,
        entity_type: entityType,
        url: newFileUrl,
        is_primary: true
    };
}

/**
 * Add files to existing entity
 * @param {number} entityId - The ID of the entity
 * @param {string} entityType - The type of entity ('object' or 'inventory')
 * @param {Array} files - Array of file objects from multer
 * @returns {Promise<Array>} Array of inserted file records
 */
async function addFiles(entityId, entityType, files) {
    return await insertFiles(entityId, entityType, files, false);
}

/**
 * Delete all objects in a shelf and their files
 * @param {number} shelfId - The ID of the shelf
 * @param {number} userId - The ID of the user
 * @returns {Promise<number>} Number of objects deleted
 */
async function deleteShelfObjects(shelfId, userId) {
    // Get all objects in this shelf
    const objectsResult = await db.queryAsync('SELECT id FROM object_tb WHERE shelfId = ? AND userId = ?', [shelfId, userId]);
    
    // Delete all objects and their files
    for (const object of objectsResult.results) {
        await deleteEntityFiles(object.id, 'object');
        await db.queryAsync('DELETE FROM object_tb WHERE id = ?', [object.id]);
    }
    
    return objectsResult.results.length;
}

/**
 * Delete all shelves in an inventory, their objects, and files
 * @param {number} inventoryId - The ID of the inventory
 * @param {number} userId - The ID of the user
 * @returns {Promise<{shelvesDeleted: number, objectsDeleted: number}>} Deletion summary
 */
async function deleteInventoryShelves(inventoryId, userId) {
    // Get all shelves in this inventory
    const shelvesResult = await db.queryAsync('SELECT id FROM shelf_tb WHERE inventoryId = ? AND userId = ?', [inventoryId, userId]);
    
    let totalObjectsDeleted = 0;
    
    // Delete all objects in each shelf first
    for (const shelf of shelvesResult.results) {
        const objectsDeleted = await deleteShelfObjects(shelf.id, userId);
        totalObjectsDeleted += objectsDeleted;
    }
    
    // Delete all shelves
    await db.queryAsync('DELETE FROM shelf_tb WHERE inventoryId = ? AND userId = ?', [inventoryId, userId]);
    
    return {
        shelvesDeleted: shelvesResult.results.length,
        objectsDeleted: totalObjectsDeleted
    };
}

module.exports = {
  insertFiles,
  getFiles,
  getPrimaryFile,
  deleteFiles,
  deleteFilesByUrls,
  deleteEntityFiles,
  updatePrimaryFile,
  addFiles,
  deleteShelfObjects,
  deleteInventoryShelves
};
