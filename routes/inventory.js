const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Create Inventory (POST /inventory/create)
router.post('/create', async function (req, res) {
  try {
    const { name, description, iconName } = req.body || {};
    if (!name) {
      return res.json({ code: 1, msg: 'name is required', data: null });
    }
    const userId = req.user.id;
    // Create inventory
    const result = await db.queryAsync('INSERT INTO inventory_tb (name, description, userId, iconName) VALUES (?, ?, ?, ?)', [name, description || null, userId, iconName || null]);
    const inventoryId = result.insertId;
    return res.json({ code: 0, msg: '', data: { id: inventoryId } });
  } catch (err) {
    console.error(67158, err);
    return res.json({ code: 7, msg: "Internal server error" });
  }
});

// Read Inventory by id (GET /inventory/get?id=)
router.get('/get', async function (req, res) {
  try {
    const { id } = req.query || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required', data: null });
    }
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE id = ? AND userId = ? AND deleted = 0', [id, userId]);
    if (!result.length) {
      return res.json({ code: 1, msg: 'not found', data: null });
    }

    return res.json({ code: 0, msg: '', data: result[0] });
  } catch (err) {
    console.error(67159, err);
    return res.json({ code: 7, msg: "Internal server error" });
  }
});

// List Inventory (GET /inventory/list)
router.get('/list', async function (req, res) {
  try {
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE userId = ? AND deleted = 0 ORDER BY id DESC', [userId]);

    return res.json({ code: 0, msg: '', data: result });
  } catch (err) {
    console.error(67160, err);
    return res.json({ code: 7, msg: "Internal server error" });
  }
});

// Get aggregated statistics (GET /inventory/stats)
router.get('/stats', async function (req, res) {
  try {
    const userId = req.user.id;

    const inventoryResult = await db.queryAsync('SELECT COUNT(*) AS count FROM inventory_tb WHERE userId = ? AND deleted = 0', [userId]);
    const objectResult = await db.queryAsync('SELECT COUNT(*) AS count FROM object_tb WHERE userId = ?', [userId]);
    const shelfResult = await db.queryAsync('SELECT COUNT(*) AS count FROM shelf_tb WHERE userId = ?', [userId]);

    return res.json({
      code: 0,
      msg: '',
      data: {
        inventoryCount: inventoryResult[0]?.count || 0,
        itemsCount: objectResult[0]?.count || 0,
        shelvesCount: shelfResult[0]?.count || 0
      }
    });
  } catch (err) {
    console.error(67181, err);
    return res.json({ code: 7, msg: "Internal server error" });
  }
});

// Update Inventory (POST /inventory/update)
router.post('/update', async function (req, res) {
  try {
    const { id, name, description, iconName } = req.body || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required', data: null });
    }
    const userId = req.user.id;

    // Check if inventory exists and belongs to user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ? AND deleted = 0', [id, userId]);
    if (!inventoryCheck.length) {
      return res.json({ code: 1, msg: 'not found', data: null });
    }

    const fields = [];
    const params = [];
    if (name != null) { fields.push('name = ?'); params.push(name); }
    if (description != null) { fields.push('description = ?'); params.push(description); }
    if (iconName != null) { fields.push('iconName = ?'); params.push(iconName); }

    if (!fields.length) {
      return res.json({ code: 1, msg: 'nothing to update', data: null });
    }

    params.push(id, userId);
    const sql = `UPDATE inventory_tb SET ${fields.join(', ')} WHERE id = ? AND userId = ?`;
    await db.queryAsync(sql, params);

    return res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67161, err);
    return res.json({ code: 7, msg: "Internal server error" });
  }
});

// Delete Inventory (POST /inventory/delete) - Soft delete
router.post('/delete', async function (req, res) {
  try {
    const { id } = req.body || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required', data: null });
    }
    const userId = req.user.id;

    // Check if inventory exists and belongs to user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ? AND deleted = 0', [id, userId]);
    if (!inventoryCheck.length) {
      return res.json({ code: 1, msg: 'not found', data: null });
    }

    // Soft delete the inventory by setting deleted = 1
    const result = await db.queryAsync('UPDATE inventory_tb SET deleted = 1 WHERE id = ? AND userId = ?', [id, userId]);
    if (result.affectedRows === 0) {
      return res.json({ code: 1, msg: 'not found', data: null });
    }
    return res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67162, err);
    return res.json({ code: 7, msg: "Internal server error" });
  }
});

// Undo Delete Inventory (POST /inventory/undo-delete)
router.post('/undo-delete', async function (req, res) {
  try {
    const { id } = req.body || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required', data: null });
    }
    const userId = req.user.id;

    // Check if inventory exists and belongs to user and is deleted
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ? AND deleted = 1', [id, userId]);
    if (!inventoryCheck.length) {
      return res.json({ code: 1, msg: 'not found or already restored', data: null });
    }

    // Restore the inventory by setting deleted = 0
    const result = await db.queryAsync('UPDATE inventory_tb SET deleted = 0 WHERE id = ? AND userId = ?', [id, userId]);
    if (result.affectedRows === 0) {
      return res.json({ code: 1, msg: 'not found', data: null });
    }
    return res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67163, err);
    return res.json({ code: 7, msg: "Internal server error" });
  }
});

module.exports = router;


