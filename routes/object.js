var express = require('express');
var router = express.Router();
const db = require('../config/database');
const upload = require('../util/multerOptions');
const fileService = require('../util/fileService');
const urlJoin = require('url-join').default;

// Create Object (POST /object/create)
router.post('/create', upload.array('images', 5), async function(req, res) {
  try {
    const body = req.body || {};
    const { name, description, quantity, inventoryId, shelfId, barcode } = body;
    if (!name) {
      return res.json({ code: 1, msg: 'name is required', data: null });
    }
    if (!inventoryId) {
      return res.json({ code: 1, msg: 'inventoryId is required', data: null });
    }
    if (quantity == null) {
      return res.json({ code: 1, msg: 'quantity is required', data: null });
    }
    const userId = req.user.id;
    
    // Verify that the inventory belongs to the user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ? AND deleted = 0', [inventoryId, userId]);
    if (!inventoryCheck.length) {
      return res.json({ code: 1, msg: 'inventory not found', data: null });
    }
    
    // If shelfId is provided, verify that the shelf belongs to the user and the same inventory
    if (shelfId) {
      const shelfCheck = await db.queryAsync('SELECT id FROM shelf_tb WHERE id = ? AND userId = ? AND inventoryId = ?', [shelfId, userId, inventoryId]);
      if (!shelfCheck.length) {
        return res.json({ code: 1, msg: 'shelf not found', data: null });
      }
    }
    
    // Insert object without images column
    const result = await db.queryAsync(
      'INSERT INTO object_tb (name, description, quantity, barcode, userId, inventoryId, shelfId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, quantity, barcode, userId, inventoryId, shelfId]
    );
    const objectId = result.insertId;
    
    // Handle file uploads
    if (req.files && req.files.length > 0) {
      await fileService.insertFiles(objectId, 'object', req.files, userId);
    }
    
    return res.json({ code: 0, msg: '', data: { id: objectId } });
  } catch (err) {
    console.error(67163, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// Read Object by id (GET /object/get?id=)
router.get('/get', async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required', data: null });
    }
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM object_tb WHERE id = ? AND userId = ? AND deleted = 0', [id, userId]);
    if (!result.length) {
      return res.json({ code: 1, msg: 'not found', data: null });
    }
    
    // Get files for this object
    const files = await fileService.getFiles(id, 'object');
    const images = []
    for (const file of files) {
      images.push({
        id: file.id,
        filename: file.filename
      });
    }

    const data = {
      ...result[0], images
    };
    
    return res.json({ code: 0, msg: '', data });
  } catch (err) {
    console.error(67364, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// Get inventory details for objects page (GET /object/inventory?id=)
router.get('/inventory', async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required', data: null });
    }
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM inventory_tb WHERE id = ? AND userId = ? AND deleted = 0', [id, userId]);
    if (!result.length) {
      return res.json({ code: 1, msg: 'inventory not found', data: null });
    }
    return res.json({ code: 0, msg: '', data: result[0] });
  } catch (err) {
    console.error(67168, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// Get shelf details for objects page (GET /object/shelf?id=)
router.get('/shelf', async function(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required', data: null });
    }
    const userId = req.user.id;
    const result = await db.queryAsync('SELECT * FROM shelf_tb WHERE id = ? AND userId = ?', [id, userId]);
    if (!result.length) {
      return res.json({ code: 1, msg: 'shelf not found', data: null });
    }
    return res.json({ code: 0, msg: '', data: result[0] });
  } catch (err) {
    console.error(67169, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// List Object (GET /object/list?inventoryId=&shelfId=)
router.get('/list', async function(req, res) {
  try {
    const { inventoryId, shelfId } = req.query || {};
    if (!inventoryId) {
      return res.json({ code: 1, msg: 'inventoryId is required', data: null });
    }
    
    const userId = req.user.id;
    
    // Verify that the inventory belongs to the user
    const inventoryCheck = await db.queryAsync('SELECT id FROM inventory_tb WHERE id = ? AND userId = ? AND deleted = 0', [inventoryId, userId]);
    if (!inventoryCheck.length) {
      return res.json({ code: 1, msg: 'inventory not found', data: null });
    }
    
    // If shelfId is provided, verify that the shelf belongs to the user and the same inventory
    if (shelfId) {
      const shelfCheck = await db.queryAsync('SELECT id FROM shelf_tb WHERE id = ? AND userId = ? AND inventoryId = ?', [shelfId, userId, inventoryId]);
      if (!shelfCheck.length) {
        return res.json({ code: 1, msg: 'shelf not found', data: null });
      }
    }
    
    let query = `
      SELECT * FROM object_tb
      WHERE userId = ? AND inventoryId = ? AND deleted = 0`;
    let params = [userId, inventoryId];
    
    if (shelfId) {
      query += ' AND shelfId = ?';
      params.push(shelfId);
    }
    
    query += ' ORDER BY id DESC';
    
    const result = await db.queryAsync(query, params);
    
    // Get files for each object and build response
    const data = [];
    for (const obj of result) {
      const files = await fileService.getFiles(obj.id, 'object');
      const thumbnail = files[files.length - 1]?.filename;

      data.push({
        ...obj,
        thumbnail: thumbnail,
        images: files.map(file => file && file.filename)
      });
    }
    
    return res.json({ code: 0, msg: '', data });
  } catch (err) {
    console.error(67165, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// Update Object (POST /object/update)
router.put('/update', upload.array('images', 5), async function(req, res) {
  try {
    const body = req.body || {};
    const { id, name, description, quantity, shelfId, deletedImages, barcode } = body;
    if (!id) {
      return res.json({ code: 1, msg: 'id is required', data: null });
    }
    const userId = req.user.id;
    
    // Check if object exists and belongs to user
    const objectCheck = await db.queryAsync('SELECT id, inventoryId FROM object_tb WHERE id = ? AND userId = ? AND deleted = 0', [id, userId]);
    if (!objectCheck.length) {
      return res.json({ code: 1, msg: 'not found', data: null });
    }
    
    // If shelfId is provided, verify that the shelf belongs to the user and the same inventory
    if (shelfId) {
      const shelfCheck = await db.queryAsync('SELECT id FROM shelf_tb WHERE id = ? AND userId = ? AND inventoryId = ?', [shelfId, userId, objectCheck[0].inventoryId]);
      if (!shelfCheck.length) {
        return res.json({ code: 1, msg: 'shelf not found', data: null });
      }
    }
    
    // Handle file deletions
    if(deletedImages) {
      const deletedImagesArr = JSON.parse(deletedImages);
      if(deletedImagesArr[0]) {
        const deletedFileNames = await db.queryAsync(
          'SELECT filename FROM file_tb WHERE id IN (?) AND entityId = ? AND entityType = ?', 
          [JSON.parse(deletedImages), id, 'object']
        );
        const deletedFilenamesArr = deletedFileNames.map(file => file.filename);
        if (deletedFilenamesArr[0]) {
          await fileService.deleteFilesByFilenames(deletedFilenamesArr);
        }
      }
    }

    // Handle new file uploads
    if (req.files && req.files.length > 0) {
      await fileService.insertFiles(id, 'object', req.files, userId, false);
    }

    let updateObj = {
      name: name,
      description: description,
      quantity: quantity,
      shelfId: shelfId || null,
      barcode: barcode || null
    };
    
    await db.queryAsync(`UPDATE object_tb SET ? WHERE id = ? AND userId = ? AND deleted = 0`, [updateObj, id, userId]);

    return res.json({ code: 0, data: { id } });
  } catch (err) {
    console.error(67166, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// Delete Object (POST /object/delete)
router.delete('/delete', async function(req, res) {
  try {
    const { id } = req.body || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required'});
    }
    const userId = req.user.id;

    // Soft delete the object by setting deleted = 1
    const result = await db.queryAsync('UPDATE object_tb SET deleted = 1, deleted_at = NOW() WHERE id = ? AND userId = ?', [id, userId]);
    if (result.affectedRows === 0) {
      return res.json({ code: 4, msg: 'not found' });
    }
    return res.json({ code: 0, data: { id } });
  } catch (err) {
    console.error(67167, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// Update Object Quantity (PATCH /object/quantity)
router.patch('/quantity', async function(req, res) {
  try {
    const { id, quantity } = req.body || {};
    if (!id) {
      return res.json({ code: 1, msg: 'id is required' });
    }
    if (quantity == null) {
      return res.json({ code: 1, msg: 'quantity is required' });
    }
    
    const userId = req.user.id;
    
    // Check if object exists and belongs to user
    const objectCheck = await db.queryAsync('SELECT id FROM object_tb WHERE id = ? AND userId = ? AND deleted = 0', [id, userId]);
    if (!objectCheck.length) {
      return res.json({ code: 1, msg: 'not found' });
    }
    
    await db.queryAsync('UPDATE object_tb SET quantity = ? WHERE id = ? AND userId = ? AND deleted = 0', [quantity, id, userId]);
    
    return res.json({ code: 0, data: { id, quantity } });
  } catch (err) {
    console.error(67170, err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// Suggest objects for autocomplete (GET /object/suggest?term=)
router.get('/suggest', async function(req, res) {
  try {
    const { term } = req.query || {};
    const rawTerm = typeof term === 'string' ? term.trim() : '';
    if (!rawTerm || rawTerm.length < 3) {
      return res.json({ code: 1, msg: 'term must be at least 3 characters' });
    }

    const userId = req.user.id;
    const likeTerm = `${rawTerm}%`;

    const results = await db.queryAsync(
      `
        SELECT id, name, description, barcode, inventoryId, shelfId
        FROM object_tb
        WHERE userId = ? AND name LIKE ? AND deleted = 0
        ORDER BY id DESC
        LIMIT 1
      `,
      [userId, likeTerm]
    );

    return res.json({ code: 0, data: { suggestion: results[0] } });
  } catch (err) {
    console.error('Object suggest error:', err);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

module.exports = router;


