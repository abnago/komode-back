var express = require('express');
var router = express.Router();
const db = require('../config/database');

// Create Object (POST /object/create)
router.post('/create', async function(req, res) {
  try {
    const { name, description, quantity, inventoryId } = req.body || {};
    if (!name) return res.json({ code: 1, msg: 'name is required', data: null });
    if (!inventoryId) return res.json({ code: 1, msg: 'inventoryId is required', data: null });
    if (quantity == null) return res.json({ code: 1, msg: 'quantity is required', data: null });
    const userId = req.user.id;
    
    // Verify that the inventory belongs to the user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ?', [inventoryId, userId]);
    if (!inventoryCheck.results.length) {
      return res.json({ code: 1, msg: 'inventory not found or access denied', data: null });
    }
    
    const result = await db.queryAsync('INSERT INTO object_tb (name, description, quantity, userId, inventoryId) VALUES (?, ?, ?, ?, ?)', [name, description || null, quantity, userId, inventoryId]);
    res.json({ code: 0, msg: '', data: { id: result.results.insertId } });
  } catch (err) {
    console.error(67163, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Read Object by id (GET /object/get?id=)
router.get('/get', async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM object_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!result.results.length) return res.json({ code: 1, msg: 'not found', data: null });
    res.json({ code: 0, msg: '', data: result.results[0] });
  } catch (err) {
    console.error(67164, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Get inventory details for objects page (GET /object/inventory?id=)
router.get('/inventory', async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!result.results.length) return res.json({ code: 1, msg: 'inventory not found or access denied', data: null });
    res.json({ code: 0, msg: '', data: result.results[0] });
  } catch (err) {
    console.error(67168, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// List Object (GET /object/list?inventoryId=)
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
    
    const result = await db.queryAsync('SELECT * FROM object_tb WHERE userId = ? AND inventoryId = ? ORDER BY id DESC', [userId, inventoryId]);
    res.json({ code: 0, msg: '', data: result.results });
  } catch (err) {
    console.error(67165, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Update Object (POST /object/update)
router.post('/update', async function(req, res) {
  try {
    const { id, name, description, quantity } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const fields = [];
    const params = [];
    if (name != null) { fields.push('name = ?'); params.push(name); }
    if (description != null) { fields.push('description = ?'); params.push(description); }
    if (quantity != null) { fields.push('quantity = ?'); params.push(quantity); }
    if (!fields.length) return res.json({ code: 1, msg: 'nothing to update', data: null });
    params.push(id, userId);
    const sql = `UPDATE object_tb SET ${fields.join(', ')} WHERE id = ? AND userId = ?`;
    const result = await db.queryAsync(sql, params);
    if (result.results.affectedRows === 0) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67166, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Delete Object (POST /object/delete)
router.post('/delete', async function(req, res) {
  try {
    const { id } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('DELETE FROM object_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (result.results.affectedRows === 0) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67167, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

module.exports = router;


