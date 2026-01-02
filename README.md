# 🚗 Real-Time GPS Vehicle Tracking System

A complete GPS tracking system with real-time location updates, web dashboard, and mobile tracking app.

## 📋 Features

- ✅ Real-time GPS tracking with WebSocket updates
- ✅ Interactive map dashboard with vehicle markers
- ✅ Mobile app for phone-based tracking (Android/iPhone)
- ✅ SQLite database for location history
- ✅ RESTful API for all operations
- ✅ Vehicle registration and management
- ✅ Speed, battery, and location accuracy tracking
- ✅ Auto-calculated speed when not provided by GPS
- ✅ Responsive design for all devices

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `cors` - Cross-origin support
- `sqlite3` - Database
- `socket.io` - Real-time WebSocket communication

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

You should see:
```
╔════════════════════════════════════════╗
║   🚗 GPS Tracking Server Running      ║
╚════════════════════════════════════════╝
📡 Server: http://localhost:3000
🗺️  Dashboard: http://localhost:3000/dashboard.html
📱 Mobile App: http://localhost:3000/mobile.html
🔌 WebSocket: ws://localhost:3000
```

### 3. Open the Dashboard

Open your browser and go to:
```
http://localhost:3000/dashboard.html
```

### 4. Register a Vehicle

1. Click "Add New Vehicle" in the dashboard
2. Enter a Device ID (e.g., `DEVICE001`)
3. Enter a vehicle name (e.g., `Company Van #1`)
4. Click "Register Vehicle"

### 5. Start Tracking

**Option A: Using Your Phone (Recommended)**

1. Open on your phone: `http://localhost:3000/mobile.html`
   - If testing locally, use your computer's IP address instead of localhost
   - Example: `http://192.168.1.100:3000/mobile.html`
