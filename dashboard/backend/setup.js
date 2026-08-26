// Simple setup script for local development
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

console.log('🔧 Setting up HSE Dashboard for local development...\n');

// Step 1: Copy environment file
console.log('1. Setting up environment...');
try {
    const envLocalhostPath = path.join(__dirname, 'env.localhost');
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envLocalhostPath)) {
        fs.copyFileSync(envLocalhostPath, envPath);
        console.log('   ✅ Environment file copied to .env');
    } else {
        console.log('   ❌ env.localhost file not found');
    }
} catch (error) {
    console.error('   ❌ Error copying environment file:', error);
}

// Step 2: Setup database
console.log('\n2. Setting up database...');
console.log('   Make sure PostgreSQL is running on localhost:5432');
console.log('   Default credentials: postgres/password\n');

const config = {
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'password',
    port: 5432,
    ssl: false
};

async function setupDatabase() {
    const pool = new Pool(config);
    
    try {
        // Create database
        await pool.query('CREATE DATABASE hse_dashboard');
        console.log('   ✅ Database "hse_dashboard" created');
    } catch (error) {
        if (error.code === '42P04') {
            console.log('   ✅ Database "hse_dashboard" already exists');
        } else {
            console.error('   ❌ Error creating database:', error.message);
            console.log('   💡 Make sure PostgreSQL is running and credentials are correct');
            return;
        }
    }
    
    await pool.end();
    
    // Connect to new database and create tables
    const dbConfig = { ...config, database: 'hse_dashboard' };
    const dbPool = new Pool(dbConfig);
    
    try {
        // Create tables
        const sqlSchema = fs.readFileSync('./migrations/create_tables.sql', 'utf8');
        await dbPool.query(sqlSchema);
        console.log('   ✅ Tables created successfully');
        
        // Create test users
        await dbPool.query(`
            INSERT INTO users (email, password_hash, role, name, company_name)
            VALUES ('admin@example.com', 'admin', 'admin', 'Admin User', 'HSE Admin')
            ON CONFLICT (email) DO NOTHING
        `);
        
        await dbPool.query(`
            INSERT INTO users (email, password_hash, role, name, company_name, work_id)
            VALUES ('contractor@test.com', 'contractor123', 'contractor', 'Test Contractor', 'Test Company', 'CONT-2025-001')
            ON CONFLICT (work_id) DO NOTHING
        `);
        
        // Create test work order
        const contractorResult = await dbPool.query('SELECT id FROM users WHERE work_id = $1', ['CONT-2025-001']);
        if (contractorResult.rows.length > 0) {
            await dbPool.query(`
                INSERT INTO work_orders (work_order_number, company_name, requested_by, description, status, is_active)
                VALUES ('WO-2025-001', 'Test Company', $1, 'Test work order for localhost testing', 'Approved', true)
                ON CONFLICT (work_order_number) DO NOTHING
            `, [contractorResult.rows[0].id]);
        }
        
        console.log('   ✅ Test users and data created');
        
    } catch (error) {
        console.error('   ❌ Error setting up database:', error);
    } finally {
        await dbPool.end();
    }
}

setupDatabase().then(() => {
    console.log('\n🎉 Setup complete!');
    console.log('\n📝 Login Credentials:');
    console.log('   Admin: admin@example.com / admin');
    console.log('   Contractor: CONT-2025-001 / contractor123');
    console.log('\n🚀 Next steps:');
    console.log('   1. Start backend: node server.js');
    console.log('   2. Start frontend: cd ../ && npm run dev');
    console.log('   3. Open: http://localhost:5173');
});

