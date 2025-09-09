var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  try {
    res.send('respond with a resource');
  } catch (error) {
    console.error(67153, error);
    res.json({code: 7, msg: "Internal server error"});
  }
});

module.exports = router;
