var express = require('express');
var router = express.Router();
const db = require('../config/database');
const fileService = require('../util/fileService');

// Create Shelf (POST /shelf/create)
router.post('/create', async function(req, res) {
  try {
    const { name, description, inventoryId } = req.body || {};
    if (!name) return res.json({ code: 1, msg: 'name is required', data: null });
    if (!inventoryId) return res.json({ code: 1, msg: 'inventoryId is required', data: null });
    const userId = req.user.id;
    
    // Verify that the inventory belongs to the user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ?', [inventoryId, userId]);
    if (!inventoryCheck.results.length) {
      return res.json({ code: 1, msg: 'inventory not found or access denied', data: null });
    }
    
    // Insert shelf
    const result = await db.queryAsync('INSERT INTO shelf_tb (name, description, inventoryId, userId) VALUES (?, ?, ?, ?)', [name, description || null, inventoryId, userId]);
    const shelfId = result.results.insertId;
    
    res.json({ code: 0, msg: '', data: { id: shelfId } });
  } catch (err) {
    console.error(67170, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Read Shelf by id (GET /shelf/get?id=)
router.get('/get', async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM shelf_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!result.results.length) return res.json({ code: 1, msg: 'not found', data: null });
    
    res.json({ code: 0, msg: '', data: result.results[0] });
  } catch (err) {
    console.error(67171, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Get inventory details for shelf page (GET /shelf/inventory?id=)
router.get('/inventory', async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!result.results.length) return res.json({ code: 1, msg: 'inventory not found or access denied', data: null });
    res.json({ code: 0, msg: '', data: result.results[0] });
  } catch (err) {
    console.error(67172, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// List Shelves (GET /shelf/list?inventoryId=)
router.get('/list', async function(req, res) {
  try {
    const { inventoryId } = req.query || {};
    if (!inventoryId) return res.json({ code: 1, msg: 'inventoryId is required', data: null });
    
    const userId = req.user.id;
    
    // Verify that the inventory belongs to the user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ?', [inventoryId, userId]);
    if (!inventoryCheck.results.length) {
      return res.json({ code: 1, msg: 'inventory not found or access denied', data: null });
    }
    
    const result = await db.queryAsync(`
      SELECT * FROM shelf_tb
      WHERE userId = ? AND inventoryId = ?
      ORDER BY id DESC`, [userId, inventoryId]);
    
    res.json({ code: 0, msg: '', data: result.results });
  } catch (err) {
    console.error(67173, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Update Shelf (POST /shelf/update)
router.post('/update', async function(req, res) {
  try {
    const { id, name, description } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    
    // Check if shelf exists and belongs to user
    const shelfCheck = await db.queryAsync('SELECT id FROM shelf_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!shelfCheck.results.length) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    
    const fields = [];
    const params = [];
    if (name != null) { fields.push('name = ?'); params.push(name); }
    if (description != null) { fields.push('description = ?'); params.push(description); }
    
    if (!fields.length) {
      return res.json({ code: 1, msg: 'nothing to update', data: null });
    }
    
    // Update shelf fields
    params.push(id, userId);
    const sql = `UPDATE shelf_tb SET ${fields.join(', ')} WHERE id = ? AND userId = ?`;
    await db.queryAsync(sql, params);
    
    res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67174, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Delete Shelf (POST /shelf/delete)
router.post('/delete', async function(req, res) {
  try {
    const { id } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    
    // Check if shelf exists and belongs to user
    const shelfCheck = await db.queryAsync('SELECT id FROM shelf_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!shelfCheck.results.length) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    
    // Delete all objects and their files in this shelf
    await fileService.deleteShelfObjects(id, userId);
    
    // Delete the shelf
    const result = await db.queryAsync('DELETE FROM shelf_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (result.results.affectedRows === 0) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67175, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

module.exports = router;
