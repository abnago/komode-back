const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const googleId = profile.id;
    
    // Upsert user in database (create if new, update lastSeen if exists)
    const dbUser = await userService.upsert(email, name, googleId);
    
    // Return user object with both Google profile data and database info
    const user = {
      id: dbUser.id, // Use database ID instead of Google ID
      googleId: dbUser.googleId,
      email: dbUser.email,
      name: dbUser.name,
      picture: profile.photos[0].value,
      lastSeen: dbUser.lastSeen
    };
    
    return done(null, user);
  } catch (error) {
    console.error(67170, error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  try {
    done(null, user);
  } catch (error) {
    console.error(67171, error);
    done(error, null);
  }
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  try {
    done(null, user);
  } catch (error) {
    console.error(67172, error);
    done(error, null);
  }
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

module.exports = { passport, generateToken };
