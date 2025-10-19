var db = require('../config/database');
var fs = require('fs');
var path = require('path');

/**
 * Delete a file from the uploads folder
 * @param {string} filename - The filename (e.g., "filename.jpg")
 * @returns {Promise<boolean>} True if file was deleted, false if file didn't exist or couldn't be deleted
 */
async function deleteFileFromDisk(filename) {
  try {
    // Security check: ensure the filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.error(`Invalid filename: ${filename}`);
      return false;
    }
    
    // Build absolute path to the file in uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const absolutePath = path.join(uploadsDir, filename);
    
    // Additional security check: ensure the resolved path is within uploads directory
    const resolvedPath = path.resolve(absolutePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      console.error(`File path outside uploads directory: ${filename}`);
      return false;
    }
    
    // Check if file exists
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log(`Deleted file: ${absolutePath}`);
      return true;
    } else {
      console.log(`File not found: ${absolutePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error deleting file ${filename}:`, error);
    return false;
  }
}

/**
 * Delete multiple files from the uploads folder
 * @param {Array} filenames - Array of filenames
 * @returns {Promise<number>} Number of files successfully deleted
 */
async function deleteFilesFromDisk(filenames) {
  if (!filenames || filenames.length === 0) return 0;
  
  const deletePromises = filenames.map(filename => deleteFileFromDisk(filename));
  const results = await Promise.all(deletePromises);
  return results.filter(result => result === true).length;
}

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
        entityId: entityId,
        entityType: entityType,
        filename: file.filename,
        isPrimary: isPrimary && index === 0 // First file is primary for inventory
    }));

    const insertPromises = fileRecords.map(record =>
        db.queryAsync(
            'INSERT INTO file_tb (entityId, entityType, filename, isPrimary) VALUES (?, ?, ?, ?)',
            [record.entityId, record.entityType, record.filename, record.isPrimary]
        )
    );

    const results = await Promise.all(insertPromises);
    return results.map((result, index) => ({
        id: result.insertId,
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
        'SELECT * FROM file_tb WHERE entityId = ? AND entityType = ? ORDER BY isPrimary DESC, id ASC',
        [entityId, entityType]
    );
    return result;
}

/**
 * Get primary file for an entity (for inventory)
 * @param {number} entityId - The ID of the entity
 * @param {string} entityType - The type of entity ('object' or 'inventory')
 * @returns {Promise<Object|null>} Primary file record or null
 */
async function getPrimaryFile(entityId, entityType) {
    const result = await db.queryAsync(
        'SELECT * FROM file_tb WHERE entityId = ? AND entityType = ? AND isPrimary = true LIMIT 1',
        [entityId, entityType]
    );
    return result.length > 0 ? result[0] : null;
}

/**
 * Delete files by IDs
 * @param {Array} fileIds - Array of file IDs to delete
 * @returns {Promise<number>} Number of deleted files
 */
async function deleteFiles(fileIds) {
  if (!fileIds || fileIds.length === 0) return 0;
  
  // First get the filenames before deleting from database
  const placeholders = fileIds.map(() => '?').join(',');
  const filesResult = await db.queryAsync(
    `SELECT filename FROM file_tb WHERE id IN (${placeholders})`,
    fileIds
  );
  
  // Delete files from disk
  const filenames = filesResult.map(file => file.filename);
  await deleteFilesFromDisk(filenames);
  
  // Delete from database
  const result = await db.queryAsync(
    `DELETE FROM file_tb WHERE id IN (${placeholders})`,
    fileIds
  );
  return result.affectedRows;
}

/**
 * Delete files by filenames (for handling frontend deletions)
 * @param {Array} filenames - Array of filenames to delete
 * @returns {Promise<number>} Number of deleted files
 */
async function deleteFilesByFilenames(filenames) {
  if (!filenames || filenames.length === 0) return 0;
  
  // Delete files from disk first
  await deleteFilesFromDisk(filenames);
  
  // Delete from database
  const placeholders = filenames.map(() => '?').join(',');
  const result = await db.queryAsync(
    `DELETE FROM file_tb WHERE filename IN (${placeholders})`,
    filenames
  );
  return result.affectedRows;
}

/**
 * Delete all files for an entity
 * @param {number} entityId - The ID of the entity
 * @param {string} entityType - The type of entity ('object' or 'inventory')
 * @returns {Promise<number>} Number of deleted files
 */
async function deleteEntityFiles(entityId, entityType) {
    // First get the filenames before deleting from database
    const filesResult = await db.queryAsync(
        'SELECT filename FROM file_tb WHERE entityId = ? AND entityType = ?',
        [entityId, entityType]
    );
    
    // Delete files from disk
    const filenames = filesResult.map(file => file.filename);
    await deleteFilesFromDisk(filenames);
    
    // Delete from database
    const result = await db.queryAsync(
        'DELETE FROM file_tb WHERE entityId = ? AND entityType = ?',
        [entityId, entityType]
    );
    return result.affectedRows;
}

/**
 * Update primary file for an entity (for inventory)
 * @param {number} entityId - The ID of the entity
 * @param {string} entityType - The type of entity ('object' or 'inventory')
 * @param {string} newFilename - Filename of the new primary file
 * @returns {Promise<Object>} Updated file record
 */
async function updatePrimaryFile(entityId, entityType, newFilename) {
    // First, get the old primary filenames to delete them from disk
    const oldFilesResult = await db.queryAsync(
        'SELECT filename FROM file_tb WHERE entityId = ? AND entityType = ? AND isPrimary = true',
        [entityId, entityType]
    );
    
    // Delete old files from disk
    const oldFilenames = oldFilesResult.map(file => file.filename);
    await deleteFilesFromDisk(oldFilenames);
    
    // Set all files for this entity to not primary
    await db.queryAsync(
        'UPDATE file_tb SET isPrimary = false WHERE entityId = ? AND entityType = ?',
        [entityId, entityType]
    );

    // Then insert the new primary file
    const result = await db.queryAsync(
        'INSERT INTO file_tb (entityId, entityType, filename, isPrimary) VALUES (?, ?, ?, true)',
        [entityId, entityType, newFilename]
    );

    return {
        id: result.insertId,
        entityId: entityId,
        entityType: entityType,
        filename: newFilename,
        isPrimary: true
    };
}

module.exports = {
  insertFiles,
  getFiles,
  getPrimaryFile,
  deleteFiles,
  deleteFilesByFilenames,
  deleteEntityFiles,
  updatePrimaryFile
};
