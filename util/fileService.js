var fs = require('fs');
var path = require('path');
const db = require('../config/database');

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
      return true;
    } else {
      console.error(`File not found: ${absolutePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error deleting file ${filename}:`, error);
    return false;
  }
}

async function deleteFilesFromDisk(filenames) {
  if (!filenames || filenames.length === 0) return 0;
  
  let deletedCount = 0;
  for (const filename of filenames) {
    const result = await deleteFileFromDisk(filename);
    if (result === true) {
      deletedCount++;
    }
  }
  return deletedCount;
}

async function insertFiles(entityId, entityType, files, isPrimary = false) {
    if (!files || files.length === 0) return [];

    const fileRecords = files.map((file, index) => ({
        entityId: entityId,
        entityType: entityType,
        filename: file.filename,
        isPrimary: isPrimary && index === 0 // First file is primary for inventory
    }));

    const insertedRecords = [];
    for (const record of fileRecords) {
        const result = await db.queryAsync(
            'INSERT INTO file_tb (entityId, entityType, filename, isPrimary) VALUES (?, ?, ?, ?)',
            [record.entityId, record.entityType, record.filename, record.isPrimary]
        );
        insertedRecords.push({
            id: result.insertId,
            ...record
        });
    }
    return insertedRecords;
}

async function getFiles(entityId, entityType) {
    const result = await db.queryAsync(
        'SELECT * FROM file_tb WHERE entityId = ? AND entityType = ? ORDER BY isPrimary DESC, id ASC',
        [entityId, entityType]
    );
    return result;
}

async function getPrimaryFile(entityId, entityType) {
    const result = await db.queryAsync(
        'SELECT * FROM file_tb WHERE entityId = ? AND entityType = ? AND isPrimary = true LIMIT 1',
        [entityId, entityType]
    );
    return result.length > 0 ? result[0] : null;
}

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
