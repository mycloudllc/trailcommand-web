#!/usr/bin/env node

/**
 * Configuration Generator for TrailCommand Pro
 * Generates config.json from environment variables for Docker deployments
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const defaultConfig = {
  api: {
    host: process.env.REACT_APP_API_HOST || "api.trailcommandpro.com",
    port: process.env.REACT_APP_API_PORT || "443",
    protocol: process.env.REACT_APP_API_PROTOCOL || "https",
    endpoints: {
      auth: "/auth",
      devices: "/devices",
      sensors: "/sensors",
      widgets: "/widgets",
      health: "/health"
    }
  },
  app: {
    name: process.env.REACT_APP_NAME || "TrailCommand Pro",
    version: process.env.REACT_APP_VERSION || "1.0.0",
    polling: {
      sensorDataInterval: parseInt(process.env.REACT_APP_SENSOR_INTERVAL) || 5000,
      connectionCheckInterval: parseInt(process.env.REACT_APP_CONNECTION_CHECK_INTERVAL) || 60000
    },
    socket: {
      transports: ["polling", "websocket"],
      timeout: parseInt(process.env.REACT_APP_SOCKET_TIMEOUT) || 20000,
      reconnectionAttempts: parseInt(process.env.REACT_APP_SOCKET_RECONNECT_ATTEMPTS) || 3,
      reconnectionDelay: parseInt(process.env.REACT_APP_SOCKET_RECONNECT_DELAY) || 1000,
      forceNew: true
    }
  },
  ui: {
    defaultTheme: process.env.REACT_APP_DEFAULT_THEME || "light",
    showServerConfig: process.env.REACT_APP_SHOW_SERVER_CONFIG === 'true',
    adminRoles: (process.env.REACT_APP_ADMIN_ROLES || "admin,superuser").split(',')
  },
  features: {
    deviceManagement: process.env.REACT_APP_ENABLE_DEVICE_MANAGEMENT !== 'false',
    widgetCustomization: process.env.REACT_APP_ENABLE_WIDGET_CUSTOMIZATION !== 'false',
    realTimeUpdates: process.env.REACT_APP_ENABLE_REALTIME_UPDATES !== 'false',
    exportData: process.env.REACT_APP_ENABLE_DATA_EXPORT !== 'false'
  },
  build: {
    date: process.env.REACT_APP_BUILD_DATE || new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  }
};

// Generate config file
const outputPath = path.join(process.cwd(), 'public', 'config.json');

try {
  fs.writeFileSync(outputPath, JSON.stringify(defaultConfig, null, 2));
  console.log('✅ Configuration generated successfully:', outputPath);
  console.log('📡 API Host:', defaultConfig.api.host);
  console.log('🔌 API Port:', defaultConfig.api.port);
  console.log('🎨 Theme:', defaultConfig.ui.defaultTheme);
  console.log('👑 Admin Roles:', defaultConfig.ui.adminRoles.join(', '));
} catch (error) {
  console.error('❌ Error generating configuration:', error);
  process.exit(1);
}