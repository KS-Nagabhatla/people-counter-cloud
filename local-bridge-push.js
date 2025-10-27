const mqtt = require('mqtt');
const axios = require('axios');

// Your Office MQTT
const MQTT_CONFIG = {
  host: '192.168.68.123',
  port: 1883,
  username: 'antariot',
  password: 'admin@1234'
};

// ⚠️ UPDATE THIS AFTER DEPLOYMENT ⚠️
const CLOUD_URL = 'https://people-counter-demo.onrender.com';

console.log('🚀 Starting Local Bridge...');
console.log('🔗 Connecting to MQTT...');

const client = mqtt.connect(MQTT_CONFIG);

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  client.subscribe('test', (err) => {
    if (!err) {
      console.log('📡 Subscribed to topic: test');
      console.log(`📍 Ready to push data to: ${CLOUD_URL}`);
    }
  });
});

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error);
});

// Push data to cloud
async function pushToCloud(data) {
  try {
    const response = await axios.post(`${CLOUD_URL}/api/push-data`, data, {
      timeout: 10000
    });
    console.log('✅ Data pushed to cloud');
    return true;
  } catch (error) {
    console.log('❌ Cloud push failed:', error.message);
    return false;
  }
}

// Process MQTT messages
client.on('message', (topic, message) => {
  try {
    console.log('\n📨 MQTT Message:', message.toString());
    
    const rawData = JSON.parse(message.toString());
    const deviceId = rawData.device_info.cus_device_id;
    const inCount = rawData.line_trigger_data[0].in;
    const outCount = rawData.line_trigger_data[0].out;
    
    const cloudData = {
      deviceId: deviceId,
      in: inCount,
      out: outCount,
      timestamp: new Date()
    };
    
    console.log(`📍 Processing: ${deviceId} - IN: ${inCount}, OUT: ${outCount}`);
    
    pushToCloud(cloudData);
    
  } catch (error) {
    console.error('❌ Message processing error:', error);
  }
});

console.log('🎯 Local Bridge running - Waiting for hardware data...');

