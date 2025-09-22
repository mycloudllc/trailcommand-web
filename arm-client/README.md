# TrailCommand ARM Linux Client

A Socket.IO client for ARM Linux devices to connect to the TrailCommand IoT platform with configurable GPIO control.

## Features

- **Config-Based Setup**: JSON configuration for sensors and GPIO pins
- **GPIO Control**: Direct control of relays, LEDs, and PWM devices
- **Real-time Communication**: Socket.IO connection with automatic reconnection
- **Device Registration**: Automatic device registration and authentication
- **Flexible Sensors**: Both simulated and real sensor support
- **Control Commands**: Receive and execute control commands from the server
- **Graceful Shutdown**: Proper GPIO cleanup on exit

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

The client uses `config.json` for sensor and GPIO configuration:

```json
{
  "device": {
    "id": "my_arm_device_001",
    "name": "Raspberry Pi Sensor Station",
    "type": "sensor_station",
    "description": "ARM Linux IoT Device with Environmental Sensors"
  },
  "controls": {
    "relay_1": {
      "enabled": true,
      "pin": 4,
      "type": "digital_output",
      "name": "Main Relay",
      "default_state": false
    }
  }
}
```

### 3. Environment Setup

```bash
cp .env.example .env
# Edit .env with your server details
```

### 4. Run

```bash
npm start
```

## GPIO Pin Configuration

### Relay Control (GPIO Pin 22)

The relay on GPIO pin 22 is configured in `config.json`:

```json
{
  "controls": {
    "relay_1": {
      "enabled": true,
      "pin": 22,
      "type": "digital_output",
      "name": "Main Relay",
      "description": "Controls main power relay",
      "default_state": false,
      "inverted": false
    }
  }
}
```

**Control via TrailCommand Dashboard:**
- Send `relay_1` control command with `true`/`false` values
- GPIO pin 22 will be set HIGH (3.3V) or LOW (0V) accordingly

### Wiring Example for Relay Module

```
Raspberry Pi     →    Relay Module
GPIO 22 (Pin 15) →    IN1
5V (Pin 2)       →    VCC
GND (Pin 6)      →    GND
```

## Configuration File Structure

### Device Settings
```json
{
  "device": {
    "id": "unique_device_id",
    "name": "Display Name",
    "type": "sensor_station",
    "description": "Device description"
  }
}
```

### Sensor Configuration
```json
{
  "sensors": {
    "temperature": {
      "enabled": true,
      "type": "simulated",        // or "real"
      "pin": null,                // GPIO pin for real sensors
      "sensor_model": "DS18B20",
      "min_value": 15,
      "max_value": 35,
      "unit": "°C"
    },
    "motion": {
      "enabled": true,
      "type": "real",
      "pin": 18,                  // GPIO pin for PIR sensor
      "sensor_model": "PIR_HC-SR501"
    },
    "distance": {
      "enabled": true,
      "type": "real",
      "pin": {
        "trigger": 23,            // HC-SR04 trigger pin
        "echo": 24               // HC-SR04 echo pin
      },
      "sensor_model": "HC-SR04"
    }
  }
}
```

### Control Configuration
```json
{
  "controls": {
    "relay_1": {
      "enabled": true,
      "pin": 22,
      "type": "digital_output",   // or "pwm_output"
      "name": "Main Relay",
      "description": "Controls main power relay",
      "default_state": false,
      "inverted": false           // Set true if relay is active-low
    },
    "fan_control": {
      "enabled": true,
      "pin": 12,
      "type": "pwm_output",
      "name": "Cooling Fan",
      "default_state": 0,
      "min_value": 0,
      "max_value": 255
    }
  }
}
```

### Settings
```json
{
  "settings": {
    "send_interval": 5000,      // Sensor data interval (ms)
    "log_level": "info",        // error, warn, info, debug
    "gpio_mode": "BCM",         // GPIO numbering mode
    "auto_cleanup_gpio": true,  // Cleanup GPIO on exit
    "debounce_time": 200       // Debounce time for inputs (ms)
  }
}
```

## Testing GPIO Control

Use the included test script to verify relay control:

```bash
node test-relay.js
```

This will:
1. Turn the relay ON for 2 seconds
2. Turn the relay OFF for 1 second
3. Test PWM control (if enabled)
4. Clean up and exit

## Control Commands

Send control commands from the TrailCommand dashboard:

### Digital Control (Relay)
```javascript
{
  "controlId": "relay_1",
  "value": true    // true = ON, false = OFF
}
```

### PWM Control (Fan)
```javascript
{
  "controlId": "fan_control",
  "value": 128     // 0-255 (0% to 100% duty cycle)
}
```

## GPIO Dependencies

The client uses the `pigpio` library for GPIO control:

### On Raspberry Pi
```bash
# Enable GPIO daemon
sudo systemctl enable pigpiod
sudo systemctl start pigpiod

# Install native dependencies
npm install pigpio
```

### For Development (No GPIO)
The client will automatically fall back to simulation mode if GPIO is not available.

## Real Sensor Integration

To add real sensors, modify the `readRealSensor()` method:

```javascript
readRealSensor(sensorType) {
  const sensor = this.deviceConfig.sensors[sensorType];

  switch (sensorType) {
    case 'temperature':
      // Read from DS18B20
      return readDS18B20Temperature();

    case 'motion':
      // Read PIR sensor
      const pin = this.gpioPins.get(`sensor_${sensorType}`);
      return pin ? pin.digitalRead() : 0;

    default:
      return this.simulateSensorValue(sensorType);
  }
}
```

## Deployment

### As a System Service

Create `/etc/systemd/system/trailcommand-client.service`:

```ini
[Unit]
Description=TrailCommand ARM Client
After=network.target pigpiod.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/arm-client
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable trailcommand-client
sudo systemctl start trailcommand-client
sudo systemctl status trailcommand-client
```

## Troubleshooting

### GPIO Issues
- Ensure `pigpiod` daemon is running: `sudo systemctl status pigpiod`
- Check GPIO permissions: Add user to gpio group or run with sudo
  ```bash
  sudo usermod -a -G gpio $USER
  # OR run with sudo
  sudo node index.js
  ```
- Verify pin connections and relay module power

### Connection Issues
- Check server host/port in `.env`
- Verify firewall settings
- Ensure TrailCommand API server is running

### Relay Not Working
- Test with multimeter: GPIO pin 22 should show 3.3V when ON
- Check relay module power (usually 5V)
- Verify `inverted` setting in config if relay is active-low
- Try the test script: `node test-relay.js`

## License

MIT