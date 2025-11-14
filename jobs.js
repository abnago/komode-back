const cron = require('node-cron');
const db = require('./config/database');

/**
 * Cron job to permanently delete items marked as deleted older than 30 days
 * Runs every day at midnight (00:00)
 */
function cleanupOldDeletedItems() {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running cleanup job for old deleted items...');
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Delete from inventory_tb
      const inventoryResult = await db.queryAsync(
        'DELETE FROM inventory_tb WHERE deleted = 1 AND deleted_at < ?',
        [thirtyDaysAgo]
      );
      
      console.log(`Cleaned up ${inventoryResult.affectedRows} old deleted items from inventory_tb`);
      
      // Delete from object_tb
      const objectResult = await db.queryAsync(
        'DELETE FROM object_tb WHERE deleted = 1 AND deleted_at < ?',
        [thirtyDaysAgo]
      );
      
      console.log(`Cleaned up ${objectResult.affectedRows} old deleted items from object_tb`);
      
    } catch (error) {
      console.error('Error during cleanup job:', error);
    }
  });
  
  console.log('Cleanup job scheduled to run daily at midnight');
}

module.exports = {
  cleanupOldDeletedItems
};

