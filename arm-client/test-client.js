#!/usr/bin/env node

/**
 * Test script for TrailCommand ARM Client
 * This script creates a test device and sends simulated sensor data
 */

const TrailCommandClient = require('./index.js');

// Test configuration
const testConfig = {
  serverHost: 'localhost',
  serverPort: 3001,
  authToken: process.env.AUTH_TOKEN || '', // You need to provide this
  deviceId: `test_device_${Date.now()}`,
  deviceName: 'Test ARM Device',
  deviceType: 'test_station',
  deviceDescription: 'Test device for TrailCommand ARM client',
  simulateSensors: true,
  sensors: ['temperature', 'humidity', 'pressure', 'battery', 'light', 'motion'],
  sendInterval: 3000, // Send data every 3 seconds
  logLevel: 'info'
};

console.log('🚀 Starting TrailCommand ARM Client Test');
console.log('📋 Configuration:', {
  deviceId: testConfig.deviceId,
  serverUrl: `${testConfig.serverHost}:${testConfig.serverPort}`,
  sensors: testConfig.sensors,
  interval: `${testConfig.sendInterval}ms`
});

if (!testConfig.authToken) {
  console.error('Error: AUTH_TOKEN environment variable is required');
  console.log('To get your auth token:');
  console.log('   1. Log into TrailCommand web interface');
  console.log('   2. Open browser dev tools (F12)');
  console.log('   3. Go to Application/Storage tab');
  console.log('   4. Find "trailcommand-token" in localStorage');
  console.log('   5. Copy the token and run: AUTH_TOKEN=your_token node test-client.js');
  process.exit(1);
}

// Create and start the test client
const client = new TrailCommandClient(testConfig);
client.start();

console.log('Test client started successfully');
console.log('Watch the TrailCommand web interface to see live data');
console.log('Press Ctrl+C to stop the client');