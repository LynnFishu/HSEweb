
none -- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'contractor')),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    work_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create work_orders table if not exists
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    requested_by INTEGER REFERENCES users(id),
    description TEXT,
    site_location JSONB,
    status VARCHAR(50) DEFAULT 'Pending',
    rejection_reason TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create site_locations table if not exists
CREATE TABLE IF NOT EXISTS site_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL,
    longitude DECIMAL,
    address TEXT,
    work_order_id INTEGER REFERENCES work_orders(id)
);

-- Create ppe_violations table if not exists
CREATE TABLE IF NOT EXISTS ppe_violations (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    confidence DECIMAL NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    image_url TEXT,
    contractor_id INTEGER REFERENCES users(id),
    work_order_id INTEGER REFERENCES work_orders(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create login_history table if not exists
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    user_role VARCHAR(50),
    user_email VARCHAR(255),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index for contractor work_ids
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractor_work_id 
ON users (work_id) 
WHERE role = 'contractor';

-- Insert default admin user if not exists
INSERT INTO users (email, password_hash, role, name, company_name)
SELECT 'admin@example.com', 'admin', 'admin', 'Admin User', 'HSE Admin'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@example.com'
);
