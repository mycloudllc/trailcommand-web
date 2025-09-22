# Quick Setup Guide for TrailCommand ARM Client

## 1. Install Dependencies

```bash
npm install
```

## 2. GPIO Setup (Required for Raspberry Pi)

### Enable pigpio daemon
```bash
sudo systemctl enable pigpiod
sudo systemctl start pigpiod
```

### Fix GPIO Permissions
Choose one option:

**Option A: Add user to gpio group (recommended)**
```bash
sudo usermod -a -G gpio $USER
sudo reboot  # Required for group changes to take effect
```

**Option B: Run with sudo**
```bash
sudo node index.js
```

## 3. Configure Environment

```bash
cp .env.example .env
nano .env  # Edit with your server details
```

Example `.env`:
```env
SERVER_HOST=192.168.1.100
SERVER_PORT=3001
USERNAME=admin@trailcommand.local
PASSWORD=your_password
```

## 4. Test GPIO (Optional)

```bash
# Test relay manually
raspi-gpio set 22 op dh  # Relay ON
raspi-gpio set 22 op dl  # Relay OFF

# Test with our script
node test-relay.js
```

## 5. Run the Client

```bash
npm start
```

## 6. Verify Connection

Check the logs for:
- Config file loaded successfully
- GPIO pin 22 initialized for relay_1
- Connected to TrailCommand server
- Device authenticated successfully

## Common Issues

### Permission Denied
```bash
sudo usermod -a -G gpio $USER
sudo reboot
```

### pigpio not found
```bash
sudo apt update
sudo apt install pigpio
npm install pigpio
```

### Relay not responding
- Check wiring to GPIO pin 22
- Verify 5V power to relay module
- Test with: `raspi-gpio set 22 op dh`

## Wiring Diagram

```
Raspberry Pi     →    Relay Module
GPIO 22 (Pin 15) →    IN1
5V (Pin 2)       →    VCC
GND (Pin 6)      →    GND
```

## Service Setup (Auto-start)

```bash
sudo nano /etc/systemd/system/trailcommand-client.service
```

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

```bash
sudo systemctl enable trailcommand-client
sudo systemctl start trailcommand-client
sudo systemctl status trailcommand-client
```