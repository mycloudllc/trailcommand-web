#!/bin/bash

# TrailCommand Web Server - User Setup Script
# This script creates a dedicated user for running the TrailCommand web server

set -e  # Exit on any error

USER_NAME="trailcommand"
GROUP_NAME="trailcommand"
HOME_DIR="/home/trailcommand"
APP_DIR="/home/trailcommand/trailcommand-web"

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
if [[ ! -d "$APP_DIR" ]]; then
    echo "📁 Creating application directory: $APP_DIR"
    mkdir -p "$APP_DIR"
fi

# Set ownership and permissions
echo "🔒 Setting ownership and permissions..."
chown -R "$USER_NAME:$GROUP_NAME" "$HOME_DIR"
chmod 755 "$HOME_DIR"
chmod 755 "$APP_DIR"

# Create logs directory
LOG_DIR="/var/log/trailcommand"
if [[ ! -d "$LOG_DIR" ]]; then
    echo "📋 Creating log directory: $LOG_DIR"
    mkdir -p "$LOG_DIR"
    chown "$USER_NAME:$GROUP_NAME" "$LOG_DIR"
    chmod 755 "$LOG_DIR"
fi

# Set up Let's Encrypt certificate permissions (if they exist)
SSL_DOMAIN="${SSL_DOMAIN:-app.trailcommandpro.com}"
LETSENCRYPT_DIR="/etc/letsencrypt/live/$SSL_DOMAIN"

if [[ -d "$LETSENCRYPT_DIR" ]]; then
    echo "🔐 Setting Let's Encrypt certificate permissions for $SSL_DOMAIN..."

    # Add trailcommand user to ssl-cert group (if it exists)
    if getent group ssl-cert > /dev/null 2>&1; then
        usermod -a -G ssl-cert "$USER_NAME"
        echo "✅ Added $USER_NAME to ssl-cert group"
    fi

    # Set group ownership to allow reading certificates
    if [[ -f "$LETSENCRYPT_DIR/privkey.pem" ]]; then
        chgrp $GROUP_NAME "$LETSENCRYPT_DIR/privkey.pem"
        chmod 640 "$LETSENCRYPT_DIR/privkey.pem"
        echo "🔑 Set permissions for private key"
    fi

    if [[ -f "$LETSENCRYPT_DIR/fullchain.pem" ]]; then
        chgrp $GROUP_NAME "$LETSENCRYPT_DIR/fullchain.pem"
        chmod 644 "$LETSENCRYPT_DIR/fullchain.pem"
        echo "📄 Set permissions for certificate"
    fi

    # Set directory permissions
    chgrp $GROUP_NAME "$LETSENCRYPT_DIR"
    chmod 750 "$LETSENCRYPT_DIR"
else
    echo "ℹ️  Let's Encrypt certificates not found at $LETSENCRYPT_DIR"
    echo "💡 Generate certificates with: sudo certbot certonly --standalone -d $SSL_DOMAIN"
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
echo "   App Directory: $APP_DIR"
echo "   Logs: $LOG_DIR"
echo "   SSL: Let's Encrypt certificates"
echo ""
echo "🔧 Next steps:"
echo "   1. Copy your application files to $APP_DIR"
echo "   2. Install SSL certificates"
echo "   3. Create systemd service file"
echo "   4. Start the service"
echo ""
echo "💡 To generate Let's Encrypt certificates:"
echo "   sudo apt install certbot  # or yum install certbot"
echo "   sudo certbot certonly --standalone -d $SSL_DOMAIN"
echo ""
echo "💡 Or generate self-signed certificates:"
echo "   sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
echo "     -keyout /etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem \\"
echo "     -out /etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem"
echo ""