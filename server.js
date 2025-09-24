#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');

// Server configuration for containerized environment
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'production';

// Create Express app
const app = express();

// Trust proxy for Traefik/Kubernetes ingress
app.set('trust proxy', true);

// Security headers (adjusted for reverse proxy)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Only set HSTS if we're behind HTTPS proxy
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build'), {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true,
  index: false // Don't auto-serve index.html
}));

// Health check endpoint for Kubernetes readiness/liveness probes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV
  });
});

// Readiness probe endpoint
app.get('/ready', (req, res) => {
  // Check if build directory exists
  const buildDir = path.join(__dirname, 'build');
  if (!fs.existsSync(buildDir)) {
    return res.status(503).json({
      status: 'not ready',
      reason: 'build directory not found'
    });
  }

  res.json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint (basic)
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: process.version,
    platform: process.platform,
    arch: process.arch
  });
});

// Serve React app for all other routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Main server startup function
async function startServer() {
  try {
    console.log('🚀 Starting TrailCommand Web Server (Container Mode)...');
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Host: ${HOST}`);

    // Check if build directory exists
    const buildDir = path.join(__dirname, 'build');
    if (!fs.existsSync(buildDir)) {
      console.error('❌ Build directory not found. Ensure the container was built correctly.');
      process.exit(1);
    }

    console.log(`📁 Build directory found: ${buildDir}`);

    // Start HTTP server (SSL termination handled by Traefik)
    const server = app.listen(PORT, HOST, () => {
      console.log(`🌟 HTTP server running on http://${HOST}:${PORT}`);
      console.log(`📁 Serving files from: ${buildDir}`);
      console.log('🔒 SSL termination handled by ingress controller');
      console.log('✅ Server ready to accept connections');
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`\n📤 Received ${signal}, shutting down gracefully...`);

      server.close((err) => {
        if (err) {
          console.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }
        console.log('✅ Server closed successfully');
        process.exit(0);
      });

      // Force exit after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.error('⏰ Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else if (error.code === 'EACCES') {
        console.error(`❌ Permission denied to bind to port ${PORT}`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();