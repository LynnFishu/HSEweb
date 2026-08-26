// dashboard/backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const pool = require('./config/db');
const workOrderRoutes = require('./routes/workOrders');
const contractorRoutes = require('./routes/contractors');

const app = express();

// If you’re behind a proxy (Cloudflare -> Nginx -> API), this helps Express read X-Forwarded-* correctly.
app.set('trust proxy', true);

// ---- Global request logger (keep first) ----
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request headers:', req.headers);
  next();
});

// ---- CORS ----
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'https://hse.sbd-one.com',
  'https://hseapi.sbd-one.com',
  process.env.FRONTEND_URL || 'https://hse.sbd-one.com'
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'x-user-role',
      'X-User-Role'
    ],
    credentials: true,
    optionsSuccessStatus: 204
  })
);

// ---- Body parser ----
app.use(express.json({ limit: '50mb' }));

// ---- MQTT Setup (Optional for local testing) ----
const MQTT_BROKER = process.env.MQTT_BROKER || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_TOPIC_BASE = 'ppe/detection';

let mqttClient = null;

// Optional: Setup local MQTT broker for testing
if (process.env.ENABLE_MQTT === 'true') {
    try {
        const mqtt = require('mqtt');
        mqttClient = mqtt.connect(`mqtt://${MQTT_BROKER}:${MQTT_PORT}`);
        
        mqttClient.on('connect', () => {
            console.log(`✓ Connected to local MQTT broker: ${MQTT_BROKER}:${MQTT_PORT}`);
            
            // Subscribe to violation topics
            mqttClient.subscribe(`${MQTT_TOPIC_BASE}/no-helmet`);
            mqttClient.subscribe(`${MQTT_TOPIC_BASE}/no-vest`);
            
            console.log('✓ Subscribed to MQTT topics:');
            console.log(`  - ${MQTT_TOPIC_BASE}/no-helmet`);
            console.log(`  - ${MQTT_TOPIC_BASE}/no-vest`);
        });
        
        mqttClient.on('error', (err) => {
            console.error('MQTT Error:', err);
        });
        
        mqttClient.on('message', async (topic, message) => {
            try {
                console.log(`📨 MQTT Message received on ${topic}`);
                
                const violationData = JSON.parse(message.toString());
                console.log('Violation data:', {
                    type: violationData.type,
                    confidence: violationData.confidence,
                    contractor_id: violationData.contractor_id,
                    work_order_id: violationData.work_order_id,
                    timestamp: violationData.timestamp
                });
                
                // Save violation to database
                const { 
                    type, 
                    confidence, 
                    image_url, 
                    contractor_id, 
                    work_order_id,
                    timestamp
                } = violationData;
                
                // Verify work order is approved and belongs to the contractor
                if (work_order_id) {
                    const workOrderCheck = await pool.query(
                        `SELECT status, requested_by, is_active 
                         FROM work_orders 
                         WHERE id = $1`,
                        [work_order_id]
                    );

                    if (!workOrderCheck.rows.length) {
                        console.error('Work order not found:', work_order_id);
                        return;
                    }

                    const workOrder = workOrderCheck.rows[0];
                    if (workOrder.status !== 'Approved') {
                        console.error('Work order not approved:', work_order_id);
                        return;
                    }

                    if (workOrder.is_active === false) {
                        console.error('Work order is deactivated:', work_order_id);
                        return;
                    }

                    if (workOrder.requested_by !== contractor_id) {
                        console.error('Work order does not belong to contractor:', work_order_id, contractor_id);
                        return;
                    }
                }
                
                // Handle timestamp
                let violationTimestamp;
                if (!timestamp) {
                    violationTimestamp = new Date();
                } else {
                    violationTimestamp = new Date(timestamp);
                }
                
                // Insert violation
                const newViolation = await pool.query(
                    `INSERT INTO ppe_violations 
                    (type, confidence, timestamp, image_url, contractor_id, work_order_id, created_at) 
                    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
                    RETURNING id, type, confidence, timestamp, contractor_id, work_order_id, created_at`,
                    [type, confidence, violationTimestamp, image_url, contractor_id, work_order_id]
                );
                
                console.log(`✓ Violation saved from MQTT: ${type} (${confidence}) - ID: ${newViolation.rows[0].id}`);
                
            } catch (error) {
                console.error('Error processing MQTT violation:', error);
            }
        });
        
    } catch (error) {
        console.error('Failed to setup MQTT client:', error);
    }
} else {
    console.log('ℹ️ MQTT disabled - set ENABLE_MQTT=true to enable');
}

// ---- Reusable health handler (NEW) ----
const health = (req, res) => res.json({ message: 'Backend is working!' });

