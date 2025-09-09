var express = require('express');
var router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Create Inventory (POST /inventory/create)
router.post('/create', authenticateToken, async function(req, res) {
  try {
    const { name, quantity } = req.body || {};
    if (!name || quantity == null) {
      return res.json({ code: 1, msg: 'name and quantity are required', data: null });
    }
    const userId = req.user.id;
    const result = await db.queryAsync('INSERT INTO inventory_tb (name, quantity, user_id) VALUES (?, ?, ?)', [name, quantity, userId]);
    res.json({ code: 0, msg: '', data: { id: result.results.insertId } });
  } catch (err) {
    console.error(67158, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Read Inventory by id (GET /inventory/get?id=)
router.get('/get', authenticateToken, async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE id = ? AND user_id = ?', [id, userId]);
    if (!result.results.length) return res.json({ code: 1, msg: 'not found', data: null });
    res.json({ code: 0, msg: '', data: result.results[0] });
  } catch (err) {
    console.error(67159, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// List Inventory (GET /inventory/list)
router.get('/list', authenticateToken, async function(req, res) {
  try {
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE user_id = ? ORDER BY id DESC', [userId]);
    res.json({ code: 0, msg: '', data: result.results });
  } catch (err) {
    console.error(67160, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Update Inventory (POST /inventory/update)
router.post('/update', authenticateToken, async function(req, res) {
  try {
    const { id, name, quantity } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const fields = [];
    const params = [];
    if (name != null) { fields.push('name = ?'); params.push(name); }
    if (quantity != null) { fields.push('quantity = ?'); params.push(quantity); }
    if (!fields.length) return res.json({ code: 1, msg: 'nothing to update', data: null });
    params.push(id, userId);
    const sql = `UPDATE inventory_tb SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    const result = await db.queryAsync(sql, params);
    if (result.results.affectedRows === 0) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67161, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Delete Inventory (POST /inventory/delete)
router.post('/delete', authenticateToken, async function(req, res) {
  try {
    const { id } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('DELETE FROM inventory_tb WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.results.affectedRows === 0) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67162, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

module.exports = router;


