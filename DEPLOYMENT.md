# TrailCommand Web Server - Secure Deployment Guide

This guide shows how to deploy the TrailCommand web application with privilege dropping for enhanced security.

## 🔒 Security Features

- **Privilege Dropping**: Starts as root to bind to port 443, then drops to unprivileged user
- **HTTPS Only**: Requires SSL certificates for secure connections
- **CRACO Integration**: Uses the same SSL certificate paths as your development environment
- **Let's Encrypt Support**: Automatically reads Let's Encrypt certificates
- **Systemd Integration**: Managed by systemd with security hardening
- **Process Isolation**: Restricted file system and network access

## 📋 Prerequisites

- Ubuntu/Debian/CentOS/RHEL Linux server
- Node.js 16+ installed
- Root access for initial setup
- SSL certificates (self-signed or from CA)

## 🚀 Quick Deployment

### 1. Build the Application
```bash
npm install
npm run build
```

### 2. Create User and Setup Permissions
```bash
sudo chmod +x setup-user.sh
sudo ./setup-user.sh
```

### 3. Generate SSL Certificates (if not already done)
The server uses the same SSL certificate paths as your CRACO development configuration.

```bash
# Option A: Let's Encrypt (Production - Recommended)
sudo apt install certbot  # Ubuntu/Debian
# or
sudo yum install certbot   # CentOS/RHEL

sudo certbot certonly --standalone -d app.trailcommandpro.com

# Option B: Self-signed certificate (Testing only)
sudo mkdir -p /etc/letsencrypt/live/app.trailcommandpro.com
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/letsencrypt/live/app.trailcommandpro.com/privkey.pem \
  -out /etc/letsencrypt/live/app.trailcommandpro.com/fullchain.pem
```

### 4. Deploy the Application
```bash
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

## 🔧 Manual Setup (Step by Step)

### 1. Create Dedicated User
```bash
sudo useradd --system --create-home --home-dir /home/trailcommand \
  --shell /bin/false --comment "TrailCommand Web Server" trailcommand
```

### 2. Copy Application Files
```bash
sudo mkdir -p /home/trailcommand/trailcommand-web
sudo cp -r build /home/trailcommand/trailcommand-web/
sudo cp server.js /home/trailcommand/trailcommand-web/
sudo cp package.json /home/trailcommand/trailcommand-web/
sudo cp .env.production /home/trailcommand/trailcommand-web/.env
```

### 3. Install Dependencies
```bash
cd /home/trailcommand/trailcommand-web
sudo npm install --production
```

### 4. Set Permissions
```bash
sudo chown -R trailcommand:trailcommand /home/trailcommand
sudo chmod +x /home/trailcommand/trailcommand-web/server.js
```

### 5. Install Systemd Service
```bash
sudo cp trailcommand-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable trailcommand-web
sudo systemctl start trailcommand-web
```

## 📊 Management Commands

### Service Management
```bash
# View status
sudo systemctl status trailcommand-web

# Start/Stop/Restart
sudo systemctl start trailcommand-web
sudo systemctl stop trailcommand-web
sudo systemctl restart trailcommand-web

# Enable/Disable auto-start
sudo systemctl enable trailcommand-web
sudo systemctl disable trailcommand-web
```

### Logs
```bash
# View recent logs
sudo journalctl -u trailcommand-web -n 50

# Follow logs in real-time
sudo journalctl -u trailcommand-web -f

# View logs since last hour
sudo journalctl -u trailcommand-web --since "1 hour ago"
```

## 🔍 Security Verification

### Check Process User
```bash
# Verify the process is running as the correct user
ps aux | grep "node.*server.js"
# Should show 'trailcommand' as the user after startup
```

### Check Port Binding
```bash
# Verify the service is listening on port 443
sudo netstat -tlnp | grep :443
# or
sudo ss -tlnp | grep :443
```

### Check SSL Certificate
```bash
# Test SSL connection
openssl s_client -connect localhost:443 -servername yourdomain.com
```

## 🛠 Configuration Options

### Environment Variables (.env.production)
```bash
NODE_ENV=production
PORT=443
HOST=0.0.0.0
DROP_USER=trailcommand
DROP_GROUP=trailcommand
SSL_DOMAIN=app.trailcommandpro.com
SSL_KEY_PATH=/etc/letsencrypt/live/app.trailcommandpro.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/app.trailcommandpro.com/fullchain.pem
```

### CRACO Integration
The production server automatically reads SSL configuration from your `craco.config.js` file if present, ensuring consistency between development and production environments.

**How it works:**
1. Server tries to load SSL paths from `craco.config.js`
2. Falls back to environment variables if CRACO config not available
3. Uses default Let's Encrypt paths as final fallback

This means your existing Let's Encrypt certificates at `/etc/letsencrypt/live/app.trailcommandpro.com/` will be automatically detected and used.

**Application Directory**: `/home/trailcommand/trailcommand-web/`

### Systemd Service Customization
Edit `/etc/systemd/system/trailcommand-web.service` to modify:
- Environment variables
- Security settings
- Resource limits
- Restart behavior

## 🔥 Firewall Configuration

### UFW (Ubuntu)
```bash
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp  # For HTTP redirect (optional)
```

### Firewalld (CentOS/RHEL)
```bash
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=http  # Optional
sudo firewall-cmd --reload
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied on Port 443**
   - Ensure the service starts as root before dropping privileges
   - Check that the user creation script ran successfully

2. **SSL Certificate Errors**
   - Verify certificate files exist and are readable
   - Check file permissions (640 for key, 644 for cert)
   - Ensure certificates are valid and not expired

3. **Service Won't Start**
   - Check logs: `sudo journalctl -u trailcommand-web -n 50`
   - Verify Node.js is installed and in PATH
   - Check that build directory exists

4. **Privilege Drop Failures**
   - Ensure trailcommand user exists: `id trailcommand`
   - Check that the user has proper permissions

### Health Check
The server includes a health check endpoint:
```bash
curl -k https://localhost/health
```

## 🔄 Updates and Maintenance

### Update Application
```bash
# Stop service
sudo systemctl stop trailcommand-web

# Update code and rebuild
git pull
npm install
npm run build

# Redeploy
sudo ./deploy.sh
```

### Backup
Important files to backup:
- `/home/trailcommand/trailcommand-web/` (application files)
- `/etc/letsencrypt/live/app.trailcommandpro.com/` (SSL certificates)
- `/etc/systemd/system/trailcommand-web.service` (service config)
- `/var/log/trailcommand/` (log files)

## 🔐 Security Best Practices

1. **Regular Updates**: Keep Node.js and dependencies updated
2. **SSL Certificates**: Use proper CA-signed certificates in production
3. **Firewall**: Only allow necessary ports (443, and optionally 80 for redirects)
4. **Monitoring**: Set up log monitoring and alerting
5. **Backups**: Regular backups of application and SSL certificates
6. **Access Control**: Limit SSH access and use key-based authentication

## 📞 Support

For issues or questions:
1. Check logs first: `sudo journalctl -u trailcommand-web -f`
2. Verify configuration and permissions
3. Test with `curl -k https://localhost/health`
4. Review this documentation for common solutions