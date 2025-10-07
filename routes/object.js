var express = require('express');
var router = express.Router();
const db = require('../config/database');
const upload = require('../util/multerOptions').default;
const fileService = require('../util/fileService');

// Create Object (POST /object/create)
router.post('/create', upload.array('images', 5), async function(req, res) {
  try {
    const { name, description, quantity, inventoryId, shelfId } = req.body || {};
    if (!name) return res.json({ code: 1, msg: 'name is required', data: null });
    if (!inventoryId) return res.json({ code: 1, msg: 'inventoryId is required', data: null });
    if (quantity == null) return res.json({ code: 1, msg: 'quantity is required', data: null });
    const userId = req.user.id;
    
    // Verify that the inventory belongs to the user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ?', [inventoryId, userId]);
    if (!inventoryCheck.results.length) {
      return res.json({ code: 1, msg: 'inventory not found or access denied', data: null });
    }
    
    // If shelfId is provided, verify that the shelf belongs to the user and the same inventory
    if (shelfId) {
      const shelfCheck = await db.queryAsync('SELECT id FROM shelf_tb WHERE id = ? AND userId = ? AND inventoryId = ?', [shelfId, userId, inventoryId]);
      if (!shelfCheck.results.length) {
        return res.json({ code: 1, msg: 'shelf not found or access denied', data: null });
      }
    }
    
    // Insert object without images column
    const result = await db.queryAsync('INSERT INTO object_tb (name, description, quantity, userId, inventoryId, shelfId) VALUES (?, ?, ?, ?, ?, ?)', [name, description || null, quantity, userId, inventoryId, shelfId || null]);
    const objectId = result.results.insertId;
    
    // Handle file uploads
    if (req.files && req.files.length > 0) {
      await fileService.insertFiles(objectId, 'object', req.files);
    }
    
    res.json({ code: 0, msg: '', data: { id: objectId } });
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
    
    // Get files for this object
    const files = await fileService.getFiles(id, 'object');
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    
    const data = {
      ...result.results[0],
      images: files.map(file => `${baseUrl}${file.url}`)
    };
    
    res.json({ code: 0, msg: '', data });
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

// Get shelf details for objects page (GET /object/shelf?id=)
router.get('/shelf', async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM shelf_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!result.results.length) return res.json({ code: 1, msg: 'shelf not found or access denied', data: null });
    res.json({ code: 0, msg: '', data: result.results[0] });
  } catch (err) {
    console.error(67169, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// List Object (GET /object/list?inventoryId=&shelfId=)
router.get('/list', async function(req, res) {
  try {
    const { inventoryId, shelfId } = req.query || {};
    if (!inventoryId) return res.json({ code: 1, msg: 'inventoryId is required', data: null });
    
    const userId = req.user.id;
    
    // Verify that the inventory belongs to the user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ?', [inventoryId, userId]);
    if (!inventoryCheck.results.length) {
      return res.json({ code: 1, msg: 'inventory not found or access denied', data: null });
    }
    
    // If shelfId is provided, verify that the shelf belongs to the user and the same inventory
    if (shelfId) {
      const shelfCheck = await db.queryAsync('SELECT id FROM shelf_tb WHERE id = ? AND userId = ? AND inventoryId = ?', [shelfId, userId, inventoryId]);
      if (!shelfCheck.results.length) {
        return res.json({ code: 1, msg: 'shelf not found or access denied', data: null });
      }
    }
    
    let query = `
      SELECT * FROM object_tb
      WHERE userId = ? AND inventoryId = ?`;
    let params = [userId, inventoryId];
    
    if (shelfId) {
      query += ' AND shelfId = ?';
      params.push(shelfId);
    }
    
    query += ' ORDER BY id DESC';
    
    const result = await db.queryAsync(query, params);
    
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    
    // Get files for each object and build response
    const data = await Promise.all(result.results.map(async (obj) => {
      const files = await fileService.getFiles(obj.id, 'object');
      const thumbnail = files.length > 0 ? files[files.length - 1].url : '/uploads/default.png';
      
      return {
        ...obj,
        thumbnail: `${baseUrl}${thumbnail}`,
        images: files.map(file => `${baseUrl}${file.url}`)
      };
    }));
    
    res.json({ code: 0, msg: '', data });
  } catch (err) {
    console.error(67165, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Update Object (POST /object/update)
router.put('/update', upload.array('images', 5), async function(req, res) {
  try {
    const { id, name, description, quantity, shelfId, deletedImages } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    
    // Check if object exists and belongs to user
    const objectCheck = await db.queryAsync('SELECT id, inventoryId FROM object_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!objectCheck.results.length) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    
    // If shelfId is provided, verify that the shelf belongs to the user and the same inventory
    if (shelfId) {
      const shelfCheck = await db.queryAsync('SELECT id FROM shelf_tb WHERE id = ? AND userId = ? AND inventoryId = ?', [shelfId, userId, objectCheck.results[0].inventoryId]);
      if (!shelfCheck.results.length) {
        return res.json({ code: 1, msg: 'shelf not found or access denied', data: null });
      }
    }
    
    const fields = [];
    const params = [];
    if (name != null) { fields.push('name = ?'); params.push(name); }
    if (description != null) { fields.push('description = ?'); params.push(description); }
    if (quantity != null) { fields.push('quantity = ?'); params.push(quantity); }
    if (shelfId !== undefined) { fields.push('shelfId = ?'); params.push(shelfId || null); }
    
    // Handle file deletions
    if (deletedImages && deletedImages.length > 0) {
      // Parse deletedImages to get file URLs
      const deletedFileUrls = JSON.parse(deletedImages);
      if (deletedFileUrls.length > 0) {
        await fileService.deleteFilesByUrls(deletedFileUrls);
      }
    }
    
    // Handle new file uploads
    if (req.files && req.files.length > 0) {
      await fileService.addFiles(id, 'object', req.files);
    }
    
    if (!fields.length && !req.files && !deletedImages) {
      return res.json({ code: 1, msg: 'nothing to update', data: null });
    }
    
    // Update object fields if any
    if (fields.length > 0) {
      params.push(id, userId);
      const sql = `UPDATE object_tb SET ${fields.join(', ')} WHERE id = ? AND userId = ?`;
      await db.queryAsync(sql, params);
    }
    
    res.json({ code: 0, msg: '', data: { id } });
  } catch (err) {
    console.error(67166, err);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Delete Object (POST /object/delete)
router.delete('/delete', async function(req, res) {
  try {
    const { id } = req.body || {};
    if (!id) return res.json({ code: 1, msg: 'id is required', data: null });
    const userId = req.user.id;
    
    // Check if object exists and belongs to user
    const objectCheck = await db.queryAsync('SELECT id FROM object_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!objectCheck.results.length) {
      return res.json({ code: 1, msg: 'not found or access denied', data: null });
    }
    
    // Delete associated files first
    await fileService.deleteEntityFiles(id, 'object');
    
    // Delete the object
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


