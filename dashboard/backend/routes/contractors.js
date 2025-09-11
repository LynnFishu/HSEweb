const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// List all contractors
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, company_name, work_id
             FROM users
             WHERE role = 'contractor'
             ORDER BY name ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching contractors:', err);
        res.status(500).json({ error: 'Failed to fetch contractors', details: err.message });
    }
});

// Register new contractor
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, companyName, workId } = req.body;
        console.log('Registering new contractor:', { email, name, companyName, workId });

        // Check if email already exists
        const emailCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check if work ID already exists
        const workIdCheck = await pool.query(
            'SELECT id FROM users WHERE work_id = $1',
            [workId]
        );
        if (workIdCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Work ID already in use' });
        }

        // Insert new user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, role, name, company_name, work_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, role, name, company_name, work_id`,
            [email, password, 'contractor', name, companyName, workId]
        );

        console.log('Registered new contractor:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed', details: err.message });
    }
});

// Check Work ID
router.get('/check-workid/:workId', async (req, res) => {
    try {
        const { workId } = req.params;
        console.log('Checking work ID:', workId);

        // First check if the work ID exists
        const userCheck = await pool.query(
            'SELECT id, name, company_name, email, work_id FROM users WHERE work_id = $1 AND role = $2',
            [workId, 'contractor']
        );

        if (userCheck.rows.length === 0) {
            console.log('Work ID not found:', workId);
            return res.json({ 
                exists: false,
                message: 'Work ID not found'
            });
        }

        const user = userCheck.rows[0];
        console.log('Work ID found:', user);

        // Get active work orders for this contractor
        const workOrders = await pool.query(
            'SELECT id, work_order_number, status FROM work_orders WHERE requested_by = $1 AND status = $2',
            [user.id, 'Approved']
        );

        res.json({
            exists: true,
            name: user.name,
            companyName: user.company_name,
            email: user.email,
            workId: user.work_id,
            activeWorkOrders: workOrders.rows
        });
    } catch (err) {
        console.error('Work ID check error:', err);
        res.status(500).json({ 
            error: 'Failed to check work ID',
            details: err.message 
        });
    }
});

// Get contractor by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, name, email, company_name, work_id FROM users WHERE id = $1 AND role = $2',
            [id, 'contractor']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contractor not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching contractor:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;