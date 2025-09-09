const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ code: 1, msg: 'Access token required', data: null });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        console.error(67168, err);
        return res.status(403).json({ code: 1, msg: 'Invalid or expired token', data: null });
      }
      
      req.user = user;
      next();
    });
  } catch (error) {
    console.error(67169, error);
    res.json({code: 7, msg: "Internal server error"});
  }
};

module.exports = { authenticateToken };
