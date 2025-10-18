var fs = require('fs');
var path = require('path');

// For a single file
function getRelativePath(filename) {
  return `/uploads/${filename}`;
}

// for multiple files
function mapFiles(files) {
  if (!files) return [];
  return files.map(file => getRelativePath(file.filename));
}

/**
 * Delete a file from the uploads folder
 * @param {string} filePath - The relative path of the file (e.g., "/uploads/filename.jpg")
 * @returns {Promise<boolean>} True if file was deleted, false if file didn't exist or couldn't be deleted
 */
async function deleteFileFromDisk(filePath) {
  try {
    // Security check: ensure the file path is within uploads directory
    if (!filePath.startsWith('/uploads/') || filePath.includes('..')) {
      console.error(`Invalid file path: ${filePath}`);
      return false;
    }
    
    // Convert relative path to absolute path
    const absolutePath = path.join(__dirname, '..', filePath);
    
    // Additional security check: ensure the resolved path is within uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const resolvedPath = path.resolve(absolutePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      console.error(`File path outside uploads directory: ${filePath}`);
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
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}

/**
 * Delete multiple files from the uploads folder
 * @param {Array} filePaths - Array of relative file paths
 * @returns {Promise<number>} Number of files successfully deleted
 */
async function deleteFilesFromDisk(filePaths) {
  if (!filePaths || filePaths.length === 0) return 0;
  
  const deletePromises = filePaths.map(filePath => deleteFileFromDisk(filePath));
  const results = await Promise.all(deletePromises);
  return results.filter(result => result === true).length;
}

// Legacy functions - kept for backward compatibility
// These are now handled by fileService.js
module.exports = {
  getRelativePath,
  mapFiles,
  deleteFileFromDisk,
  deleteFilesFromDisk
};