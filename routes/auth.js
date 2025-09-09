const express = require('express');
const passport = require('passport');
const { generateToken } = require('../config/passport');
const router = express.Router();

// Google OAuth login
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8100';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error(67154, error);
      res.json({code: 7, msg: "Internal server error"});
    }
  }
);

// Logout
router.post('/logout', (req, res) => {
  try {
    req.logout((err) => {
      if (err) {
        console.error(67155, err);
        return res.json({code: 7, msg: "Internal server error"});
      }
      res.json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error(67156, error);
    res.json({code: 7, msg: "Internal server error"});
  }
});

// Verify token endpoint
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    res.json({ valid: true, user: decoded });
  } catch (error) {
    console.error(67157, error);
    res.json({code: 7, msg: "Internal server error"});
  }
});

module.exports = router;
