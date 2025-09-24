# TrailCommand Web Server - Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. Server.js Syntax Error

**Error**:
```
/home/trailcommand/trailcommand-web/server.js: line 3: syntax error near unexpected token `('
```

**Causes**:
- Systemd trying to execute server.js directly instead of through Node.js
- File encoding issues (Windows line endings)
- Missing execute permissions

**Solutions**:

#### Option A: Check Systemd Service
```bash
# Check current service configuration
sudo systemctl cat trailcommand-web

# Should show: ExecStart=/usr/bin/node server.js
# NOT: ExecStart=/home/trailcommand/trailcommand-web/server.js

# If incorrect, fix it:
sudo systemctl edit trailcommand-web --full
# Change ExecStart to: ExecStart=/usr/bin/node server.js
sudo systemctl daemon-reload
```

#### Option B: Manual Testing
```bash
# Test server manually
sudo ./start-server.sh

# Or test as trailcommand user
sudo -u trailcommand bash
cd /home/trailcommand/trailcommand-web
node server.js
```

#### Option C: Fix File Encoding (if on Windows)
```bash
# Convert Windows line endings to Unix
sudo dos2unix /home/trailcommand/trailcommand-web/server.js

# Verify file is readable
file /home/trailcommand/trailcommand-web/server.js
head -5 /home/trailcommand/trailcommand-web/server.js
```

### 2. SSL Certificate Issues

**Error**:
```
SSL certificate error: ENOENT: no such file or directory
```

**Solutions**:
```bash
# Check if certificates exist
ls -la /etc/letsencrypt/live/app.trailcommandpro.com/

# Generate Let's Encrypt certificates
sudo certbot certonly --standalone -d app.trailcommandpro.com

# Check certificate permissions
sudo ls -la /etc/letsencrypt/live/app.trailcommandpro.com/
# Should be readable by trailcommand group

# Fix permissions if needed
sudo chgrp trailcommand /etc/letsencrypt/live/app.trailcommandpro.com/privkey.pem
sudo chmod 640 /etc/letsencrypt/live/app.trailcommandpro.com/privkey.pem
sudo chgrp trailcommand /etc/letsencrypt/live/app.trailcommandpro.com/fullchain.pem
sudo chmod 644 /etc/letsencrypt/live/app.trailcommandpro.com/fullchain.pem
```

### 3. Port Permission Issues

**Error**:
```
EACCES: permission denied to bind to port 443
```

**Solutions**:
```bash
# Check if service is running as root initially
sudo systemctl status trailcommand-web

# Verify User and Group settings in service file
sudo systemctl cat trailcommand-web | grep -E "User=|Group="
# Should show: User=root, Group=root (starts as root, then drops privileges)

# Check if port 443 is already in use
sudo netstat -tlnp | grep :443
# or
sudo ss -tlnp | grep :443
```

### 4. Node.js and Dependencies Issues

**Solutions**:
```bash
# Verify Node.js installation
node --version
npm --version

# Check if dependencies are installed
cd /home/trailcommand/trailcommand-web
ls -la node_modules/ | wc -l
# Should show many directories

# Reinstall dependencies if needed
sudo npm install --production

# Check build directory
ls -la build/
# Should contain React build files (index.html, static/, etc.)
```

### 5. User Permission Issues

**Error**:
```
Error: ENOENT: no such file or directory, open '/home/trailcommand/trailcommand-web/.env'
```

**Solutions**:
```bash
# Check user and file ownership
ls -la /home/trailcommand/trailcommand-web/
# Files should be owned by trailcommand:trailcommand

# Fix ownership if needed
sudo chown -R trailcommand:trailcommand /home/trailcommand/trailcommand-web/

# Check if .env file exists
ls -la /home/trailcommand/trailcommand-web/.env
# Should exist and be readable
```

## 🔧 Diagnostic Commands

### Check Service Status
```bash
sudo systemctl status trailcommand-web -l
```

### View Real-time Logs
```bash
sudo journalctl -u trailcommand-web -f
```

### View Recent Logs
```bash
sudo journalctl -u trailcommand-web -n 50
```

### Test SSL Connection
```bash
openssl s_client -connect localhost:443 -servername app.trailcommandpro.com
```

### Check if Server is Listening
```bash
sudo netstat -tlnp | grep :443
curl -k https://localhost/health
```

## 🚀 Step-by-Step Recovery

If everything is broken, try this recovery sequence:

### 1. Stop Service
```bash
sudo systemctl stop trailcommand-web
```

### 2. Test Manual Startup
```bash
sudo /home/trailcommand/trailcommand-web/start-server.sh
# Press Ctrl+C when done testing
```

### 3. Fix Issues Found
- Address any errors shown in manual startup
- Fix file permissions, SSL certificates, etc.

### 4. Restart Service
```bash
sudo systemctl daemon-reload
sudo systemctl start trailcommand-web
sudo systemctl status trailcommand-web
```

### 5. Monitor Logs
```bash
sudo journalctl -u trailcommand-web -f
```

## 🆘 Emergency Fallback

If you need the server running immediately:

### Option 1: Run as Regular User (Testing Only)
```bash
# Temporary solution - runs on different port
cd /home/trailcommand/trailcommand-web
PORT=8443 node server.js
# Access at https://app.trailcommandpro.com:8443
```

### Option 2: Disable SSL (Testing Only)
Edit server.js to use HTTP instead of HTTPS (not recommended for production)

## 📞 Getting Help

1. **Check Logs First**: Always start with `sudo journalctl -u trailcommand-web -n 50`
2. **Test Manually**: Use `./start-server.sh` for detailed diagnostics
3. **Check Permissions**: Verify file ownership and SSL certificate access
4. **Verify Environment**: Ensure all dependencies and build files are present