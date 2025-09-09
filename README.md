# Komode Backend

A Node.js Express backend with MySQL database integration.

## Features

- Express.js web framework
- MySQL database with connection pooling
- Environment variable configuration
- Global database access with `queryAsync` function

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Configuration

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=komode
DB_PORT=3306
```

### 3. MySQL Database

Make sure MySQL is running and create the database:

```sql
CREATE DATABASE komode;
```

### 4. Start the Server

```bash
npm start
```

## Database Usage

The database connection is available globally as `global.db` with the following methods:

### queryAsync(sql, params)

Execute a SQL query and return a promise:

```javascript
// Example in a route
router.get('/users', async (req, res) => {
  try {
    const result = await global.db.queryAsync('SELECT * FROM users WHERE id = ?', [userId]);
    res.json(result.results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### getConnection()

Get a connection from the pool:

```javascript
const connection = await global.db.getConnection();
// Use connection...
connection.release();
```

### getPoolStats()

Get connection pool statistics:

```javascript
const stats = global.db.getPoolStats();
console.log(stats);
```

## API Endpoints

- `GET /` - Home page
- `GET /test-db` - Test database connection

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | MySQL host |
| DB_USER | root | MySQL username |
| DB_PASSWORD | (empty) | MySQL password |
| DB_NAME | komode | Database name |
| DB_PORT | 3306 | MySQL port |
