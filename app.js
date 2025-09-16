// Load environment variables
require('dotenv').config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var cors = require('cors');

// Import database connection
const db = require('./config/database');

// Import passport configuration
const { passport } = require('./config/passport');

var inventoryRouter = require('./routes/inventory');
var objectRouter = require('./routes/object');
var authRouter = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
var { __dirname } = require("./util/multerOptions");

var app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8100',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use('/inventory', authenticateToken, inventoryRouter);
app.use('/object', authenticateToken, objectRouter);
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
