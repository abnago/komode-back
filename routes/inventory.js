var express = require('express');
var router = express.Router();
const db = require('../config/database');
const upload = require('../util/multerOptions');
const fileService = require('../util/fileService');
const path = require('path');

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
    const inventoryId = result.insertId;
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
    if (!result.length) return res.json({ code: 1, msg: 'not found', data: null });

    // Get primary file for this inventory
    const primaryFile = await fileService.getPrimaryFile(id, 'inventory');

    const data = {
      ...result[0],
      image: path.join(process.env.UPLOAD_URL, primaryFile.url)
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

    // Get primary files for each inventory and build response
    const data = await Promise.all(result.map(async (item) => {
      const primaryFile = await fileService.getPrimaryFile(item.id, 'inventory');
      return {
        ...item,
        image: path.join(process.env.UPLOAD_URL, primaryFile.url)
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
    if (!inventoryCheck.length) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }

    const fields = [];
    const params = [];
    if (name != null) { fields.push('name = ?'); params.push(name); }
    if (description != null) { fields.push('description = ?'); params.push(description); }

    // Handle file upload
    if (req.file) {
      await fileService.updatePrimaryFile(id, 'inventory', req.file.filename);
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
    if (!inventoryCheck.length) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }

    // Get all shelves in this inventory
    const shelvesResult = await db.queryAsync('SELECT id FROM shelf_tb WHERE inventoryId = ? AND userId = ?', [id, userId]);
    
    // Delete all objects in each shelf first
    for (const shelf of shelvesResult) {
      // Get all objects in this shelf
      const objectsResult = await db.queryAsync('SELECT id FROM object_tb WHERE shelfId = ? AND userId = ?', [shelf.id, userId]);
      
      // Delete all objects and their files
      for (const object of objectsResult) {
        await fileService.deleteEntityFiles(object.id, 'object');
        await db.queryAsync('DELETE FROM object_tb WHERE id = ?', [object.id]);
      }
    }
    
    // Delete all shelves
    await db.queryAsync('DELETE FROM shelf_tb WHERE inventoryId = ? AND userId = ?', [id, userId]);

    // Delete associated files for inventory
    await fileService.deleteEntityFiles(id, 'inventory');

    // Delete the inventory
    const result = await db.queryAsync('DELETE FROM inventory_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (result.affectedRows === 0) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67162, err);
    res.json({ code: 7, msg: "Internal server error" });
  }
});

module.exports = router;


