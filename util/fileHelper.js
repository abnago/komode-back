// For a single file
export function getRelativePath(filename) {
  return `/uploads/${filename}`;
}

// for multiple files
export function mapFiles(files) {
  if (!files) return [];
  return files.map(file => getRelativePath(file.filename));
}