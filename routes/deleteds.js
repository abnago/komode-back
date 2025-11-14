const express = require('express');
const router = express.Router();
const db = require('../config/database');
const fileService = require('../util/fileService');

// GET /deleteds/list
// Returns deleted inventories and objects for the authenticated user
router.get('/list', async function(req, res) {
  try {
    const userId = req.user.id;

    const inventories = await db.queryAsync(
      `
        SELECT id, name, description, deleted_at 
        FROM inventory_tb 
        WHERE userId = ? AND deleted = 1
        ORDER BY deleted_at DESC, id DESC
      `,
      [userId]
    );

    const objects = await db.queryAsync(
      `
        SELECT id, name, description, deleted_at, inventoryId, shelfId 
        FROM object_tb 
        WHERE userId = ? AND deleted = 1
        ORDER BY deleted_at DESC, id DESC
      `,
      [userId]
    );

    return res.json({
      code: 0,
      msg: '',
      data: {
        inventories,
        objects
      }
    });
  } catch (err) {
    console.error('Deleteds list error:', err);
    return res.json({ code: 7, msg: 'Internal server error' });
  }
});

// POST /deleteds/restore
// Body: { type: 'inventory' | 'object', id: number }
router.post('/restore', async function(req, res) {
  try {
    const { type, id } = req.body || {};
    if (!type || !id) {
      return res.json({ code: 1, msg: 'type and id are required', data: null });
    }
    const userId = req.user.id;

    if (type === 'inventory') {
      const result = await db.queryAsync(
        'UPDATE inventory_tb SET deleted = 0, deleted_at = NULL WHERE id = ? AND userId = ? AND deleted = 1',
        [id, userId]
      );
      if (result.affectedRows === 0) {
        return res.json({ code: 1, msg: 'not found or not deleted', data: null });
      }
    } else if (type === 'object') {
      const result = await db.queryAsync(
        'UPDATE object_tb SET deleted = 0, deleted_at = NULL WHERE id = ? AND userId = ? AND deleted = 1',
        [id, userId]
      );
      if (result.affectedRows === 0) {
        return res.json({ code: 1, msg: 'not found or not deleted', data: null });
      }
    } else {
      return res.json({ code: 1, msg: 'invalid type', data: null });
    }

    return res.json({ code: 0, msg: '', data: { id, type } });
  } catch (err) {
    console.error('Deleteds restore error:', err);
    return res.json({ code: 7, msg: 'Internal server error' });
  }
});

// DELETE /deleteds/forever
// Body: { type: 'inventory' | 'object', id: number }
router.delete('/forever', async function(req, res) {
  try {
    const { type, id } = req.body || {};
    if (!type || !id) {
      return res.json({ code: 1, msg: 'type and id are required' });
    }
    const userId = req.user.id;

    if (type === 'object') {
      // Delete object files and the object itself
      await fileService.deleteEntityFiles(id, 'object');
      const result = await db.queryAsync(
        'DELETE FROM object_tb WHERE id = ? AND userId = ? AND deleted = 1',
        [id, userId]
      );
      if (result.affectedRows === 0) {
        return res.json({ code: 4, msg: 'not found' });
      }
    } else if (type === 'inventory') {
      // Delete all deleted objects under this inventory for this user (and their files)
      const objs = await db.queryAsync(
        'SELECT id FROM object_tb WHERE userId = ? AND inventoryId = ? AND deleted = 1',
        [userId, id]
      );
      for (const obj of objs) {
        await fileService.deleteEntityFiles(obj.id, 'object');
      }
      await db.queryAsync(
        'DELETE FROM object_tb WHERE userId = ? AND inventoryId = ? AND deleted = 1',
        [userId, id]
      );

      // Finally delete the inventory itself (only if deleted flag is set)
      const invRes = await db.queryAsync(
        'DELETE FROM inventory_tb WHERE id = ? AND userId = ? AND deleted = 1',
        [id, userId]
      );
      if (invRes.affectedRows === 0) {
        return res.json({ code: 4, msg: 'not found' });
      }
    } else {
      return res.json({ code: 1, msg: 'invalid type' });
    }

    return res.json({ code: 0, msg: '', data: { id, type } });
  } catch (err) {
    console.error('Deleteds forever error:', err);
    return res.json({ code: 7, msg: 'Internal server error' });
  }
});

// DELETE /deleteds/forever-all
// Permanently delete all deleted inventories and objects for this user
router.delete('/forever-all', async function(req, res) {
  try {
    const userId = req.user.id;

    // Collect and delete files for all deleted objects of this user
    const deletedObjects = await db.queryAsync(
      'SELECT id FROM object_tb WHERE userId = ? AND deleted = 1',
      [userId]
    );
    for (const obj of deletedObjects) {
      await fileService.deleteEntityFiles(obj.id, 'object');
    }
    await db.queryAsync('DELETE FROM object_tb WHERE userId = ? AND deleted = 1', [userId]);

    // Delete all deleted inventories for this user
    await db.queryAsync('DELETE FROM inventory_tb WHERE userId = ? AND deleted = 1', [userId]);

    return res.json({ code: 0, msg: '', data: { deletedObjects: deletedObjects.length } });
  } catch (err) {
    console.error('Deleteds forever-all error:', err);
    return res.json({ code: 7, msg: 'Internal server error' });
  }
});

module.exports = router;


