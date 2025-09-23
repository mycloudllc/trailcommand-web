#!/bin/bash

# TrailCommand Web Server - User Setup Script
# This script creates a dedicated user for running the TrailCommand web server

set -e  # Exit on any error

USER_NAME="trailcommand"
GROUP_NAME="trailcommand"
HOME_DIR="/opt/trailcommand"

echo "🚀 Setting up TrailCommand user and permissions..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Create group if it doesn't exist
if ! getent group "$GROUP_NAME" > /dev/null 2>&1; then
    echo "👥 Creating group: $GROUP_NAME"
    groupadd --system "$GROUP_NAME"
else
    echo "✅ Group $GROUP_NAME already exists"
fi

# Create user if it doesn't exist
if ! id "$USER_NAME" > /dev/null 2>&1; then
    echo "👤 Creating user: $USER_NAME"
    useradd --system \
        --gid "$GROUP_NAME" \
        --home-dir "$HOME_DIR" \
        --create-home \
        --shell /bin/false \
        --comment "TrailCommand Web Server" \
        "$USER_NAME"
else
    echo "✅ User $USER_NAME already exists"
fi

# Create application directory if it doesn't exist
if [[ ! -d "$HOME_DIR" ]]; then
    echo "📁 Creating application directory: $HOME_DIR"
    mkdir -p "$HOME_DIR"
fi

# Set ownership and permissions
echo "🔒 Setting ownership and permissions..."
chown -R "$USER_NAME:$GROUP_NAME" "$HOME_DIR"
chmod 755 "$HOME_DIR"

# Create logs directory
LOG_DIR="/var/log/trailcommand"
if [[ ! -d "$LOG_DIR" ]]; then
    echo "📋 Creating log directory: $LOG_DIR"
    mkdir -p "$LOG_DIR"
    chown "$USER_NAME:$GROUP_NAME" "$LOG_DIR"
    chmod 755 "$LOG_DIR"
fi

# Create SSL directory with proper permissions
SSL_DIR="/etc/ssl/trailcommand"
if [[ ! -d "$SSL_DIR" ]]; then
    echo "🔐 Creating SSL directory: $SSL_DIR"
    mkdir -p "$SSL_DIR"
    chown root:$GROUP_NAME "$SSL_DIR"
    chmod 750 "$SSL_DIR"
fi

# Set up SSL certificate permissions (if they exist)
if [[ -f "/etc/ssl/private/trailcommand.key" ]]; then
    echo "🔑 Setting SSL key permissions..."
    chown root:$GROUP_NAME /etc/ssl/private/trailcommand.key
    chmod 640 /etc/ssl/private/trailcommand.key
fi

if [[ -f "/etc/ssl/certs/trailcommand.crt" ]]; then
    echo "📄 Setting SSL certificate permissions..."
    chown root:$GROUP_NAME /etc/ssl/certs/trailcommand.crt
    chmod 644 /etc/ssl/certs/trailcommand.crt
fi

# Create systemd override directory
SYSTEMD_DIR="/etc/systemd/system"
if [[ ! -d "$SYSTEMD_DIR" ]]; then
    mkdir -p "$SYSTEMD_DIR"
fi

echo ""
echo "✅ User setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "   User: $USER_NAME"
echo "   Group: $GROUP_NAME"
echo "   Home: $HOME_DIR"
echo "   Logs: $LOG_DIR"
echo "   SSL: $SSL_DIR"
echo ""
echo "🔧 Next steps:"
echo "   1. Copy your application files to $HOME_DIR"
echo "   2. Install SSL certificates"
echo "   3. Create systemd service file"
echo "   4. Start the service"
echo ""
echo "💡 To generate self-signed SSL certificates:"
echo "   sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
echo "     -keyout /etc/ssl/private/trailcommand.key \\"
echo "     -out /etc/ssl/certs/trailcommand.crt"
echo ""