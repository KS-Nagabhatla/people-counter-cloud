const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(express.static('.')); // Serve from root instead of 'public'

// Store data
let devices = {};
let zones = {
  'zone1': {
    name: 'Main Entrance',
    devices: ['HCFD61CA'],
    currentCount: 0
  }
};

// API endpoint for your local bridge to PUSH data
app.post('/api/push-data', (req, res) => {
  try {
    const data = req.body;
    console.log('📨 Cloud received data:', data);
    
    processIncomingData(data);
    
    res.json({ status: 'success', message: 'Data received by cloud' });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Process incoming data from local bridge
function processIncomingData(data) {
  const deviceId = data.deviceId || 'HCFD61CA';
  const inCount = data.in || 0;
  const outCount = data.out || 0;
  
  console.log(`👥 Processing: ${deviceId} - IN: ${inCount}, OUT: ${outCount}`);
  
  // Initialize device if not exists
  if (!devices[deviceId]) {
    devices[deviceId] = {
      deviceId: deviceId,
      totalIn: 0,
      totalOut: 0,
      currentCount: 0,
      lastUpdate: new Date()
    };
  }
  
  // Update counts
  devices[deviceId].totalIn += inCount;
  devices[deviceId].totalOut += outCount;
  devices[deviceId].currentCount = devices[deviceId].totalIn - devices[deviceId].totalOut;
  devices[deviceId].lastUpdate = new Date();
  
  // Update zone occupancy
  zones['zone1'].currentCount = devices[deviceId].currentCount;
  
  // Send real-time update to all connected dashboards
  io.emit('people_update', {
    deviceId: deviceId,
    in: inCount,
    out: outCount,
    currentCount: devices[deviceId].currentCount,
    zones: zones,
    timestamp: new Date(),
    source: 'cloud'
  });
  
  console.log(`📊 Updated: ${deviceId} = ${devices[deviceId].currentCount} people`);
}

// API Routes for dashboard - FIXED PATH
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html')); // Now looks in root
});

app.get('/api/devices', (req, res) => {
  res.json(devices);
});

app.get('/api/zones', (req, res) => {
  res.json(zones);
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'cloud-server-running',
    devices: Object.keys(devices).length,
    lastUpdate: new Date(),
    message: 'Ready to receive data from local bridge'
  });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('🌐 Cloud dashboard connected:', socket.id);
  socket.emit('initial_data', {
    devices: devices,
    zones: zones,
    server: 'cloud'
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`☁️  Cloud Server running on port ${PORT}`);
  console.log(`📊 Dashboard: https://people-counter-demo.onrender.com`);
  console.log(`📍 Waiting for data from local bridge...`);
});
