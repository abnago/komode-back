var express = require('express');
var router = express.Router();
const db = require('../config/database');
const fileService = require('../util/fileService');

// Create Shelf (POST /shelf/create)
router.post('/create', async function(req, res) {
  try {
    const { name, description, inventoryId } = req.body || {};
    if (!name) {
      return res.json({ code: 1, msg: 'name is required' });
    }
    if (!inventoryId) {
      return res.json({ code: 3, msg: 'inventoryId is required' });
    }
    const userId = req.user.id;
    
    // Verify that the inventory belongs to the user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ? AND deleted = 0', [inventoryId, userId]);
    if (!inventoryCheck.length) {
      return res.json({ code: 4, msg: 'inventory not found' });
    }
    
    // Insert shelf
    const result = await db.queryAsync('INSERT INTO shelf_tb (name, description, inventoryId, userId) VALUES (?, ?, ?, ?)', [name, description || null, inventoryId, userId]);
    const shelfId = result.insertId;
    
    return res.json({ code: 0, msg: '', data: { id: shelfId } });
  } catch (err) {
    console.error(67170, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// List Shelves (GET /shelf/list?inventoryId=)
router.get('/list', async function(req, res) {
  try {
    const { inventoryId } = req.query || {};
    if (!inventoryId) {
      return res.json({ code: 1, msg: 'inventoryId is required' });
    }
    
    const userId = req.user.id;
    
    // Verify that the inventory belongs to the user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ? AND deleted = 0', [inventoryId, userId]);
    if (!inventoryCheck.length) {
      return res.json({ code: 1, msg: 'inventory not found' });
    }
    
    const result = await db.queryAsync(`
      SELECT * FROM shelf_tb
      WHERE userId = ? AND inventoryId = ?
      ORDER BY id DESC`, [userId, inventoryId]);
    
    return res.json({ code: 0, msg: '', data: result });
  } catch (err) {
    console.error(67173, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// Update Shelf (POST /shelf/update)
router.post('/update', async function(req, res) {
  try {
    const { id, name } = req.body || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required' });
    }
    const userId = req.user.id;
    
    // Check if shelf exists and belongs to user
    const shelfCheck = await db.queryAsync('SELECT id FROM shelf_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!shelfCheck.length) {
      return res.json({ code: 3, msg: 'not found' });
    }
    
    // Update shelf fields
    await db.queryAsync('UPDATE shelf_tb SET name = ? WHERE id = ? AND userId = ?', [name, id, userId]);
    
    return res.json({ code: 0 });
  } catch (err) {
    console.error(67174, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// Delete Shelf (POST /shelf/delete)
router.post('/delete', async function(req, res) {
  try {
    const { id } = req.body || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required' });
    }
    const userId = req.user.id;
    
    // Check if shelf exists and belongs to user
    const shelfCheck = await db.queryAsync('SELECT id FROM shelf_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!shelfCheck.length) {
      return res.json({ code: 3, msg: 'not found' });
    }
    
    await db.queryAsync(`UPDATE object_tb SET shelfId = NULL WHERE shelfId = ? AND userId = ?`, [id, userId]);
    await db.queryAsync('DELETE FROM shelf_tb WHERE id = ? AND userId = ?', [id, userId]);

    return res.json({ code: 0 });
  } catch (err) {
    console.error(67175, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

module.exports = router;
