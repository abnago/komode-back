const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../util/multerOptions');
const router = express.Router();
const db = require('../config/database');
const urlJoin = require('url-join').default;

const webClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET, // optional for ID token verification
});

// Generate JWT token
const generateToken = (user) => {
  try {
    return jwt.sign(
      { 
        id: user.id, // Database user ID
        googleId: user.googleId,
        email: user.email, 
        name: user.name,
        lastSeen: user.lastSeen
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  } catch (error) {
    console.error(67173, error);
    throw error;
  }
};

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
    const dbUser = await upsert(email, name, googleId, picture);

    // Create user object
    const user = {
      id: dbUser.id,
      googleId: dbUser.googleId,
      email: dbUser.email,
      name: dbUser.name,
      picture,
      lastSeen: dbUser.lastSeen,
    };

    // Generate JWT token
    const jwtToken = generateToken(user);

    return res.json({
      code: 0,
      token: jwtToken,
      user
    });

  } catch (error) {
    console.error(67158, 'Google token verification error:', error);
    return res.status(401).json({ code: 3, msg: 'Token verification failed' });
  }
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // With JWT-only authentication, logout is handled client-side
    // The client should remove the token from storage
    return res.json({ code: 0, message: 'Logged out successfully' });
  } catch (error) {
    console.error(67156, error);
    return res.json({code: 7, msg: "Internal server error"});
  }
});

// Verify token endpoint
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ code: 1, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ code: 0, valid: true, user: decoded });
  } catch (error) {
    console.error(67157, error);
    return res.status(401).json({code: 7, msg: "Token verification failed"});
  }
});

// Get user profile (requires auth middleware)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.queryAsync(`
      SELECT ut.*, ft.filename AS profilePic FROM user_tb AS ut
      LEFT OUTER JOIN file_tb AS ft ON ft.entityType = 'user_profile_pic' AND ft.entityId = ut.id 
      WHERE ut.id = ?
    `, [userId]);
    
    if (!user[0]) {
      return res.json({ code: -1, msg: 'User not found' });
    }
    
    return res.json({
      code: 0,
      data: {
        id: user[0].id,
        profilePic: user[0].profilePic,
        email: user[0].email,
        name: user[0].name,
        googleId: user[0].googleId,
        lastSeen: user[0].lastSeen,
      }
    });
  } catch (error) {
    console.error(67164, error);
    return res.status(500).json({ code: 7, msg: 'Internal server error' });
  }
});

// Update user profile (requires auth middleware)
router.put('/profile', authenticateToken, upload.array('profilePic', 1), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
 
    let updateObj = { name }
    if(req.files && req.files.length > 0) {
      // Insert the file into file_tb
      await db.queryAsync(
        'INSERT INTO file_tb (filename, entityType, entityId, userId) VALUES (?, ?, ?, ?)',
        [req.files[0].filename, 'user_profile_pic', userId, userId]
      );
    }
      
    await db.queryAsync(`UPDATE user_tb SET ? WHERE id = ?`, [updateObj, userId]);
    
    return res.json({ code: 0 });
  } catch (error) {
    console.error(67165, error);
    return res.status(500).json({ code: 7, msg: 'Internal server error' });
  }
});

async function upsert(email, name, googleId) {
  try {
    // First, try to find the user
    const user = await db.queryAsync(
      'SELECT * FROM user_tb WHERE email = ?',
      [email]
    );
    
    let userID;
    if (user[0]) {
      // User exists, update lastSeen and optionally name/googleId
      let updateObj = { lastSeen: new Date() };
      
      if (name) {
        updateObj.name = name;
      }
      if (googleId) {
        updateObj.googleId = googleId;
      }
      
      await db.queryAsync(`UPDATE user_tb SET ? WHERE id = ?`, [updateObj, user[0].id]);
      userID = user[0].id;
    } else {
      // User doesn't exist, create new user with name parsing
      const inserted = await db.queryAsync(
        'INSERT INTO user_tb (email, name, googleId, lastSeen) VALUES (?, ?, ?, NOW())',
        [email, name, googleId]
      );
      userID = inserted.insertId;
    }
    
    const result = await db.queryAsync(
      'SELECT * FROM user_tb WHERE id = ?',
      [userID]
    );
    return result[0]
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

module.exports = router;
