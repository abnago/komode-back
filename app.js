// Load environment variables
require('dotenv').config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// Import database connection
const db = require('./config/database');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// Add database to global object
global.db = db;

// Test database connection on startup
db.queryAsync('SELECT 1 as test')
  .then(() => {
    console.log('✅ MySQL database connected successfully');
  })
  .catch((err) => {
    console.error('❌ MySQL database connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
