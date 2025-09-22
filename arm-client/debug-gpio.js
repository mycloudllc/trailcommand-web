#!/usr/bin/env node

// GPIO debugging script to test relay functionality
console.log('GPIO Relay Debug Tool');

// Check if pigpio is available
let gpio = null;
let gpioAvailable = false;

try {
  gpio = require('pigpio').Gpio;
  gpioAvailable = true;
  console.log('pigpio library loaded successfully');
} catch (error) {
  console.log('pigpio library not available:', error.message);
  console.log('Try: sudo apt install pigpio && npm install pigpio');
  process.exit(1);
}

// Test GPIO pin 22
const RELAY_PIN = 22;

async function debugRelay() {
  console.log(`\nTesting GPIO pin ${RELAY_PIN}...`);

  try {
    // Initialize the pin
    const relayPin = new gpio(RELAY_PIN, { mode: gpio.OUTPUT });
    console.log(`GPIO pin ${RELAY_PIN} initialized as OUTPUT`);

    // Test sequence
    console.log('\nGPIO Test Sequence:');

    // Test 1: Set pin LOW
    console.log('Setting pin LOW (0V)...');
    relayPin.digitalWrite(0);
    await sleep(1000);

    // Read back the state
    const state1 = relayPin.digitalRead();
    console.log(`Pin state: ${state1} (should be 0)`);

    // Test 2: Set pin HIGH
    console.log('Setting pin HIGH (3.3V)...');
    relayPin.digitalWrite(1);
    await sleep(1000);

    // Read back the state
    const state2 = relayPin.digitalRead();
    console.log(`Pin state: ${state2} (should be 1)`);

    // Test 3: Toggle test
    console.log('\nToggle test (5 cycles):');
    for (let i = 0; i < 5; i++) {
      console.log(`  Cycle ${i + 1}: ON`);
      relayPin.digitalWrite(1);
      await sleep(500);

      console.log(`  Cycle ${i + 1}: OFF`);
      relayPin.digitalWrite(0);
      await sleep(500);
    }

    // Test 4: Check if relay module is active-low
    console.log('\nTesting active-low relay (inverted logic):');
    console.log('Setting pin HIGH (should turn relay OFF if active-low)...');
    relayPin.digitalWrite(1);
    await sleep(2000);

    console.log('Setting pin LOW (should turn relay ON if active-low)...');
    relayPin.digitalWrite(0);
    await sleep(2000);

    // Cleanup
    console.log('\nCleaning up...');
    relayPin.digitalWrite(0);

    console.log('\nGPIO test completed!');
    console.log('\nTroubleshooting checklist:');
    console.log('  1. Check physical connections');
    console.log('  2. Verify relay module power (5V)');
    console.log('  3. Listen for relay clicking sounds');
    console.log('  4. Use multimeter to check GPIO pin voltage');
    console.log('  5. Try different relay module if available');
    console.log('  6. Check if relay is active-low (inverted)');

  } catch (error) {
    console.error('GPIO test failed:', error.message);

    if (error.message.includes('Permission denied')) {
      console.log('Try running with sudo or add user to gpio group');
      console.log('   sudo usermod -a -G gpio $USER');
    }

    if (error.message.includes('pigpiod')) {
      console.log('Try starting pigpio daemon:');
      console.log('   sudo systemctl start pigpiod');
      console.log('   sudo systemctl enable pigpiod');
    }
  }

  process.exit(0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nDebug interrupted');
  process.exit(0);
});

debugRelay();