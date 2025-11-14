const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const db = require('../config/database');

// Get file by filename (GET /files/:filename)
router.get('/:filename', async function(req, res) {
  try {
    const { filename } = req.params;
    const userId = req.user.id;

    if (!filename) {
      return res.status(400).json({ code: 1, msg: 'filename is required', data: null });
    }

    // Check if the file belongs to the user
    const fileCheck = await db.queryAsync(`
      SELECT id, filename, entityId, entityType FROM file_tb 
      WHERE filename = ? AND userId = ?
    `, [filename, userId]);

    if (!fileCheck.length) {
      return res.status(404).json({ code: 1, msg: 'file not found or access denied', data: null });
    }

    // Build file path
    const filePath = path.join(__dirname, '../uploads', filename);

    // Send file
    return res.sendFile(filePath);
  } catch (error) {
    console.error(67200, error);
    return res.status(500).json({ code: 7, msg: 'Internal server error' });
  }
});

module.exports = router;

