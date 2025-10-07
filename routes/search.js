var express = require('express');
var router = express.Router();
const db = require('../config/database');
const fileService = require('../util/fileService');

router.post('/:inventoryId?', async (req, res) => {
    try {
        const { value } = req.body || {};
        const userId = req.user.id;
        const inventoryId = req.params.inventoryId;
        let result;
        console.log('value', value, 'inventoryId', inventoryId);
        
        // Search for objects
        result = await db.queryAsync(`
                SELECT * FROM object_tb
                WHERE userId = ? AND name LIKE ? ${inventoryId ? `AND inventoryId = ${inventoryId}` : ''}
                ORDER BY id DESC`, [userId, `%${value}%`]);
        
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        
        // Get thumbnail for each object and build response
        const data = await Promise.all(result.results.map(async (obj) => {
            const files = await fileService.getFiles(obj.id, 'object');
            const thumbnail = files.length > 0 ? files[files.length - 1].url : '/uploads/default.png';
            
            return {
                ...obj,
                thumbnail: `${baseUrl}${thumbnail}`
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