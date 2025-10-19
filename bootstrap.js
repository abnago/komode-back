const fs = require('fs');
const path = require('path');

/**
 * Bootstrap function that runs once at application startup
 * Ensures necessary directories exist
 */
function bootstrap() {
  try {
    // Check and create uploads folder
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads directory');
    }
  } catch (error) {
    console.error('Error during bootstrap:', error);
    throw error;
  }
}

module.exports = bootstrap;

