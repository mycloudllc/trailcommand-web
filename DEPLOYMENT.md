# TrailCommand Web Server - Secure Deployment Guide

This guide shows how to deploy the TrailCommand web application with privilege dropping for enhanced security.

## 🔒 Security Features

- **Privilege Dropping**: Starts as root to bind to port 443, then drops to unprivileged user
- **HTTPS Only**: Requires SSL certificates for secure connections
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

### 3. Generate SSL Certificates (if needed)
```bash
# Self-signed certificate (for testing)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/trailcommand.key \
  -out /etc/ssl/certs/trailcommand.crt

# Set proper permissions
sudo chown root:trailcommand /etc/ssl/private/trailcommand.key
sudo chmod 640 /etc/ssl/private/trailcommand.key
sudo chown root:trailcommand /etc/ssl/certs/trailcommand.crt
sudo chmod 644 /etc/ssl/certs/trailcommand.crt
```

### 4. Deploy the Application
```bash
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

## 🔧 Manual Setup (Step by Step)

### 1. Create Dedicated User
```bash
sudo useradd --system --create-home --home-dir /opt/trailcommand \
  --shell /bin/false --comment "TrailCommand Web Server" trailcommand
```

### 2. Copy Application Files
```bash
sudo mkdir -p /opt/trailcommand
sudo cp -r build /opt/trailcommand/
sudo cp server.js /opt/trailcommand/
sudo cp package.json /opt/trailcommand/
sudo cp .env.production /opt/trailcommand/.env
```

### 3. Install Dependencies
```bash
cd /opt/trailcommand
sudo npm install --production
```

### 4. Set Permissions
```bash
sudo chown -R trailcommand:trailcommand /opt/trailcommand
sudo chmod +x /opt/trailcommand/server.js
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
SSL_KEY_PATH=/etc/ssl/private/trailcommand.key
SSL_CERT_PATH=/etc/ssl/certs/trailcommand.crt
```

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
- `/opt/trailcommand/` (application files)
- `/etc/ssl/private/trailcommand.key` (SSL private key)
- `/etc/ssl/certs/trailcommand.crt` (SSL certificate)
- `/etc/systemd/system/trailcommand-web.service` (service config)

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