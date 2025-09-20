var express = require('express');
var router = express.Router();
const db = require('../config/database');

router.post('/:inventoryId?', async (req, res) => {
    try {
        const { value } = req.body || {};
        const userId = req.user.id;
        const inventoryId = req.params.inventoryId;
        let result;
        console.log('value', value, 'inventoryId', inventoryId);
        result = await db.queryAsync(`
                SELECT *,
                CASE 
                WHEN JSON_LENGTH(images) > 0 
                THEN JSON_UNQUOTE(
                    JSON_EXTRACT(images, CONCAT('$[', JSON_LENGTH(images) - 1, ']'))
                )
                ELSE NULL
                END AS thumbnail
                FROM object_tb
                WHERE userId = ? AND name LIKE ? ${inventoryId ? `AND inventoryId = ${inventoryId}` : ''}
                ORDER BY id DESC;`, [userId, `%${value}%`]);
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const data = result.results.map(obj => ({
            ...obj,
            thumbnail: `${baseUrl}${obj.thumbnail || '/uploads/default.png'}`,
        }));
        res.json({ code: 0, msg: '', data });
    } catch (err) {
        console.error(67190, err);
        res.json({ code: 7, msg: "Internal server error" });
    }
});

module.exports = router;