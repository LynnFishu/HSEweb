const { Pool } = require('pg');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { 
        ca: fs.readFileSync('/home/ubuntu/rds-certs/ap-southeast-5-bundle.pem','utf8'),
    rejectUnauthorized: true
    }
};

console.log('Initializing database connection with config:', {
    ...config,
    password: '***' // Don't log the actual password
});

const pool = new Pool(config);

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
    }
});

module.exports = pool;
