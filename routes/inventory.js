var express = require('express');
var router = express.Router();
const db = require('../config/database');

// Create Inventory (POST /inventory/create)
router.post('/create', async function(req, res) {
  try {
    const { name, description } = req.body || {};
    if (!name) {
      return res.json({ code: 1, msg: 'name is required', data: null });
    }
    const userId = req.user.id;
    const result = await db.queryAsync('INSERT INTO inventory_tb (name, description, userId) VALUES (?, ?, ?)', [name, description || null, userId]);
    res.json({ code: 0, msg: '', data: { id: result.results.insertId } });
  } catch (err) {
    console.error(67158, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Read Inventory by id (GET /inventory/get?id=)
router.get('/get', async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!result.results.length) return res.json({ code: 1, msg: 'not found', data: null });
    res.json({ code: 0, msg: '', data: result.results[0] });
  } catch (err) {
    console.error(67159, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// List Inventory (GET /inventory/list)
router.get('/list', async function(req, res) {
  try {
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE userId = ? ORDER BY id DESC', [userId]);
    res.json({ code: 0, msg: '', data: result.results });
  } catch (err) {
    console.error(67160, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Update Inventory (POST /inventory/update)
router.post('/update', async function(req, res) {
  try {
    const { id, name, description } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const fields = [];
    const params = [];
    if (name != null) { fields.push('name = ?'); params.push(name); }
    if (description != null) { fields.push('description = ?'); params.push(description); }
    if (!fields.length) return res.json({ code: 1, msg: 'nothing to update', data: null });
    params.push(id, userId);
    const sql = `UPDATE inventory_tb SET ${fields.join(', ')} WHERE id = ? AND userId = ?`;
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
router.post('/delete', async function(req, res) {
  try {
    const { id } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('DELETE FROM inventory_tb WHERE id = ? AND userId = ?', [id, userId]);
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


