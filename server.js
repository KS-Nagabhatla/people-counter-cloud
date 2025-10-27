const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" }});

app.use(express.json());
app.use(express.static('public'));

let devices = {};
let zones = {
  zone1: { name: 'Main Entrance', devices: ['HCFD61CA'], currentCount: 0 }
};

function processIncomingData(data) {
  const deviceId = data.deviceId || 'HCFD61CA';
  const inCount  = Number(data.in  || 0);
  const outCount = Number(data.out || 0);

  console.log(`👥 Rx ${deviceId}: IN=${inCount}, OUT=${outCount}`);

  if (!devices[deviceId]) {
    devices[deviceId] = { deviceId, totalIn: 0, totalOut: 0, currentCount: 0, lastUpdate: new Date() };
  }

  devices[deviceId].totalIn  += inCount;
  devices[deviceId].totalOut += outCount;
  devices[deviceId].currentCount = Math.max(0, devices[deviceId].totalIn - devices[deviceId].totalOut);
  devices[deviceId].lastUpdate = new Date();

  // Single-device demo: zone1 mirrors this device
  zones.zone1.currentCount = devices[deviceId].currentCount;

  io.emit('people_update', { devices, zones, timestamp: new Date().toISOString() });
  console.log(`📊 Count now = ${devices[deviceId].currentCount}`);
}

// Ingest endpoint
app.post('/api/push-data', (req, res) => {
  try { processIncomingData(req.body); res.json({ ok: true }); }
  catch (e) { console.error(e); res.status(400).json({ ok: false, error: e.message }); }
});

// Polling fallback
app.get('/api/state', (req, res) => res.json({ devices, zones, serverTime: new Date().toISOString() }));

// Health & static
app.get('/api/status', (req, res) => res.json({ status: 'running', devices: Object.keys(devices).length, lastUpdate: new Date() }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// Sockets
io.on('connection', (s) => {
  console.log('🔌 Dashboard connected');
  s.emit('initial_data', { devices, zones });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`☁️ Server on ${PORT}`));
