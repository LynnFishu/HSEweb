const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all work orders with user details
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                w.*,
                u.name as requester_name,
                u.email as requester_email,
                u.company_name as requester_company,
                u.work_id as requester_work_id
             FROM work_orders w 
             LEFT JOIN users u ON w.requested_by = u.id 
             ORDER BY w.submitted_at DESC`
        );
        console.log('Fetched work orders:', result.rows);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching work orders:', error);
        res.status(500).json({ error: 'Failed to fetch work orders' });
    }
});

// Create new work order
router.post('/', async (req, res) => {
    const {
        work_order_number,
        company_name,
        requested_by,
        description,
        site_location
    } = req.body;

    console.log('Received work order request:', req.body);

    try {
        // Start a transaction
        await pool.query('BEGIN');

        // Insert work order
        const workOrderResult = await pool.query(
            `INSERT INTO work_orders 
             (work_order_number, company_name, requested_by, description, site_location, status) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [work_order_number, company_name, requested_by, description, site_location, 'Pending']
        );

        const newWorkOrder = workOrderResult.rows[0];

        // If site location is provided, add it to site_locations table
        if (site_location && site_location.name) {
            await pool.query(
                `INSERT INTO site_locations 
                 (name, latitude, longitude, address, work_order_id) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    site_location.name,
                    parseFloat(site_location.lat) || 0,
                    parseFloat(site_location.lng) || 0,
                    site_location.address,
                    newWorkOrder.id
                ]
            );
        }

        // Commit transaction
        await pool.query('COMMIT');

        // Fetch the complete work order with user details
        const result = await pool.query(
            `SELECT 
                w.*,
                u.name as requester_name,
                u.email as requester_email,
                u.company_name as requester_company,
                u.work_id as requester_work_id
             FROM work_orders w 
             LEFT JOIN users u ON w.requested_by = u.id 
             WHERE w.id = $1`,
            [newWorkOrder.id]
        );

        console.log('Created work order:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error creating work order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update work order status
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    try {
        const result = await pool.query(
            `UPDATE work_orders 
             SET status = $1, 
                 rejection_reason = $2, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3 
             RETURNING *`,
            [status, rejection_reason, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Work order not found' });
        }
        
        // Fetch the complete work order with user details
        const completeResult = await pool.query(
            `SELECT 
                w.*,
                u.name as requester_name,
                u.email as requester_email,
                u.company_name as requester_company,
                u.work_id as requester_work_id
             FROM work_orders w 
             LEFT JOIN users u ON w.requested_by = u.id 
             WHERE w.id = $1`,
            [id]
        );

        console.log('Updated work order:', completeResult.rows[0]);
        res.json(completeResult.rows[0]);
    } catch (error) {
        console.error('Error updating work order status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Toggle is_active flag for a work order
router.put('/:id/active', async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    try {
        const result = await pool.query(
            `UPDATE work_orders
             SET is_active = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [is_active, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Work order not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error toggling work order active state:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get work orders for a specific user
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        // Verify the user exists (allow admin or contractor)
        const userCheck = await pool.query(
            'SELECT id, role FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const result = await pool.query(
            `SELECT 
                w.*,
                u.name as requester_name,
                u.email as requester_email,
                u.company_name as requester_company,
                u.work_id as requester_work_id
             FROM work_orders w 
             LEFT JOIN users u ON w.requested_by = u.id 
             WHERE w.requested_by = $1 
             ORDER BY w.submitted_at DESC`,
            [userId]
        );
        console.log('Fetched user work orders:', result.rows);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user work orders:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;