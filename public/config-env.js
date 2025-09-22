// Environment-based configuration override
// This script runs before the React app and can override config.json values
// with environment variables for production deployments

(function() {
  // Default configuration - matches config.json
  window.APP_CONFIG = {
    api: {
      host: "api.trailcommandpro.com",
      port: "443",
      protocol: "https",
      endpoints: {
        auth: "/auth",
        devices: "/devices",
        sensors: "/sensors",
        widgets: "/widgets",
        health: "/health"
      }
    },
    app: {
      name: "TrailCommand Pro",
      version: "1.0.0",
      polling: {
        sensorDataInterval: 5000,
        connectionCheckInterval: 60000
      },
      socket: {
        transports: ["polling", "websocket"],
        timeout: 20000,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        forceNew: true
      }
    },
    ui: {
      defaultTheme: "light",
      showServerConfig: false,
      adminRoles: ["admin", "superuser"]
    },
    features: {
      deviceManagement: true,
      widgetCustomization: true,
      realTimeUpdates: true,
      exportData: true
    }
  };

  // Override with environment variables if available
  // These would be set during build time or in Docker containers
  if (typeof process !== 'undefined' && process.env) {
    // API Configuration
    if (process.env.REACT_APP_API_HOST) {
      window.APP_CONFIG.api.host = process.env.REACT_APP_API_HOST;
    }
    if (process.env.REACT_APP_API_PORT) {
      window.APP_CONFIG.api.port = process.env.REACT_APP_API_PORT;
    }
    if (process.env.REACT_APP_API_PROTOCOL) {
      window.APP_CONFIG.api.protocol = process.env.REACT_APP_API_PROTOCOL;
    }

    // App Configuration
    if (process.env.REACT_APP_NAME) {
      window.APP_CONFIG.app.name = process.env.REACT_APP_NAME;
    }
    if (process.env.REACT_APP_VERSION) {
      window.APP_CONFIG.app.version = process.env.REACT_APP_VERSION;
    }
    if (process.env.REACT_APP_SENSOR_INTERVAL) {
      window.APP_CONFIG.app.polling.sensorDataInterval = parseInt(process.env.REACT_APP_SENSOR_INTERVAL);
    }

    // UI Configuration
    if (process.env.REACT_APP_SHOW_SERVER_CONFIG) {
      window.APP_CONFIG.ui.showServerConfig = process.env.REACT_APP_SHOW_SERVER_CONFIG === 'true';
    }
    if (process.env.REACT_APP_DEFAULT_THEME) {
      window.APP_CONFIG.ui.defaultTheme = process.env.REACT_APP_DEFAULT_THEME;
    }
  }

  console.log('Configuration loaded:', window.APP_CONFIG);
})();