// Expose health at BOTH paths so it works regardless of proxy path rules (NEW)
app.get('/api/test', health);

// ---- Feature routes (already in your code) ----
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/contractors', contractorRoutes);

// Log registered feature routes
console.log('\nRegistered Routes:');
console.log('- /api/work-orders/*');
console.log('- /api/contractors/*');

// ---- Login route available at BOTH paths (NEW) ----
app.post(['/api/login', '/login'], async (req, res) => {
  try {
    const { email, password, workId } = req.body;
    console.log('Login attempt:', { email, workId });

    if (workId) {
      // Contractor login
      const result = await pool.query(
        'SELECT * FROM users WHERE work_id = $1 AND role = $2',
        [workId, 'contractor']
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid work ID' });
      }

      const user = result.rows[0];
      if (user.password_hash !== password) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      delete user.password_hash;
      return res.json(user);
    } else {
      // Admin login
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND role = $2',
        [email, 'admin']
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email' });
      }

      const user = result.rows[0];
      if (user.password_hash !== password) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      delete user.password_hash;
      return res.json(user);
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// ---- Violations: DB check ----
app.get('/api/violations/check', async (req, res) => {
  console.log('Received database check request');
  try {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection test successful');
    } catch (connErr) {
      console.error('Database connection test failed:', connErr);
      return res.status(500).json({
        error: 'Database connection failed',
        details: connErr.message
      });
    }

    console.log('Querying violation count...');
    const countResult = await pool.query('SELECT COUNT(*) FROM ppe_violations');
    const count = parseInt(countResult.rows[0].count, 10);
    console.log('Found', count, 'violations');

    console.log('Querying last violation...');
    const lastResult = await pool.query(`
      SELECT 
        v.id,
        v.type,
        v.confidence,
        v.timestamp,
        v.contractor_id,
        v.work_order_id,
        u.name as contractor_name,
        w.work_order_number
      FROM ppe_violations v
      LEFT JOIN users u ON v.contractor_id = u.id
      LEFT JOIN work_orders w ON v.work_order_id = w.id
      ORDER BY v.timestamp DESC
      LIMIT 1
    `);
    const lastViolation = lastResult.rows[0] || null;

    console.log('Querying statistics...');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE confidence > 0.8) as high_confidence_count,
        COUNT(DISTINCT contractor_id) as unique_contractors,
        COUNT(DISTINCT work_order_id) as unique_work_orders,
        MIN(timestamp) as first_violation_time,
        MAX(timestamp) as last_violation_time
      FROM ppe_violations
    `);

    console.log('Querying recent violations...');
    const recentResult = await pool.query(`
      SELECT DATE_TRUNC('day', timestamp) as day, COUNT(*) as count
      FROM ppe_violations
      WHERE timestamp > NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day DESC
    `);

    res.json({
      status: 'success',
      count,
      lastViolation,
      stats: stats.rows[0],
      recentViolations: recentResult.rows,
      timestamp: new Date(),
      serverTime: new Date()
    });
  } catch (err) {
    console.error('Error checking violations:', err);
    res.status(500).json({
      error: 'Database check failed',
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ---- Violations list ----
app.get('/api/violations', async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      contractor_id,
      work_order_id,
      work_order_number
    } = req.query;

    let query = `
      SELECT 
        v.*,
        u.name as contractor_name,
        u.company_name,
        u.work_id as contractor_work_id,
        w.work_order_number,
        w.status as work_order_status,
        w.description as work_order_description,
        w.submitted_at as work_order_submitted_at
      FROM ppe_violations v
      INNER JOIN users u ON v.contractor_id = u.id 
      INNER JOIN work_orders w ON v.work_order_id = w.id
      WHERE u.role = 'contractor' 
        AND v.contractor_id IS NOT NULL
        AND w.status = 'Approved'
    `;
    const params = [];

    if (start_date) {
      params.push(start_date);
      query += ` AND v.timestamp >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND v.timestamp <= $${params.length}`;
    }
    if (contractor_id) {
      params.push(contractor_id);
      query += ` AND v.contractor_id = $${params.length}`;
    }
    if (work_order_id) {
      params.push(work_order_id);
      query += ` AND v.work_order_id = $${params.length}`;
    }

    query += ' ORDER BY v.timestamp DESC';

    const violations = await pool.query(query, params);
    res.json(violations.rows);
  } catch (err) {
    console.error('Error fetching violations:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Add violation ----
app.post('/api/violations', async (req, res) => {
  try {
    console.log('\n=== Violation Request Start ===');
    console.log('Time:', new Date().toISOString());
    console.log('Headers:', req.headers);
    console.log(
      'Body:',
      JSON.stringify(
        {
          ...req.body,
          image_url: req.body.image_url
            ? `${req.body.image_url.substring(0, 50)}...`
            : null
        },
        null,
        2
      )
    );

    const {
      type,
      confidence,
      image_url,
      contractor_id,
      work_order_id,
      work_order_number,
      contractor_name,
      company_name,
      timestamp,
      location,
      site_location
    } = req.body;

    if (work_order_id) {
      const workOrderCheck = await pool.query(
        `SELECT status, requested_by, is_active 
         FROM work_orders 
         WHERE id = $1`,
        [work_order_id]
      );

      if (!workOrderCheck.rows.length) {
        return res.status(400).json({ error: 'Work order not found' });
      }

      const workOrder = workOrderCheck.rows[0];
      if (workOrder.status !== 'Approved') {
        return res.status(400).json({ error: 'Work order not approved' });
      }

      if (workOrder.is_active === false) {
        return res.status(400).json({ error: 'Work order is deactivated' });
      }

      if (workOrder.requested_by !== contractor_id) {
        return res
          .status(400)
          .json({ error: 'Work order does not belong to this contractor' });
      }
    } else {
      return res.status(400).json({ error: 'Work order ID is required' });
    }

    if (!type || confidence === undefined) {
      console.error('Missing required fields:', { type, confidence });
      return res
        .status(400)
        .json({ error: 'Missing required fields: type and confidence are required' });
    }

    if (typeof confidence !== 'number') {
      console.error('Invalid confidence value:', confidence);
      return res.status(400).json({ error: 'Confidence must be a number' });
    }

    let violationTimestamp;
    try {
      if (!timestamp) {
        violationTimestamp = new Date();
      } else if (typeof timestamp === 'number') {
        const ts = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
        violationTimestamp = new Date(ts);
      } else {
        violationTimestamp = new Date(timestamp);
      }

      if (isNaN(violationTimestamp.getTime())) {
        throw new Error('Invalid timestamp');
      }

      const year = violationTimestamp.getFullYear();
      const currentYear = new Date().getFullYear();
      if (year < 2020 || year > currentYear + 1) {
        console.error('Invalid year in timestamp:', year);
        throw new Error('Invalid year in timestamp');
      }

      console.log('Processed timestamp:', {
        input: timestamp,
        parsed: violationTimestamp,
        iso: violationTimestamp.toISOString()
      });
    } catch (error) {
      console.error('Timestamp processing error:', error);
      console.error('Original timestamp:', timestamp);
      return res.status(400).json({
        error: 'Invalid timestamp format',
        details: error.message,
        received: timestamp
      });
    }

    console.log('Inserting violation with data:', {
      type,
      confidence,
      timestamp: violationTimestamp,
      contractor_id,
      work_order_id,
      image_url: image_url ? 'present' : 'missing'
    });

    const params = [
      type,
      confidence,
      violationTimestamp,
      image_url,
      contractor_id,
      work_order_id
    ];
    console.log('SQL Parameters:', params);

    const newViolation = await pool.query(
      `INSERT INTO ppe_violations 
       (type, confidence, timestamp, image_url, contractor_id, work_order_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
       RETURNING id, type, confidence, timestamp, contractor_id, work_order_id, created_at`,
      params
    );

    console.log('Violation saved successfully:', {
      id: newViolation.rows[0].id,
      type: newViolation.rows[0].type,
      confidence: newViolation.rows[0].confidence,
      timestamp: newViolation.rows[0].timestamp,
      contractor_id: newViolation.rows[0].contractor_id,
      work_order_id: newViolation.rows[0].work_order_id
    });

    console.log('Database response:', newViolation.rows[0]);

    res.json(newViolation.rows[0]);
  } catch (err) {
    console.error('Error recording violation:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Graceful shutdown ----
process.on('SIGINT', () => {
  console.log('\n Shutting down server...');
  if (mqttClient) {
    mqttClient.end();
    console.log('MQTT client disconnected');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n Shutting down server...');
  if (mqttClient) {
    mqttClient.end();
    console.log('MQTT client disconnected');
  }
  process.exit(0);
});

// ---- Server start ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('=====================================');
  console.log(`Server running on port ${PORT}`);
  console.log('Database config:', {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    port: process.env.DB_PORT
  });
  console.log('MQTT config:', {
    broker: MQTT_BROKER,
    port: MQTT_PORT,
    enabled: process.env.ENABLE_MQTT === 'true',
    topics: [`${MQTT_TOPIC_BASE}/no-helmet`, `${MQTT_TOPIC_BASE}/no-vest`]
  });
  console.log('=====================================');
});
