#!/bin/bash

# TrailCommand Web Server - Deployment Script
# This script deploys the application with proper security setup

set -e  # Exit on any error

# Configuration
USER_NAME="trailcommand"
GROUP_NAME="trailcommand"
APP_DIR="/home/trailcommand/trailcommand-web"
SERVICE_NAME="trailcommand-web"

echo "🚀 Deploying TrailCommand Web Server..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Check if build directory exists
if [[ ! -d "./build" ]]; then
    echo "❌ Build directory not found. Run 'npm run build' first."
    exit 1
fi

# Create application directory if it doesn't exist
if [[ ! -d "$APP_DIR" ]]; then
    echo "📁 Creating application directory: $APP_DIR"
    mkdir -p "$APP_DIR"
fi

echo "📦 Copying application files..."

# Copy application files
cp -r ./build "$APP_DIR/"
cp ./server.js "$APP_DIR/"
cp ./package.json "$APP_DIR/"
cp ./.env.production "$APP_DIR/.env"
cp ./start-trailcommand.sh "$APP_DIR/"
cp ./craco.config.js "$APP_DIR/" 2>/dev/null || echo "ℹ️ craco.config.js not found, skipping"

# Install production dependencies
echo "📚 Installing Node.js dependencies..."
cd "$APP_DIR"
npm install --production --no-audit --no-fund

# Set ownership and permissions
echo "🔒 Setting ownership and permissions..."
chown -R "$USER_NAME:$GROUP_NAME" "$APP_DIR"
chmod -R 755 "$APP_DIR"
chmod 644 "$APP_DIR/.env"

# Make server.js executable
chmod +x "$APP_DIR/server.js"

# Verify Node.js installation and server.js syntax
echo "🔍 Checking Node.js and server.js..."
node --version
echo "📄 Checking server.js syntax:"
cd "$APP_DIR"
node -c server.js && echo "✅ server.js syntax is valid" || echo "❌ server.js syntax error"

# Copy and install systemd service
echo "⚙️ Installing systemd service..."
cp ./trailcommand-web.service /etc/systemd/system/
systemctl daemon-reload

# Enable and start the service
echo "🔄 Starting service..."
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

# Wait a moment for service to start
sleep 3

# Check service status
echo "📊 Service status:"
systemctl status "$SERVICE_NAME" --no-pager -l

# Show useful information
echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Service Information:"
echo "   Service: $SERVICE_NAME"
echo "   Status: $(systemctl is-active $SERVICE_NAME)"
echo "   Enabled: $(systemctl is-enabled $SERVICE_NAME)"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "   Restart: sudo systemctl restart $SERVICE_NAME"
echo "   Stop: sudo systemctl stop $SERVICE_NAME"
echo "   Status: sudo systemctl status $SERVICE_NAME"
echo ""
echo "🌐 Service should be running on https://localhost:443"
echo ""
echo "⚠️  Make sure you have:"
echo "   1. Valid SSL certificates installed"
echo "   2. Firewall configured to allow port 443"
echo "   3. DNS configured (if using a domain name)"