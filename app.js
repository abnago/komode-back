// Load environment variables
require('dotenv').config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var cors = require('cors');

// Import database connection
const db = require('./config/database');

var inventoryRouter = require('./routes/inventory');
var objectRouter = require('./routes/object');
var shelfRouter = require('./routes/shelf');
var searchRouter = require('./routes/search');
var authRouter = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
var { __dirname } = require("./util/multerOptions");

var app = express();

// CORS configuration - completely disabled (allows all origins)
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use('/inventory', authenticateToken, inventoryRouter);
app.use('/object', authenticateToken, objectRouter);
app.use('/shelf', authenticateToken, shelfRouter);
app.use('/search', authenticateToken, searchRouter);
app.use('/auth', authRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(67180, err);
  res.json({code: 7, msg: "Internal server error"});
});

// Test database connection on startup
try {
  db.queryAsync('SELECT 1 as test')
    .then(() => {
      console.log('✅ MySQL database connected successfully');
    })
    .catch((err) => {
      console.error('❌ MySQL database connection failed:', err.message);
      process.exit(1);
    });
} catch (error) {
  console.error(67181, error);
  process.exit(1);
}

module.exports = app;
