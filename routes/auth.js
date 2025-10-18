const express = require('express');
const passport = require('passport');
const { generateToken } = require('../config/passport');
const { OAuth2Client } = require('google-auth-library');
const userService = require('../services/userService');
const router = express.Router();

const webClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID, // <— correct way
  clientSecret: process.env.GOOGLE_CLIENT_SECRET, // optional for ID token verification
});

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
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error(67154, error);
      res.json({code: 7, msg: "Internal server error"});
    }
  }
);

router.post('/google/verify', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ code: 1, msg: 'ID token is required' });
    }

    // Verify the token with Google
    const ticket = await webClient.verifyIdToken({
      idToken,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(401).json({ code: 2, msg: 'Invalid token' });
    }

    // Extract user info from Google token
    const email = payload.email;
    const name = payload.name;
    const googleId = payload.sub;
    const picture = payload.picture;

    // Upsert user in database
    const dbUser = await userService.upsert(email, name, googleId);

    // Create user object
    const user = {
      id: dbUser.id,
      googleId: dbUser.googleId,
      email: dbUser.email,
      name: dbUser.name,
      picture: picture,
      lastSeen: dbUser.lastSeen
    };

    // Generate JWT token
    const jwtToken = generateToken(user);
    console.log(user);

    res.json({
      code: 0,
      token: jwtToken,
      user: user
    });

  } catch (error) {
    console.error(67158, 'Google token verification error:', error);
    res.status(401).json({ code: 3, msg: 'Token verification failed' });
  }
});

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    console.error(67157, error);
    res.json({code: 7, msg: "Internal server error"});
  }
});

module.exports = router;
