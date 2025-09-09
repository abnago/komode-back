var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET database test endpoint. */
router.get('/test-db', async function(req, res, next) {
  try {
    const result = await global.db.queryAsync('SELECT NOW() as current_time, ? as test_param', ['Hello MySQL!']);
    res.json({
      success: true,
      message: 'Database connection successful',
      data: result.results[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

module.exports = router;
