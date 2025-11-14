const fs = require('fs');
const path = require('path');
const { cleanupOldDeletedItems } = require('./jobs');

/**
 * Bootstrap function that runs once at application startup
 * Ensures necessary directories exist and initializes cron jobs
 */
function bootstrap() {
  try {
    // Check and create uploads folder
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads directory');
    }
    
    // Initialize cron jobs
    cleanupOldDeletedItems();
  } catch (error) {
    console.error('Error during bootstrap:', error);
    throw error;
  }
}

module.exports = bootstrap;

