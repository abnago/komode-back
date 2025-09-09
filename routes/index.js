var express = require('express');
var router = express.Router();
const db = require('../config/database');

/* GET home page. */
router.get('/', function(req, res, next) {
  try {
    res.render('index', { title: 'Express' });
  } catch (error) {
    console.error(67151, error);
    res.json({code: 7, msg: "Internal server error"});
  }
});

/* GET database test endpoint. */
router.get('/test-db', async function(req, res, next) {
  try {
    const result = await db.queryAsync('SELECT NOW() as current_time, ? as test_param', ['Hello MySQL!']);
    res.json({ code: 0, msg: '', data: result.results[0] });
  } catch (error) {
    console.error(67152, error);
    res.json({code: 7, msg: "Internal server error"});
  }
});

module.exports = router;
