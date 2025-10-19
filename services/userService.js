const db = require('../config/database');

class UserService {
  /**
   * Find user by email
   * @param {string} email - User's email address
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findByEmail(email) {
    try {
      const results = await db.queryAsync(
        'SELECT * FROM user_tb WHERE email = ?',
        [email]
      );
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {string} email - User's email address
   * @param {string} name - User's display name
   * @param {string} googleId - User's Google ID
   * @returns {Promise<Object>} Created user object
   */
  async create(email, name, googleId) {
    try {
      const results = await db.queryAsync(
        'INSERT INTO user_tb (email, name, googleId, lastSeen) VALUES (?, ?, ?, NOW())',
        [email, name, googleId]
      );
      
      // Return the created user
      return await this.findById(results.insertId);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User's ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findById(id) {
    try {
      const results = await db.queryAsync(
        'SELECT * FROM user_tb WHERE id = ?',
        [id]
      );
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Update user's lastSeen timestamp and optionally name/googleId
   * @param {string} email - User's email address
   * @param {string} name - User's display name (optional)
   * @param {string} googleId - User's Google ID (optional)
   * @returns {Promise<Object>} Updated user object
   */
  async updateLastSeen(email, name = null, googleId = null) {
    try {
      let updateQuery = 'UPDATE user_tb SET lastSeen = NOW()';
      let params = [];
      
      if (name) {
        updateQuery += ', name = ?';
        params.push(name);
      }
      
      if (googleId) {
        updateQuery += ', googleId = ?';
        params.push(googleId);
      }
      
      updateQuery += ' WHERE email = ?';
      params.push(email);
      
      await db.queryAsync(updateQuery, params);
      
      // Return the updated user
      return await this.findByEmail(email);
    } catch (error) {
      console.error('Error updating lastSeen:', error);
      throw error;
    }
  }

  /**
   * Upsert user - create if doesn't exist, update lastSeen if exists
   * @param {string} email - User's email address
   * @param {string} name - User's display name
   * @param {string} googleId - User's Google ID
   * @returns {Promise<Object>} User object
   */
  async upsert(email, name, googleId) {
    try {
      // First, try to find the user
      let user = await this.findByEmail(email);
      
      if (user) {
        // User exists, update lastSeen and optionally name/googleId
        user = await this.updateLastSeen(email, name, googleId);
      } else {
        // User doesn't exist, create new user
        user = await this.create(email, name, googleId);
      }
      
      return user;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
