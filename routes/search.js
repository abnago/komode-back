var express = require('express');
var router = express.Router();
const db = require('../config/database');
const fileService = require('../util/fileService');
const urlJoin = require('url-join');

router.post('/:inventoryId?', async (req, res) => {
    try {
        const { value } = req.body || {};
        const userId = req.user.id;
        const inventoryId = req.params.inventoryId;
        let result;
        
        // Search for objects
        result = await db.queryAsync(`
                SELECT * FROM object_tb
                WHERE userId = ? AND name LIKE ? ${inventoryId ? `AND inventoryId = ${inventoryId}` : ''}
                ORDER BY id DESC`, [userId, `%${value}%`]);
            
        // Get thumbnail for each object and build response
        const data = await Promise.all(result.map(async (obj) => {
            const files = await fileService.getFiles(obj.id, 'object');
            const thumbnail = files[files.length - 1]?.filename;
            
            return {
                ...obj,
                thumbnail: thumbnail ? urlJoin(process.env.UPLOAD_URL, thumbnail) : null
            };
        }));
        console.log('data ', data);
        res.json({ code: 0, msg: '', data });
    } catch (err) {
        console.error(67190, err);
        res.json({ code: 7, msg: "Internal server error" });
    }
});

module.exports = router;