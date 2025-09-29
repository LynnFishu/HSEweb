require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
	port: process.env.DB_PORT,
	ssl: { ca: fs.readFileSync('etc/ssl/rds/ap-southeast-5-bundle.pem','utf8')}
});

(async () => {
	try {
		await pool.query('BEGIN');
		await pool.query(`
			ALTER TABLE work_orders
			ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
		`);
		await pool.query('COMMIT');
		console.log('Added is_active to work_orders');
	} catch (e) {
		await pool.query('ROLLBACK');
		console.error('Migration failed:', e);
		process.exit(1);
	} finally {
		await pool.end();
	}
})();
