const mqtt = require('mqtt');
const axios = require('axios');

// Your Office MQTT Connection
const MQTT_CONFIG = {
  host: '192.168.68.123',
  port: 1883,
  username: 'antariot',
  password: 'admin@1234'
};

// Your Cloud Server URL (you'll update this after deployment)
let CLOUD_URL = 'https://people-counter-demo.onrender.com/'; // Will update after deployment

console.log('🔗 Connecting to local MQTT...');
const client = mqtt.connect(MQTT_CONFIG);

client.on('connect', () => {
  console.log('✅ Connected to local MQTT broker');
  client.subscribe('test', (err) => {
    if (!err) {
      console.log('📡 Subscribed to topic: test');
      console.log(`📍 Will push data to cloud: ${CLOUD_URL}`);
    }
  });
});

// Function to push data to cloud
async function pushToCloud(data) {
  try {
    const response = await axios.post(`${CLOUD_URL}/api/push-data`, data, {
      timeout: 5000
    });
    console.log('✅ Data pushed to cloud successfully');
  } catch (error) {
    console.log('❌ Failed to push to cloud:', error.message);
  }
}

client.on('message', (topic, message) => {
  try {
    console.log('📨 Local MQTT received:', message.toString());
    
    const rawData = JSON.parse(message.toString());
    const deviceId = rawData.device_info.cus_device_id;
    const inCount = rawData.line_trigger_data[0].in;
    const outCount = rawData.line_trigger_data[0].out;
    
    // Prepare data for cloud
    const cloudData = {
      deviceId: deviceId,
      in: inCount,
      out: outCount,
      timestamp: new Date(),
      rawData: rawData
    };
    
    console.log(`📍 Processed: ${deviceId} - IN: ${inCount}, OUT: ${outCount}`);
    
    // Push to cloud
    pushToCloud(cloudData);
    
  } catch (error) {
    console.error('❌ Error processing MQTT message:', error);
  }
});

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error);
});

console.log('🚀 Local Bridge started - Waiting for MQTT messages...');
console.log('💡 Remember to update CLOUD_URL with your actual cloud URL');