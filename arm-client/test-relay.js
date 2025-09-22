#!/usr/bin/env node

// Simple test script to verify relay control on GPIO pin 4
const TrailCommandClient = require('./index.js');

async function testRelay() {
  console.log('Starting GPIO Relay Test...');

  const client = new TrailCommandClient({
    // Override settings for testing
    logLevel: 'debug'
  });

  // Simulate control commands for testing
  console.log('\nTesting relay control commands...');

  // Test turning relay ON
  console.log('Testing relay ON...');
  client.handleControlCommand({
    controlId: 'relay_1',
    value: true
  });

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test turning relay OFF
  console.log('Testing relay OFF...');
  client.handleControlCommand({
    controlId: 'relay_1',
    value: false
  });

  // Wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test PWM control if fan_control is enabled
  console.log('🌪️ Testing PWM control (fan)...');
  client.handleControlCommand({
    controlId: 'fan_control',
    value: 128  // 50% PWM
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Turn off PWM
  client.handleControlCommand({
    controlId: 'fan_control',
    value: 0
  });

  console.log('\nTest completed! Check the logs above for GPIO status.');
  console.log('On a real Raspberry Pi, you should see the relay clicking on/off.');

  // Cleanup
  await client.cleanupGPIO();
  process.exit(0);
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted, cleaning up...');
  process.exit(0);
});

testRelay().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});