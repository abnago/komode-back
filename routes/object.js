var express = require('express');
var router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Create Object (POST /object/create)
router.post('/create', authenticateToken, async function(req, res) {
  try {
    const { name, description } = req.body || {};
    if (!name) return res.json({ code: 1, msg: 'name is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('INSERT INTO object_tb (name, description, user_id) VALUES (?, ?, ?)', [name, description || null, userId]);
    res.json({ code: 0, msg: '', data: { id: result.results.insertId } });
  } catch (err) {
    console.error(67163, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Read Object by id (GET /object/get?id=)
router.get('/get', authenticateToken, async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM object_tb WHERE id = ? AND user_id = ?', [id, userId]);
    if (!result.results.length) return res.json({ code: 1, msg: 'not found', data: null });
    res.json({ code: 0, msg: '', data: result.results[0] });
  } catch (err) {
    console.error(67164, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// List Object (GET /object/list)
router.get('/list', authenticateToken, async function(req, res) {
  try {
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM object_tb WHERE user_id = ? ORDER BY id DESC', [userId]);
    res.json({ code: 0, msg: '', data: result.results });
  } catch (err) {
    console.error(67165, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Update Object (POST /object/update)
router.post('/update', authenticateToken, async function(req, res) {
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
    const sql = `UPDATE object_tb SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
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
router.post('/delete', authenticateToken, async function(req, res) {
  try {
    const { id } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('DELETE FROM object_tb WHERE id = ? AND user_id = ?', [id, userId]);
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