2. Enter the same Device ID you registered
3. Enter the server URL (use your computer's IP)
4. Click "Start Tracking"
5. Allow location permissions when prompted
6. Watch the dashboard update in real-time!

**Option B: Testing with Postman/curl**

Send location updates via API:

```bash
curl -X POST http://localhost:3000/api/location \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DEVICE001",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "speed": 45.5,
    "accuracy": 10,
    "battery_level": 85
  }'
```

## 📱 Using the Mobile App

### Setup Instructions:

1. **Get Your Computer's IP Address:**
   - Windows: Run `ipconfig` in Command Prompt
   - Mac/Linux: Run `ifconfig` or `ip addr`
   - Look for your local IP (e.g., `192.168.1.100`)

2. **Access Mobile App:**
   - On your phone's browser, go to: `http://YOUR_IP:3000/mobile.html`
   - Example: `http://192.168.1.100:3000/mobile.html`

3. **Configure Tracking:**
   - Device ID: Use the ID you registered in dashboard
   - Server URL: `http://YOUR_IP:3000`
   - Update Interval: 5 seconds (recommended)

4. **Start Tracking:**
   - Click "Start Tracking"
   - Grant location permissions
   - Keep the browser open (don't close or switch apps too much)

### Tips for Best Performance:

- Keep the phone charged or plugged in
- Keep the mobile browser tab active
- Use a phone mount in the vehicle
- Ensure stable internet connection (mobile data or WiFi)
- For Android, consider using Chrome in "Add to Home Screen" mode

## 🖥️ Dashboard Features

### Vehicle List
- View all registered vehicles
- See online/offline status (green = active in last 5 minutes)
- Click any vehicle to view details and center map

### Map View
- Real-time vehicle locations with markers
- Click markers for quick info popup
- Auto-centers on first vehicle

### Vehicle Details Panel
- Current speed
- Battery level
- Last update time
- GPS coordinates
- Delete vehicle option

## 🔌 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Register Vehicle
```http
POST /api/vehicles/register
Content-Type: application/json

{
  "device_id": "DEVICE001",
  "name": "Company Van #1",
  "phone_number": "+1234567890"  // optional
}
```

#### 2. Get All Vehicles
```http
GET /api/vehicles
```

#### 3. Update Location
```http
POST /api/location
Content-Type: application/json

{
  "device_id": "DEVICE001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "speed": 45.5,           // optional, km/h
  "accuracy": 10,          // optional, meters
  "altitude": 100,         // optional, meters
  "heading": 180,          // optional, degrees
  "battery_level": 85      // optional, percentage
}
```

#### 4. Get Latest Location
```http
GET /api/location/:device_id/latest
```

#### 5. Get All Latest Locations
```http
GET /api/locations/latest
```

#### 6. Get Location History
```http
GET /api/location/:device_id/history?limit=100&from=2024-01-01&to=2024-01-31
```

#### 7. Delete Vehicle
```http
DELETE /api/vehicles/:device_id
```

#### 8. Health Check
```http
GET /api/health
```

## 📊 Database Schema

### Vehicles Table
```sql
CREATE TABLE vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Locations Table
```sql
CREATE TABLE locations (
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
);
```

## 🌐 Deploy to Production

### Option 1: VPS/Cloud Server (Recommended)

1. **Get a server** (DigitalOcean, AWS, Heroku, etc.)

2. **Install Node.js** on the server:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Upload your code**:
```bash
scp -r * user@your-server-ip:/home/user/gps-tracker/
```

4. **Install dependencies and start**:
```bash
ssh user@your-server-ip
cd gps-tracker
npm install
npm start
```

5. **Use PM2 for auto-restart**:
```bash
npm install -g pm2
pm2 start server.js --name gps-tracker
pm2 startup
pm2 save
```

6. **Setup domain and SSL** (optional but recommended):
   - Point domain to your server IP
   - Install nginx as reverse proxy
   - Use Let's Encrypt for free SSL certificate

### Option 2: Heroku (Easy)

1. Create `Procfile`:
```
web: node server.js
```

2. Deploy:
```bash
heroku create your-app-name
git push heroku main
```

### Option 3: Docker

1. Create `Dockerfile`:
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

2. Build and run:
```bash
docker build -t gps-tracker .
docker run -p 3000:3000 gps-tracker
```

## 🔧 Configuration

### Change Server Port

Edit `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

Or set environment variable:
```bash
PORT=8080 npm start
```

### Database Location

The SQLite database file is created at `./gps_tracking.db`

To change location, edit `server.js`:
```javascript
const db = new sqlite3.Database('./path/to/your/database.db');
```

### Update Intervals

In `mobile.html`, default is 5 seconds. Adjust as needed:
- Lower = More accurate, more battery usage
- Higher = Less accurate, better battery life

## 🐛 Troubleshooting

### Dashboard shows "Disconnected"
- Check if server is running
- Check browser console for errors
- Verify WebSocket connection at `ws://localhost:3000`

### Mobile app can't send location
- Make sure you're using your computer's IP, not `localhost`
- Check if both devices are on the same network
- Verify location permissions are granted
- Check if HTTPS is required (some browsers require HTTPS for geolocation)

### Vehicle stays "Offline"
- Vehicle is offline if no update in last 5 minutes
- Check if mobile app is still running
- Verify network connection on phone

### Database errors
- Delete `gps_tracking.db` and restart server (will recreate fresh database)
- Check file permissions

## 📱 Creating a Native Android App (Optional)

For a dedicated Android app instead of browser:

1. Use **Cordova** or **React Native**
2. Package the `mobile.html` as a WebView app
3. Add background service to keep tracking when app is closed
4. Submit to Google Play Store

Basic Cordova example:
```bash
npm install -g cordova
cordova create GPSTracker com.yourcompany.gpstracker GPSTracker
cd GPSTracker
cordova platform add android
# Copy mobile.html to www/index.html
cordova build android
```

## 📄 License

MIT License - Feel free to use for personal or commercial projects!

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check browser console for errors
4. Verify server logs

## 🎯 Next Steps

- [ ] Add user authentication
- [ ] Add geofencing (alerts when vehicle enters/exits areas)
- [ ] Add route history playback
- [ ] Add email/SMS alerts
- [ ] Add multiple user support with permissions
- [ ] Add export to CSV/PDF
- [ ] Add analytics dashboard
- [ ] Add fuel tracking
- [ ] Add maintenance reminders

Enjoy tracking! 🚗📍
