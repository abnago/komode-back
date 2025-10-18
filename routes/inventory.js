var express = require('express');
var router = express.Router();
const db = require('../config/database');
const upload = require('../util/multerOptions').default;
const fileService = require('../util/fileService');

// Create Inventory (POST /inventory/create)
router.post('/create', upload.single('image'), async function (req, res) {
  try {
    const { name, description } = req.body || {};
    if (!name) {
      return res.json({ code: 1, msg: 'name is required', data: null });
    }
    const userId = req.user.id;
    // Create inventory
    const result = await db.queryAsync('INSERT INTO inventory_tb (name, description, userId) VALUES (?, ?, ?)', [name, description || null, userId]);
    const inventoryId = result.results.insertId;
    // Handle file upload
    if (req.file) {
      await fileService.insertFiles(inventoryId, 'inventory', [req.file], true);
    }
    res.json({ code: 0, msg: '', data: { id: inventoryId } });
  } catch (err) {
    console.error(67158, err);
    res.json({ code: 7, msg: "Internal server error" });
  }
});

// Read Inventory by id (GET /inventory/get?id=)
router.get('/get', async function (req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!result.results.length) return res.json({ code: 1, msg: 'not found', data: null });

    // Get primary file for this inventory
    const primaryFile = await fileService.getPrimaryFile(id, 'inventory');
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const data = {
      ...result.results[0],
      image: primaryFile ? `${baseUrl}${primaryFile.url}` : `${baseUrl}/uploads/default.png`
    };

    res.json({ code: 0, msg: '', data });
  } catch (err) {
    console.error(67159, err);
    res.json({ code: 7, msg: "Internal server error" });
  }
});

// List Inventory (GET /inventory/list)
router.get('/list', async function (req, res) {
  try {
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE userId = ? ORDER BY id DESC', [userId]);
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Get primary files for each inventory and build response
    const data = await Promise.all(result.results.map(async (item) => {
      const primaryFile = await fileService.getPrimaryFile(item.id, 'inventory');
      return {
        ...item,
        image: primaryFile
          ? `${baseUrl}${primaryFile.url}`
          : `${baseUrl}/uploads/default.png`
      };
    }));

    res.json({ code: 0, msg: '', data });
  } catch (err) {
    console.error(67160, err);
    res.json({ code: 7, msg: "Internal server error" });
  }
});

// Update Inventory (POST /inventory/update)
router.post('/update', upload.single('image'), async function (req, res) {
  try {
    const { id, name, description } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;

    // Check if inventory exists and belongs to user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!inventoryCheck.results.length) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }

    const fields = [];
    const params = [];
    if (name != null) { fields.push('name = ?'); params.push(name); }
    if (description != null) { fields.push('description = ?'); params.push(description); }

    // Handle file upload
    if (req.file) {
      await fileService.updatePrimaryFile(id, 'inventory', `/uploads/${req.file.filename}`);
    }

    if (!fields.length && !req.file) {
      return res.json({ code: 1, msg: 'nothing to update', data: null });
    }

    // Update inventory fields if any
    if (fields.length > 0) {
      params.push(id, userId);
      const sql = `UPDATE inventory_tb SET ${fields.join(', ')} WHERE id = ? AND userId = ?`;
      await db.queryAsync(sql, params);
    }

    res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67161, err);
    res.json({ code: 7, msg: "Internal server error" });
  }
});

// Delete Inventory (POST /inventory/delete)
router.post('/delete', async function (req, res) {
  try {
    const { id } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;

    // Check if inventory exists and belongs to user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!inventoryCheck.results.length) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }

    // Delete all shelves, their objects, and files in this inventory
    const deletionSummary = await fileService.deleteInventoryShelves(id, userId);

    // Delete associated files first
    await fileService.deleteEntityFiles(id, 'inventory');

    // Delete the inventory
    const result = await db.queryAsync('DELETE FROM inventory_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (result.results.affectedRows === 0) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67162, err);
    res.json({ code: 7, msg: "Internal server error" });
  }
});

module.exports = router;


