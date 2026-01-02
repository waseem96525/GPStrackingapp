const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Database setup
const db = new sqlite3.Database('./gps_tracking.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('✓ Database connected');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                phone_number TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating vehicles table:', err);
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                speed REAL DEFAULT 0,
                accuracy REAL,
                altitude REAL,
                heading REAL,
                battery_level INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES vehicles(device_id)
            )
        `, (err) => {
            if (err) console.error('Error creating locations table:', err);
        });

        db.run(`
            CREATE INDEX IF NOT EXISTS idx_device_timestamp 
            ON locations(device_id, timestamp DESC)
        `, (err) => {
            if (err) console.error('Error creating index:', err);
            else console.log('✓ Database tables initialized');
        });
    });
}

// WebSocket connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// API Routes

// Register a new vehicle
app.post('/api/vehicles/register', (req, res) => {
    const { device_id, name, phone_number } = req.body;
    
    if (!device_id || !name) {
        return res.status(400).json({ error: 'device_id and name are required' });
    }

    db.run(
        'INSERT INTO vehicles (device_id, name, phone_number) VALUES (?, ?, ?)',
        [device_id, name, phone_number],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ error: 'Device already registered' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ 
                success: true, 
                vehicle_id: this.lastID,
                device_id: device_id 
            });
        }
    );
});

// Get all vehicles
app.get('/api/vehicles', (req, res) => {
    db.all('SELECT * FROM vehicles ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Update GPS location
app.post('/api/location', (req, res) => {
    const { 
        device_id, 
        latitude, 
        longitude, 
        speed, 
        accuracy, 
        altitude, 
        heading,
        battery_level 
    } = req.body;
    
    if (!device_id || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ 
            error: 'device_id, latitude, and longitude are required' 
        });
    }

    // Verify device exists
    db.get('SELECT id FROM vehicles WHERE device_id = ?', [device_id], (err, vehicle) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!vehicle) {
            return res.status(404).json({ error: 'Device not registered' });
        }

        // Insert location
        db.run(
            `INSERT INTO locations (device_id, latitude, longitude, speed, accuracy, altitude, heading, battery_level) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [device_id, latitude, longitude, speed, accuracy, altitude, heading, battery_level],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                const locationData = {
                    device_id,
                    latitude,
                    longitude,
                    speed,
                    accuracy,
                    altitude,
                    heading,
                    battery_level,
                    timestamp: new Date().toISOString()
                };

                // Broadcast to all connected clients
                io.emit('location_update', locationData);

                res.json({ 
                    success: true, 
                    location_id: this.lastID,
                    broadcasted: true
                });
            }
        );
    });
});

// Get latest location for a device
app.get('/api/location/:device_id/latest', (req, res) => {
    const { device_id } = req.params;
    
    db.get(
        `SELECT l.*, v.name as vehicle_name 
         FROM locations l
         JOIN vehicles v ON l.device_id = v.device_id
         WHERE l.device_id = ?
         ORDER BY l.timestamp DESC
         LIMIT 1`,
        [device_id],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'No location data found' });
            }
            res.json(row);
        }
    );
});

// Get all latest locations for all vehicles
app.get('/api/locations/latest', (req, res) => {
    db.all(
        `SELECT l.*, v.name as vehicle_name, v.phone_number
         FROM locations l
         JOIN vehicles v ON l.device_id = v.device_id
         WHERE l.id IN (
             SELECT MAX(id) FROM locations GROUP BY device_id
         )
         ORDER BY l.timestamp DESC`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Get location history for a device
app.get('/api/location/:device_id/history', (req, res) => {
    const { device_id } = req.params;
    const { limit = 100, from, to } = req.query;
    
    let query = `SELECT * FROM locations WHERE device_id = ?`;
    const params = [device_id];
    
    if (from) {
        query += ` AND timestamp >= ?`;
        params.push(from);
    }
    if (to) {
        query += ` AND timestamp <= ?`;
        params.push(to);
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Delete vehicle and its location history
app.delete('/api/vehicles/:device_id', (req, res) => {
    const { device_id } = req.params;
    
    db.run('DELETE FROM locations WHERE device_id = ?', [device_id], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        db.run('DELETE FROM vehicles WHERE device_id = ?', [device_id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Vehicle deleted' });
        });
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        server: 'GPS Tracking API'
    });
});

// Start server
server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🚗 GPS Tracking Server Running      ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🗺️  Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`📱 Mobile App: http://localhost:${PORT}/mobile.html`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down gracefully...');
    server.close(() => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            }
            console.log('✓ Server stopped');
            process.exit(0);
        });
    });
});
