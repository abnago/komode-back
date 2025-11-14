// Load environment variables
require('dotenv').config();
const bootstrap = require('./bootstrap');

var express = require('express');
var path = require('path');
var cors = require('cors');

// Import database connection
const db = require('./config/database');

const inventoryRouter = require('./routes/inventory');
const objectRouter = require('./routes/object');
const shelfRouter = require('./routes/shelf');
const searchRouter = require('./routes/search');
const authRouter = require('./routes/auth');
const deletedsRouter = require('./routes/deleteds');
const { authenticateToken } = require('./middleware/auth');

var app = express();

bootstrap();

// CORS configuration - completely disabled (allows all origins)
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use('/inventory', authenticateToken, inventoryRouter);
app.use('/object', authenticateToken, objectRouter);
app.use('/shelf', authenticateToken, shelfRouter);
app.use('/search', authenticateToken, searchRouter);
app.use('/deleteds', authenticateToken, deletedsRouter);
app.use('/auth', authRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(67180, err);
  return res.json({code: 7, msg: "Internal server error"});
});

// Test database connection on startup
try {
  db.queryAsync('SELECT 1 as test')
    .then(() => {
      console.log('MySQL database connected successfully');
    })
    .catch((err) => {
      console.error('MySQL database connection failed:', err.message);
      process.exit(1);
    });
} catch (error) {
  console.error(67181, error);
  process.exit(1);
}

module.exports = app;
