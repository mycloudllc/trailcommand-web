#!/bin/bash

# TrailCommand Web Server - Production Startup Script
# This script is executed by systemd to start the TrailCommand web server

set -e  # Exit on any error

# Configuration
APP_DIR="/home/trailcommand/trailcommand-web"
LOG_FILE="/var/log/trailcommand/startup.log"
USER_NAME="trailcommand"
GROUP_NAME="trailcommand"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
handle_error() {
    log "❌ ERROR: $1"
    exit 1
}

# Start the server
main() {
    log "🚀 Starting TrailCommand Web Server..."
    log "📍 Working directory: $APP_DIR"
    log "👤 Running as user: $(whoami) (UID: $(id -u))"

    # Change to application directory
    cd "$APP_DIR" || handle_error "Cannot change to directory $APP_DIR"
    log "✅ Changed to application directory"

    # Check if we're running as root (required for port 443)
    if [[ $EUID -ne 0 ]]; then
        handle_error "Must run as root to bind to port 443"
    fi

    # Verify Node.js is available
    if ! command -v node >/dev/null 2>&1; then
        handle_error "Node.js not found in PATH"
    fi

    NODE_VERSION=$(node --version)
    log "📦 Node.js version: $NODE_VERSION"

    # Check required files exist
    if [[ ! -f "server.js" ]]; then
        handle_error "server.js not found"
    fi

    if [[ ! -f "package.json" ]]; then
        handle_error "package.json not found"
    fi

    if [[ ! -d "build" ]]; then
        handle_error "build directory not found - run 'npm run build' first"
    fi

    if [[ ! -d "node_modules" ]]; then
        handle_error "node_modules directory not found - run 'npm install' first"
    fi

    # Check .env file
    if [[ ! -f ".env" ]]; then
        log "⚠️ Warning: .env file not found, using defaults"
    else
        log "✅ .env file found"
    fi

    # Verify SSL certificates (if specified)
    SSL_DOMAIN="${SSL_DOMAIN:-app.trailcommandpro.com}"
    SSL_KEY_PATH="${SSL_KEY_PATH:-/etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem}"
    SSL_CERT_PATH="${SSL_CERT_PATH:-/etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem}"

    log "🔐 Checking SSL certificates..."
    if [[ -f "$SSL_KEY_PATH" && -f "$SSL_CERT_PATH" ]]; then
        log "✅ SSL certificates found"
        log "   Key: $SSL_KEY_PATH"
        log "   Cert: $SSL_CERT_PATH"

        # Check if we can read the certificates
        if [[ -r "$SSL_KEY_PATH" && -r "$SSL_CERT_PATH" ]]; then
            log "✅ SSL certificates are readable"
        else
            handle_error "SSL certificates exist but are not readable by current user"
        fi
    else
        handle_error "SSL certificates not found at $SSL_KEY_PATH or $SSL_CERT_PATH"
    fi

    # Set up environment variables
    export NODE_ENV="${NODE_ENV:-production}"
    export PORT="${PORT:-443}"
    export HOST="${HOST:-0.0.0.0}"
    export DROP_USER="${DROP_USER:-$USER_NAME}"
    export DROP_GROUP="${DROP_GROUP:-$GROUP_NAME}"
    export SSL_DOMAIN="$SSL_DOMAIN"
    export SSL_KEY_PATH="$SSL_KEY_PATH"
    export SSL_CERT_PATH="$SSL_CERT_PATH"

    log "🌍 Environment variables set:"
    log "   NODE_ENV=$NODE_ENV"
    log "   PORT=$PORT"
    log "   HOST=$HOST"
    log "   DROP_USER=$DROP_USER"
    log "   DROP_GROUP=$DROP_GROUP"

    # Validate server.js syntax
    log "📄 Checking server.js syntax..."
    if ! node -c server.js; then
        handle_error "server.js has syntax errors"
    fi
    log "✅ server.js syntax is valid"

    # Check if target user exists for privilege dropping
    if ! id "$DROP_USER" >/dev/null 2>&1; then
        handle_error "User '$DROP_USER' does not exist - run setup-user.sh first"
    fi

    if ! getent group "$DROP_GROUP" >/dev/null 2>&1; then
        handle_error "Group '$DROP_GROUP' does not exist - run setup-user.sh first"
    fi

    log "👥 Target user/group for privilege dropping: $DROP_USER:$DROP_GROUP"

    # Start the Node.js server
    log "🎬 Starting Node.js server..."
    log "   Command: node server.js"
    log "   The server will drop privileges after binding to port $PORT"
    log ""

    # Execute the Node.js server
    exec node server.js
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Redirect stderr to our log function
exec 2> >(while read line; do log "STDERR: $line"; done)

# Run main function
main "$@"