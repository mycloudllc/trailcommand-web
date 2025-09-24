#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Server configuration
const PORT = process.env.PORT || 443;
const HOST = process.env.HOST || '0.0.0.0';
const DROP_USER = process.env.DROP_USER || 'trailcommand';
const DROP_GROUP = process.env.DROP_GROUP || 'trailcommand';

// Function to load SSL config from CRACO if available
function getSSLConfig() {
  try {
    // Try to load CRACO config for SSL paths
    const cracoConfigPath = path.join(__dirname, 'craco.config.js');
    if (fs.existsSync(cracoConfigPath)) {
      delete require.cache[require.resolve('./craco.config.js')]; // Clear cache
      const cracoConfig = require('./craco.config.js');

      if (cracoConfig.devServer?.server?.options) {
        const options = cracoConfig.devServer.server.options;
        console.log('📋 Loading SSL config from CRACO configuration');
        return {
          key: options.key,
          cert: options.cert
        };
      }
    }
  } catch (error) {
    console.log('ℹ️  Could not load CRACO config, using environment/default paths');
  }

  // Fallback to environment variables or default paths
  const SSL_DOMAIN = process.env.SSL_DOMAIN || 'app.trailcommandpro.com';
  const SSL_KEY_PATH = process.env.SSL_KEY_PATH || `/etc/letsencrypt/live/${SSL_DOMAIN}/privkey.pem`;
  const SSL_CERT_PATH = process.env.SSL_CERT_PATH || `/etc/letsencrypt/live/${SSL_DOMAIN}/fullchain.pem`;

  console.log('📋 Using SSL certificate paths:');
  console.log(`   Key: ${SSL_KEY_PATH}`);
  console.log(`   Cert: ${SSL_CERT_PATH}`);

  return {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH)
  };
}

// Function to drop privileges safely
function dropPrivileges() {
  try {
    console.log('🔒 Starting privilege drop process...');

    // Check if we're running as root
    if (process.getuid && process.getuid() !== 0) {
      console.log('ℹ️  Not running as root, skipping privilege drop');
      return;
    }

    // Check if target user and group exist
    try {
      const userInfo = require('child_process').execSync(`id -u ${DROP_USER}`, { encoding: 'utf8' }).trim();
      const groupInfo = require('child_process').execSync(`id -g ${DROP_GROUP}`, { encoding: 'utf8' }).trim();

      console.log(`📋 Target user: ${DROP_USER} (UID: ${userInfo})`);
      console.log(`📋 Target group: ${DROP_GROUP} (GID: ${groupInfo})`);
    } catch (error) {
      console.error(`❌ User '${DROP_USER}' or group '${DROP_GROUP}' does not exist`);
      console.error('💡 Create the user with: sudo useradd -r -s /bin/false trailcommand');
      process.exit(1);
    }

    // Drop group privileges first
    if (process.setgid) {
      process.setgid(DROP_GROUP);
      console.log(`✅ Dropped group privileges to: ${DROP_GROUP}`);
    }

    // Drop user privileges
    if (process.setuid) {
      process.setuid(DROP_USER);
      console.log(`✅ Dropped user privileges to: ${DROP_USER}`);
    }

    // Verify privilege drop was successful
    if (process.getuid && process.getgid) {
      console.log(`🔐 Current UID: ${process.getuid()}, GID: ${process.getgid()}`);

      // Ensure we can't regain root privileges
      try {
        process.setuid(0);
        console.error('❌ SECURITY WARNING: Was able to regain root privileges!');
        process.exit(1);
      } catch (err) {
        console.log('✅ Successfully dropped privileges - cannot regain root');
      }
    }

    console.log('🎉 Privilege drop completed successfully');
  } catch (error) {
    console.error('❌ Failed to drop privileges:', error.message);
    process.exit(1);
  }
}

// Function to check SSL certificates
function checkSSLCertificates() {
  try {
    // Try to load SSL config - this will throw if certificates are not found
    const sslConfig = getSSLConfig();
    console.log('✅ SSL certificates found and readable');
    return { valid: true, config: sslConfig };
  } catch (error) {
    console.error('❌ SSL certificate error:', error.message);

    // Try to determine paths for help message
    const SSL_DOMAIN = process.env.SSL_DOMAIN || 'app.trailcommandpro.com';
    const keyPath = `/etc/letsencrypt/live/${SSL_DOMAIN}/privkey.pem`;
    const certPath = `/etc/letsencrypt/live/${SSL_DOMAIN}/fullchain.pem`;

    console.error('💡 For Let\'s Encrypt certificates, ensure certbot is installed and run:');
    console.error(`   sudo certbot certonly --standalone -d ${SSL_DOMAIN}`);
    console.error('💡 Or generate self-signed certificates with:');
    console.error('   sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\');
    console.error(`     -keyout ${keyPath} -out ${certPath}`);
    return { valid: false, config: null };
  }
}

// Create Express app
const app = express();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build'), {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true,
  index: false // Don't auto-serve index.html
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Main server startup function
async function startServer() {
  try {
    console.log('🚀 Starting TrailCommand Web Server...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Check if build directory exists
    const buildDir = path.join(__dirname, 'build');
    if (!fs.existsSync(buildDir)) {
      console.error('❌ Build directory not found. Run "npm run build" first.');
      process.exit(1);
    }

    // Check SSL certificates before binding to port
    const sslCheck = checkSSLCertificates();
    if (!sslCheck.valid) {
      console.error('❌ Cannot start HTTPS server without valid SSL certificates');
      process.exit(1);
    }

    // SSL options from CRACO config or fallback
    const sslOptions = sslCheck.config;

    // Create HTTPS server
    const server = https.createServer(sslOptions, app);

    // Start listening on privileged port
    server.listen(PORT, HOST, () => {
      console.log(`🌟 HTTPS server running on https://${HOST}:${PORT}`);
      console.log(`📁 Serving files from: ${buildDir}`);

      // Drop privileges after binding to port
      if (process.env.NODE_ENV === 'production') {
        dropPrivileges();
      } else {
        console.log('⚠️  Development mode: Skipping privilege drop');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n📤 Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else if (error.code === 'EACCES') {
        console.error(`❌ Permission denied to bind to port ${PORT}`);
        console.error('💡 Try running with sudo or use a port > 1024');
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();