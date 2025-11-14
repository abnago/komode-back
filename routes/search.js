var express = require('express');
var router = express.Router();
const db = require('../config/database');
const fileService = require('../util/fileService');
const urlJoin = require('url-join').default;

router.post('/:inventoryId?', async (req, res) => {
  try {
    const { value } = req.body || {};
    const userId = req.user.id;
    const inventoryId = req.params.inventoryId;

    if (!value || !value.trim()) {
      return res.json({ code: 0, msg: '', data: { inventories: [], shelves: [], objects: [] } });
    }
    
    // Minimum 3 characters required for search
    if (value.trim().length < 3) {
      return res.json({ code: 1, msg: 'Search query must be at least 3 characters', data: { inventories: [], shelves: [], objects: [] } });
    }
    
    const searchPattern = `%${value.toLowerCase()}%`;
    
    // Search for inventories (limit 5)
    let inventories = undefined;
    if(inventoryId) {
      const hasAccess = await db.queryAsync(`
        SELECT 1 FROM inventory_tb
        WHERE id = ? AND userId = ? AND deleted = 0
      `, [inventoryId, userId]);
      if(!hasAccess[0]) {
        return res.json({ code: 1, msg: 'Inventory not found', data: { inventories, shelves: [], objects: [] } });
      }
    } else {
      inventories = await db.queryAsync(`
        SELECT * FROM inventory_tb
        WHERE userId = ? AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?) AND deleted = 0
        ORDER BY id DESC
        LIMIT 5
      `, [userId, searchPattern, searchPattern]);
    }
    
    const shelves = await db.queryAsync(`
      SELECT st.* FROM shelf_tb AS st
      LEFT OUTER JOIN inventory_tb AS it ON st.inventoryId = it.id
      WHERE 
        st.userId = ? 
        AND (LOWER(st.name) LIKE ? OR LOWER(st.description) LIKE ?)
        AND it.id IS NOT NULL 
        AND it.deleted = 0
      ORDER BY st.id DESC
      LIMIT 5
    `, [userId, searchPattern, searchPattern]);

    const objects = await db.queryAsync(`
      SELECT ot.*, it.name AS inventoryName FROM object_tb AS ot
      LEFT OUTER JOIN inventory_tb AS it ON ot.inventoryId = it.id
      WHERE 
        ot.userId = ? 
        AND (LOWER(ot.name) LIKE ? OR LOWER(ot.description) LIKE ? OR ot.barcode = ?)
        AND it.id IS NOT NULL 
        AND it.deleted = 0
      ORDER BY ot.id DESC
      LIMIT 5
    `, [userId, searchPattern, searchPattern, value]);
        
    // Get thumbnail for each object
    const objectsWithThumbnails = [];
    for (const obj of objects) {
      const files = await fileService.getFiles(obj.id, 'object');
      const thumbnail = files[files.length - 1]?.filename;

      objectsWithThumbnails.push({
        ...obj,
        thumbnail: thumbnail ? urlJoin(process.env.UPLOAD_URL, thumbnail) : null
      });
    }
    
    return res.json({ 
      code: 0, 
      data: {
        inventories,
        shelves,
        objects: objectsWithThumbnails
      }
    });
  } catch (err) {
    console.error(67190, err);
    return res.json({ code: 7, msg: "Internal server error" });
  }
});

module.exports = router;