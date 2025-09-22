#!/usr/bin/env node

// Configuration now handled entirely by config.json
const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// GPIO handling with graceful fallback - using child_process for raspi-gpio commands
const { exec } = require('child_process');
let gpioAvailable = false;

// Test if raspi-gpio is available
try {
  exec('which raspi-gpio', { timeout: 5000 }, (error, stdout, stderr) => {
    if (!error && stdout.trim()) {
      gpioAvailable = true;
      console.log('raspi-gpio command available - using modern GPIO interface');
    } else {
      console.warn('raspi-gpio command not available. Running in simulation mode.');
      gpioAvailable = false;
    }
  });

  // Assume available for now - will be tested during initialization
  gpioAvailable = true;
} catch (error) {
  console.warn('GPIO not available. Running in simulation mode.');
  gpioAvailable = false;
}

class TrailCommandClient {
  constructor(options = {}) {
    // Initialize basic config first for logging
    this.config = {
      logLevel: 'info',
      ...options
    };

    // Load config file
    this.deviceConfig = this.loadConfig();

    // Set up full configuration from config.json
    this.config = {
      serverHost: this.deviceConfig.server.host,
      serverPort: this.deviceConfig.server.port,
      username: this.deviceConfig.auth.username,
      email: this.deviceConfig.auth.email,
      password: this.deviceConfig.auth.password,
      deviceId: this.deviceConfig.device.id,
      deviceName: this.deviceConfig.device.name,
      deviceType: this.deviceConfig.device.type,
      deviceDescription: this.deviceConfig.device.description,
      deviceUuid: this.deviceConfig.device.uuid || uuidv4(),
      sendInterval: this.deviceConfig.settings.send_interval,
      logLevel: this.deviceConfig.settings.log_level,
      ...options
    };

    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.isRegistered = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.dataInterval = null;
    this.deviceAuthCode = null;
    this.authCodeExpires = null;
    this.userToken = null;
    this.renewalInterval = null;

    // GPIO pins for controls
    this.gpioPins = new Map();
    this.controlStates = new Map();

    this.log('info', 'TrailCommand ARM Client initialized', {
      deviceId: this.config.deviceId,
      serverUrl: `${this.config.serverHost}:${this.config.serverPort}`,
      gpioAvailable: gpioAvailable
    });

    // GPIO initialization will be done in start() method
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, 'config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      if (this.log) this.log('info', 'Config file loaded successfully');
      return config;
    } catch (error) {
      if (this.log) this.log('error', 'Failed to load config file, using defaults', { error: error.message });
      else console.warn('Failed to load config file, using defaults:', error.message);
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      server: {
        host: "10.10.10.198",
        port: 3001
      },
      auth: {
        username: "admin",
        email: "admin@example.com",
        password: "admin123"
      },
      device: {
        id: "TrailCommandProTest",
        name: "TrailCommand Pro Device Test",
        type: "sensor_station",
        description: "ARM Linux IoT Device for Testing",
        uuid: ""
      },
      sensors: {
        temperature: {
          enabled: true,
          type: "simulated",
          min_value: 18,
          max_value: 35
        },
        humidity: {
          enabled: true,
          type: "simulated",
          min_value: 30,
          max_value: 90
        },
        pressure: {
          enabled: true,
          type: "simulated",
          min_value: 980,
          max_value: 1020
        },
        battery: {
          enabled: true,
          type: "simulated",
          min_value: 75,
          max_value: 100
        }
      },
      controls: {
        relay_1: {
          enabled: true,
          pin: 22,
          type: "digital_output",
          inverted: false,
          default_state: false,
          description: "Main relay control"
        },
        led_builtin: {
          enabled: true,
          pin: 16,
          type: "digital_output",
          inverted: false,
          default_state: false,
          description: "Status LED"
        }
      },
      settings: {
        send_interval: 5000,
        auto_cleanup_gpio: true,
        log_level: "info"
      }
    };
  }

  async testGPIOAccess() {
    // Test with a simple, commonly available pin (GPIO 25)
    const testPin = 25;

    return new Promise((resolve, reject) => {
      this.log('debug', `Testing GPIO access with raspi-gpio on pin ${testPin}`);

      // Test setting pin as output and writing to it
      exec(`raspi-gpio set ${testPin} op`, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          this.log('error', `GPIO test failed on pin ${testPin}`, { error: error.message });
          reject(new Error(`GPIO access test failed: ${error.message}`));
        } else {
          this.log('debug', `GPIO test setup successful on pin ${testPin}`);

          // Test writing low value
          exec(`raspi-gpio set ${testPin} dl`, { timeout: 5000 }, (writeError, writeStdout, writeStderr) => {
            if (writeError) {
              this.log('error', `GPIO write test failed on pin ${testPin}`, { error: writeError.message });
              reject(new Error(`GPIO write test failed: ${writeError.message}`));
            } else {
              this.log('debug', `GPIO write test successful on pin ${testPin}`);
              resolve();
            }
          });
        }
      });
    });
  }

  async initializeGPIO() {
    if (!gpioAvailable) {
      this.log('warn', 'GPIO not available - running in simulation mode');
      return;
    }

    try {
      this.log('info', 'Using raspi-gpio commands, testing GPIO access...', {
        controlsFound: Object.keys(this.deviceConfig.controls)
      });

      // Test a simple pin first
      await this.testGPIOAccess();

      this.log('info', 'GPIO access test passed, initializing control pins');

      // Initialize control pins
      for (const [controlId, control] of Object.entries(this.deviceConfig.controls)) {
        if (control.enabled) {
          try {
            await new Promise((resolve, reject) => {
              this.log('debug', `Setting up GPIO pin ${control.pin} for ${controlId}`);

              // Set pin as output
              exec(`raspi-gpio set ${control.pin} op`, { timeout: 5000 }, (err, stdout, stderr) => {
                if (err) {
                  this.log('error', `Failed to setup GPIO pin ${control.pin}`, { error: err.message });
                  reject(err);
                } else {
                  this.log('debug', `GPIO pin ${control.pin} setup successful, setting default state`);

                  // Set default state
                  const defaultState = control.inverted ? !control.default_state : control.default_state;
                  const command = defaultState ? `raspi-gpio set ${control.pin} dh` : `raspi-gpio set ${control.pin} dl`;

                  exec(command, { timeout: 5000 }, (writeErr, writeStdout, writeStderr) => {
                    if (writeErr) {
                      this.log('warn', `Failed to set default state for ${controlId}`, {
                        error: writeErr.message,
                        pin: control.pin,
                        command: command
                      });
                    } else {
                      this.log('debug', `Default state set for ${controlId}`, {
                        pin: control.pin,
                        command: command
                      });
                    }
                    this.controlStates.set(controlId, control.default_state);
                    resolve();
                  });
                }
              });
            });

            this.log('info', `GPIO pin ${control.pin} initialized for ${controlId}`, {
              pin: control.pin,
              defaultState: control.default_state
            });
          } catch (error) {
            this.log('error', `Failed to initialize ${controlId} on pin ${control.pin}`, {
              error: error.message
            });
            // Continue with other pins even if one fails
          }
        }
      }

      // Note: Real sensor GPIO setup would be added here if needed
      // For now, only simulated sensors are supported with rpi-gpio

    } catch (error) {
      this.log('error', 'Failed to initialize GPIO', { error: error.message });
    }
  }

  async cleanupGPIO() {
    if (!gpioAvailable) return;

    try {
      this.gpioPins.forEach((pin, id) => {
        pin.digitalWrite(0); // Turn off all outputs
        this.log('debug', `GPIO pin cleaned up: ${id}`);
      });

      if (this.deviceConfig.settings.auto_cleanup_gpio) {
        this.log('info', 'GPIO cleanup completed (raspi-gpio mode)');
      }
    } catch (error) {
      this.log('error', 'Error during GPIO cleanup', { error: error.message });
    }
  }

  log(level, message, data = {}) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const configLevel = levels[this.config.logLevel] || 2;

    if (levels[level] <= configLevel) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        deviceId: this.config.deviceId,
        ...data
      };

      console.log(JSON.stringify(logEntry));
    }
  }

  async authenticateUser() {
    // Try authentication with email first if available, then fallback to username
    const authMethods = [];

    if (this.config.email) {
      authMethods.push({
        method: 'email',
        credentials: {
          email: this.config.email,
          password: this.config.password
        }
      });
    }

    if (this.config.username) {
      authMethods.push({
        method: 'username',
        credentials: {
          username: this.config.username,
          password: this.config.password
        }
      });
    }

    for (const authMethod of authMethods) {
      try {
        this.log('info', `Attempting authentication with ${authMethod.method}`, {
          [authMethod.method]: authMethod.credentials[authMethod.method]
        });

        const response = await axios.post(`http://${this.config.serverHost}:${this.config.serverPort}/api/auth/login`, authMethod.credentials);

        this.userToken = response.data.token;
        this.log('info', `User authentication successful with ${authMethod.method}`, {
          [authMethod.method]: authMethod.credentials[authMethod.method]
        });
        return true;
      } catch (error) {
        this.log('warn', `Authentication failed with ${authMethod.method}`, {
          [authMethod.method]: authMethod.credentials[authMethod.method],
          error: error.response?.data?.message || error.message
        });
      }
    }

    this.log('error', 'All authentication methods failed');
    return false;
  }

  async createDevice() {
    try {
      const deviceData = {
        device_id: this.config.deviceId,
        name: this.config.deviceName,
        type: this.config.deviceType,
        description: this.config.deviceDescription,
        uuid: this.config.deviceUuid
      };

      await axios.post(`http://${this.config.serverHost}:${this.config.serverPort}/api/devices`,
        deviceData,
        {
          headers: { Authorization: `Bearer ${this.userToken}` }
        }
      );

      this.log('info', 'Device created successfully');
      return true;
    } catch (error) {
      if (error.response?.status === 409) {
        this.log('info', 'Device already exists');
        return true;
      }
      this.log('error', 'Device creation failed', {
        error: error.response?.data?.message || error.message
      });
      return false;
    }
  }

  async generateAuthCode() {
    try {
      this.log('debug', 'Requesting auth code from API', {
        url: `http://${this.config.serverHost}:${this.config.serverPort}/api/devices/${this.config.deviceId}/auth-code`,
        hasToken: !!this.userToken
      });

      const response = await axios.post(`http://${this.config.serverHost}:${this.config.serverPort}/api/devices/${this.config.deviceId}/auth-code`,
        {},
        {
          headers: { Authorization: `Bearer ${this.userToken}` }
        }
      );

      this.log('debug', 'Auth code API response', {
        status: response.status,
        data: response.data
      });

      if (!response.data.authCode) {
        throw new Error('Auth code not returned from API');
      }

      if (!response.data.expires) {
        throw new Error('Expiration date not returned from API');
      }

      this.deviceAuthCode = response.data.authCode;
      this.authCodeExpires = new Date(response.data.expires);

      // Verify the date was parsed correctly
      if (isNaN(this.authCodeExpires.getTime())) {
        throw new Error(`Invalid expiration date format: ${response.data.expires}`);
      }

      this.log('info', 'Device auth code generated', {
        authCode: this.deviceAuthCode.substring(0, 10) + '...',
        expires: this.authCodeExpires.toISOString()
      });
      return true;
    } catch (error) {
      this.log('error', 'Auth code generation failed', {
        error: error.response?.data?.error || error.response?.data?.message || error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  async setupDeviceAuth() {
    this.log('info', 'Starting device authentication setup...');

    if (!await this.authenticateUser()) {
      throw new Error('User authentication failed');
    }

    if (!await this.createDevice()) {
      throw new Error('Device creation failed');
    }

    if (!await this.generateAuthCode()) {
      throw new Error('Auth code generation failed');
    }

    this.scheduleAuthCodeRenewal();
    return true;
  }

  scheduleAuthCodeRenewal() {
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
    }

    const renewalTime = new Date(this.authCodeExpires.getTime() - 60000);
    const timeUntilRenewal = renewalTime.getTime() - Date.now();

    if (timeUntilRenewal > 0) {
      this.renewalInterval = setTimeout(async () => {
        this.log('info', 'Renewing auth code...');
        await this.generateAuthCode();
      }, timeUntilRenewal);

      this.log('debug', 'Auth code renewal scheduled', {
        renewalTime: renewalTime.toISOString()
      });
    }
  }

  getEnabledSensors() {
    return Object.entries(this.deviceConfig.sensors)
      .filter(([_, sensor]) => sensor.enabled)
      .map(([sensorId, _]) => sensorId);
  }

  simulateSensorValue(sensorType) {
    const sensor = this.deviceConfig.sensors[sensorType];
    if (!sensor) return 0;

    const min = sensor.min_value || 0;
    const max = sensor.max_value || 100;

    switch (sensorType) {
      case 'temperature':
        return parseFloat((Math.random() * (max - min) + min).toFixed(1));
      case 'humidity':
        return parseFloat((Math.random() * (max - min) + min).toFixed(1));
      case 'pressure':
        return parseFloat((Math.random() * (max - min) + min).toFixed(1));
      case 'battery':
        return Math.floor(Math.random() * (max - min) + min);
      case 'light':
        return Math.floor(Math.random() * (max - min) + min);
      case 'motion':
        return Math.random() > 0.8 ? 1 : 0;
      case 'distance':
        return parseFloat((Math.random() * (max - min) + min).toFixed(1));
      default:
        return Math.random() * (max - min) + min;
    }
  }

  readRealSensor(sensorType) {
    const sensor = this.deviceConfig.sensors[sensorType];
    if (!sensor || !gpioAvailable) {
      return this.simulateSensorValue(sensorType);
    }

    try {
      switch (sensorType) {
        case 'motion':
          if (sensor.pin) {
            const pin = this.gpioPins.get(`sensor_${sensorType}`);
            return pin ? pin.digitalRead() : 0;
          }
          break;

        case 'distance':
          if (sensor.pin && sensor.pin.trigger && sensor.pin.echo) {
            return this.readUltrasonicSensor(sensor.pin.trigger, sensor.pin.echo);
          }
          break;

        default:
          this.log('debug', `Real sensor reading not implemented for ${sensorType}, using simulation`);
          return this.simulateSensorValue(sensorType);
      }
    } catch (error) {
      this.log('error', `Error reading real sensor ${sensorType}`, { error: error.message });
      return this.simulateSensorValue(sensorType);
    }

    return this.simulateSensorValue(sensorType);
  }

  readUltrasonicSensor(triggerPin, echoPin) {
    // Simplified ultrasonic sensor reading
    // In real implementation, you'd use precise timing for echo measurement
    try {
      const trigger = new gpio(triggerPin, { mode: gpio.OUTPUT });
      const echo = new gpio(echoPin, { mode: gpio.INPUT });

      trigger.digitalWrite(0);
      setTimeout(() => {
        trigger.digitalWrite(1);
        setTimeout(() => {
          trigger.digitalWrite(0);
        }, 10);
      }, 2);

      // This is a simplified version - real implementation would measure echo time
      return this.simulateSensorValue('distance');
    } catch (error) {
      this.log('error', 'Ultrasonic sensor read error', { error: error.message });
      return this.simulateSensorValue('distance');
    }
  }

  async getSensorData() {
    const data = {};
    const enabledSensors = this.getEnabledSensors();

    for (const sensorType of enabledSensors) {
      const sensor = this.deviceConfig.sensors[sensorType];

      if (sensor.type === 'real') {
        data[sensorType] = this.readRealSensor(sensorType);
      } else {
        data[sensorType] = this.simulateSensorValue(sensorType);
      }
    }

    return data;
  }

  handleControlCommand(data) {
    this.log('info', 'Received control command', data);

    const { controlId, value } = data;
    const control = this.deviceConfig.controls[controlId];

    if (!control || !control.enabled) {
      this.log('warn', `Control ${controlId} not found or disabled`);
      return;
    }

    this.log('info', `Processing control command for ${controlId}`, {
      control: control,
      requestedValue: value,
      gpioAvailable: gpioAvailable,
      hasPinObject: this.gpioPins.has(controlId)
    });

    try {
      if (gpioAvailable) {
        if (control.type === 'digital_output') {
          const outputValue = control.inverted ? !value : value;
          const command = outputValue ? `raspi-gpio set ${control.pin} dh` : `raspi-gpio set ${control.pin} dl`;

          this.log('info', `Control command received - detailed breakdown:`, {
            controlId: controlId,
            requestedValue: value,
            inverted: control.inverted,
            outputValue: outputValue,
            command: command,
            explanation: `${value} (requested) -> ${outputValue} (after invert) -> ${command}`
          });

          exec(command, { timeout: 5000 }, (err, stdout, stderr) => {
            if (err) {
              this.log('error', `Failed to write to GPIO pin ${control.pin}`, {
                error: err.message,
                command: command
              });
            } else {
              this.log('info', `Control ${controlId} GPIO operation completed`, {
                pin: control.pin,
                command: command,
                success: true
              });
            }
          });

          this.controlStates.set(controlId, value);
        } else if (control.type === 'pwm_output') {
          // PWM control (0-255)
          const pwmValue = Math.max(0, Math.min(255, value));
          pin.pwmWrite(pwmValue);
          this.controlStates.set(controlId, pwmValue);

          this.log('info', `PWM control ${controlId} set to ${pwmValue}`, {
            pin: control.pin
          });
        }
      } else {
        this.log('info', `Simulated control: ${controlId} = ${value}`);
        this.controlStates.set(controlId, value);
      }

      // Send acknowledgment back to server
      if (this.socket) {
        this.socket.emit('control_status', {
          controlId,
          value,
          success: true,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      this.log('error', `Failed to execute control command ${controlId}`, {
        error: error.message
      });

      if (this.socket) {
        this.socket.emit('control_status', {
          controlId,
          value,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
  }

  setupSocketConnection() {
    const serverUrl = `http://${this.config.serverHost}:${this.config.serverPort}`;

    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      this.log('info', 'Connected to TrailCommand server');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // First authenticate with device auth code
      const authData = {
        auth_code: this.deviceAuthCode,
        device_info: {
          name: this.config.deviceName,
          type: this.config.deviceType,
          description: this.config.deviceDescription,
          uuid: this.config.deviceUuid
        }
      };

      this.log('info', 'Sending authentication', { hasAuthCode: !!this.deviceAuthCode });
      this.socket.emit('device-authenticate', authData);
    });

    this.socket.on('device-authenticated', (data) => {
      this.log('info', 'Device authenticated successfully', data);
      this.isAuthenticated = true;

      // Now register the device with sensor and control info
      const enabledSensors = this.getEnabledSensors();
      const enabledControls = Object.keys(this.deviceConfig.controls).filter(
        id => this.deviceConfig.controls[id].enabled
      );

      const registrationData = {
        deviceId: this.config.deviceId,
        deviceInfo: {
          name: this.config.deviceName,
          type: this.config.deviceType,
          description: this.config.deviceDescription,
          uuid: this.config.deviceUuid
        },
        sensors: enabledSensors,
        controls: enabledControls
      };

      this.log('info', 'Sending device registration', {
        sensors: enabledSensors.length,
        controls: enabledControls.length,
        deviceInfo: registrationData.deviceInfo
      });
      this.socket.emit('register-device', registrationData);
    });

    this.socket.on('device-registered', (data) => {
      this.log('info', 'Device registered successfully', data);
      this.isRegistered = true;
      this.startSendingData();
    });

    this.socket.on('device-registration-error', (data) => {
      this.log('error', 'Device registration failed', data);
    });

    this.socket.on('device-auth-error', (data) => {
      this.log('error', 'Socket authentication error', data);
    });

    this.socket.on('error', (data) => {
      this.log('error', 'Socket error', data);
    });

    // Listen for both possible event names to be safe
    this.socket.on('control-command', (data) => {
      this.log('info', 'Raw control command received via Socket.IO (control-command)', {
        rawData: data,
        timestamp: new Date().toISOString()
      });
      this.handleControlCommand(data);
    });

    this.socket.on('control_command', (data) => {
      this.log('info', 'Raw control command received via Socket.IO (control_command)', {
        rawData: data,
        timestamp: new Date().toISOString()
      });
      this.handleControlCommand(data);
    });

    this.socket.on('disconnect', (reason) => {
      this.log('warn', 'Disconnected from server', { reason });
      this.isConnected = false;
      this.isAuthenticated = false;
      this.stopSendingData();
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      this.log('error', 'Connection error', {
        error: error.message,
        attempt: this.reconnectAttempts
      });
    });

    this.socket.on('auth_error', (error) => {
      this.log('error', 'Authentication error', error);
      this.isAuthenticated = false;
    });
  }

  startSendingData() {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
    }

    this.dataInterval = setInterval(async () => {
      if (this.isConnected && this.isAuthenticated && this.isRegistered) {
        try {
          const sensorData = await this.getSensorData();

          // Convert to the format expected by the server
          const readings = Object.entries(sensorData).map(([sensor_id, value]) => ({
            sensor_id,
            value,
            quality: 100
          }));

          this.socket.emit('sensor-data', {
            readings: readings
          });

          this.log('debug', 'Sensor data sent', { readingsCount: readings.length });
        } catch (error) {
          this.log('error', 'Failed to send sensor data', { error: error.message });
        }
      }
    }, this.config.sendInterval);

    this.log('info', 'Started sending sensor data', {
      interval: this.config.sendInterval
    });
  }

  stopSendingData() {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
      this.log('info', 'Stopped sending sensor data');
    }
  }

  async start() {
    try {
      this.log('info', 'Starting TrailCommand ARM Client...');

      // Initialize GPIO first
      await this.initializeGPIO();

      // Try to setup device auth, but continue without it if it fails
      try {
        await this.setupDeviceAuth();
      } catch (error) {
        this.log('warn', 'Device authentication failed, connecting without auth code', { error: error.message });
        this.deviceAuthCode = null;
      }

      this.setupSocketConnection();

      this.log('info', 'ARM Client started successfully');
    } catch (error) {
      this.log('error', 'Failed to start ARM Client', { error: error.message });
      process.exit(1);
    }
  }

  async stop() {
    this.log('info', 'Stopping TrailCommand ARM Client...');

    this.stopSendingData();

    if (this.renewalInterval) {
      clearTimeout(this.renewalInterval);
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    await this.cleanupGPIO();

    this.log('info', 'ARM Client stopped');
  }
}

// Handle graceful shutdown
async function gracefulShutdown(client) {
  console.log('\nReceived shutdown signal, cleaning up...');
  try {
    await client.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the client if this file is run directly
if (require.main === module) {
  const client = new TrailCommandClient();

  process.on('SIGINT', () => gracefulShutdown(client));
  process.on('SIGTERM', () => gracefulShutdown(client));
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown(client);
  });

  client.start();
}

module.exports = TrailCommandClient;