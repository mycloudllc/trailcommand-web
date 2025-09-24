#!/bin/bash

# TrailCommand Web Server - Manual Start Script
# This script helps debug server startup issues

set -e

APP_DIR="/home/trailcommand/trailcommand-web"

echo "🚀 Starting TrailCommand Web Server manually..."
echo "📍 Working directory: $APP_DIR"

# Change to app directory
cd "$APP_DIR"

# Check environment
echo "🔍 Environment check:"
echo "   Node.js version: $(node --version)"
echo "   NPM version: $(npm --version)"
echo "   Current directory: $(pwd)"
echo "   Current user: $(whoami)"
echo "   User ID: $(id)"

# Check required files
echo ""
echo "📁 File check:"
ls -la server.js package.json .env 2>/dev/null || echo "Some files missing"

# Check syntax
echo ""
echo "📄 Syntax check:"
node -c server.js && echo "✅ server.js syntax is valid" || echo "❌ server.js has syntax errors"

# Check SSL certificates
echo ""
echo "🔐 SSL certificate check:"
SSL_DOMAIN="${SSL_DOMAIN:-app.trailcommandpro.com}"
if [[ -f "/etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem" ]]; then
    echo "✅ Private key found"
    ls -la "/etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem"
else
    echo "❌ Private key not found at /etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem"
fi

if [[ -f "/etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem" ]]; then
    echo "✅ Certificate found"
    ls -la "/etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem"
else
    echo "❌ Certificate not found at /etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem"
fi

# Check dependencies
echo ""
echo "📦 Dependencies check:"
if [[ -d "node_modules" ]]; then
    echo "✅ node_modules directory exists"
else
    echo "❌ node_modules directory missing - run: npm install"
fi

# Check build directory
if [[ -d "build" ]]; then
    echo "✅ build directory exists"
    echo "   Files: $(ls build/ | wc -l) files"
else
    echo "❌ build directory missing - run: npm run build"
fi

echo ""
echo "🎬 Starting server with debugging..."
echo "   Command: NODE_ENV=production node server.js"
echo "   Press Ctrl+C to stop"
echo ""

# Start server with environment variables
NODE_ENV=production \
PORT=443 \
HOST=0.0.0.0 \
DROP_USER=trailcommand \
DROP_GROUP=trailcommand \
SSL_DOMAIN=app.trailcommandpro.com \
node server.js