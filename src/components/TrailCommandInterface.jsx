import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import GaugeComponent from 'react-gauge-component';
import ModernGauge from './ModernGauge';
import { ClassicGauge, MinimalGauge, NeonGauge } from './GaugeVariants';
import TankGauge from './TankGauge';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { 
  Power, 
  Thermometer, 
  Lightbulb, 
  Gauge, 
  Wifi, 
  WifiOff, 
  Settings, 
  Plus,
  RefreshCw,
  User,
  Bell,
  ChevronDown,
  Activity,
  Smartphone,
  Edit3,
  Save,
  X,
  Grip,
  BarChart3,
  Zap,
  Droplets,
  Wind,
  Sun,
  Moon,
  Clock,
  Trash2,
  Copy,
  Move,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Menu,
  Triangle,
  LogIn,
  LogOut,
  Database,
  Monitor,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Helper function to get default units for sensor types
const getSensorUnit = (sensorType) => {
  const units = {
    temperature: '°C',
    humidity: '%',
    pressure: 'hPa',
    battery: '%',
    light: 'lux',
    motion: '',
    distance: 'cm'
  };
  return units[sensorType] || '';
};

// Helper function to get control type
const getControlType = (controlId) => {
  // Handle both string and object inputs
  const id = typeof controlId === 'string' ? controlId : controlId.control_id;

  if (id && id.includes('relay') || id && id.includes('led') || id && id.includes('switch')) {
    return 'digital';
  } else if (id && id.includes('fan') || id && id.includes('pwm') || id && id.includes('servo')) {
    return 'analog';
  }
  return 'digital'; // default
};

// Helper function to get control description
const getControlDescription = (controlId) => {
  // Handle both string and object inputs
  const id = typeof controlId === 'string' ? controlId : controlId.control_id;

  const descriptions = {
    relay_1: 'Main relay control',
    led_builtin: 'Status LED',
    fan_control: 'PWM fan speed',
    servo_1: 'Servo motor position'
  };
  return descriptions[id] || `Control for ${id}`;
};

// Cookie utility functions for secure token storage
const CookieHelper = {
  set(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    const secure = window.location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict${secure}`;
  },

  get(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  },

  delete(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }
};

const TrailCommandInterface = () => {
  // Authentication state
  const [user, setUser] = useState(null);
  // Initialize token with migration from localStorage to cookies
  const [token, setToken] = useState(() => {
    // First check cookies
    let storedToken = CookieHelper.get('trailcommand-token');
    console.log('🔄 Initializing token from cookies:', storedToken ? 'Token found' : 'No token');

    // If no cookie, check localStorage (migration)
    if (!storedToken) {
      const localToken = localStorage.getItem('trailcommand-token');
      if (localToken) {
        console.log('📦 Migrating token from localStorage to cookie');
        CookieHelper.set('trailcommand-token', localToken, 7);
        localStorage.removeItem('trailcommand-token'); // Clean up old storage
        storedToken = localToken;
      }
    }

    return storedToken || '';
  });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registrationForm, setRegistrationForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [showLogin, setShowLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [registrationError, setRegistrationError] = useState('');
  
  // App state
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [resizingWidget, setResizingWidget] = useState(null);
  const [resizeStartPos, setResizeStartPos] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [selectedWidgetType, setSelectedWidgetType] = useState(null);
  const [appConfig, setAppConfig] = useState(null);
  const [serverConfig, setServerConfig] = useState({
    host: 'api.trailcommandpro.com',
    port: '443'
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deleteDeviceModal, setDeleteDeviceModal] = useState(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [widgetSettings, setWidgetSettings] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [socketConnection, setSocketConnection] = useState(null);
  const [isConnectingSocket, setIsConnectingSocket] = useState(false);
  const socketConnectionRef = useRef(null);
  const healthCheckInProgress = useRef(false);
  const connectionTimeoutRef = useRef(null);
  const lastConnectionAttempt = useRef(0);
  const CONNECTION_COOLDOWN = 5000; // 5 seconds between connection attempts
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showDeviceAuthModal, setShowDeviceAuthModal] = useState(null);
  const [authCodePassword, setAuthCodePassword] = useState('');
  const [showFullAuthCode, setShowFullAuthCode] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState('profile');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: 'sensor',
    description: '',
    location: ''
  });
  const [userSettings, setUserSettings] = useState({
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    theme: CookieHelper.get('trailcommand-theme') || 'light',
    notifications: {
      email: true,
      browser: true,
      alerts: true
    },
    dashboard: {
      autoRefresh: true,
      refreshInterval: 30,
      showTooltips: true
    }
  });
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Dynamic sensor loading
  const [availableSensors, setAvailableSensors] = useState([]);
  const [availableControls, setAvailableControls] = useState([]);

  const dashboardRef = useRef(null);

  // Load application configuration
  const loadAppConfig = useCallback(async () => {
    try {
      // First check for environment-based config
      if (window.APP_CONFIG) {
        console.log('Using environment-based configuration');
        const config = window.APP_CONFIG;
        setAppConfig(config);

        // Update server config from loaded config
        setServerConfig({
          host: config.api.host,
          port: config.api.port
        });

        console.log('Environment configuration loaded:', config);
        return config;
      }

      // Fallback to config.json
      const response = await fetch('/config.json');
      if (response.ok) {
        const config = await response.json();
        setAppConfig(config);

        // Update server config from loaded config
        setServerConfig({
          host: config.api.host,
          port: config.api.port
        });

        console.log('JSON configuration loaded:', config);
        return config;
      } else {
        console.warn('Could not load config.json, using defaults');
        return null;
      }
    } catch (error) {
      console.error('Error loading config:', error);
      return null;
    }
  }, []);

  // Load config on component mount
  useEffect(() => {
    loadAppConfig();
  }, []); // Remove loadAppConfig dependency to prevent infinite loop

  // Validate existing token and restore user session on component mount
  useEffect(() => {
    const validateToken = async () => {
      // If we have a token but no user, validate the token and fetch user details
      if (token && !user) {
        console.log('🔍 Validating existing token on page load...');
        try {
          const userResponse = await fetch(`${TrailCommandAPI.baseUrl()}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('✅ Token validation successful, user restored:', userData.username);
            setUser(userData);
          } else {
            console.warn('❌ Token validation failed, removing invalid token');
            // Token is invalid, clear it
            setToken('');
            CookieHelper.delete('trailcommand-token');
          }
        } catch (error) {
          console.error('Token validation error:', error);
          // On network error, keep token but don't set user (will show login)
          // This allows for temporary network issues
        }
      }
    };

    validateToken();
  }, []); // Only run once on mount

  // Log authentication state changes (only when state actually changes)
  useEffect(() => {
    console.log('🔐 Authentication state changed:', {
      hasToken: !!token,
      hasUser: !!user,
      tokenLength: token ? token.length : 0,
      username: user?.username || 'null'
    });
  }, [token, user]); // Only run when token or user changes

  // Check if current user is admin
  const isAdmin = useCallback(() => {
    if (!user || !appConfig) return false;
    const adminRoles = appConfig.ui?.adminRoles || ['admin', 'superuser'];
    return adminRoles.includes(user.role);
  }, [user, appConfig]);

  // Check if server config should be shown
  const shouldShowServerConfig = useCallback(() => {
    if (!appConfig) return true; // Show by default if config not loaded
    return appConfig.ui?.showServerConfig !== false && isAdmin();
  }, [appConfig, isAdmin]);

  // TrailCommand API
  const TrailCommandAPI = {
    baseUrl: () => {
      if (!serverConfig.host || !serverConfig.port) {
        console.error('Invalid server configuration in baseUrl:', serverConfig);
        return 'https://api.trailcommandpro.com/api'; // Fallback
      }
      return `https://api.trailcommandpro.com/api`;
    },
    
    getAuthHeaders: () => ({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }),

    // Authentication
    async login(email, password) {
      try {
        const response = await fetch(`${this.baseUrl()}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
          const data = await response.json();
          return data;
        }
        throw new Error('Login failed');
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    async register(userData) {
      try {
        const response = await fetch(`${this.baseUrl()}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });

        if (response.ok) {
          const data = await response.json();
          return data;
        }

        // Try to get error message from JSON response
        let errorMessage = `Registration failed (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, try to get response text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (textError) {
            // Use the default message with status code
          }
        }
        throw new Error(errorMessage);
      } catch (error) {
        console.error('Registration error:', error);
        // If it's already an Error object, re-throw it
        if (error instanceof Error) {
          throw error;
        }
        // Otherwise create a new Error
        throw new Error('Registration failed - network error');
      }
    },

    async getCurrentUser() {
      try {
        console.log('Making getCurrentUser request to:', `${this.baseUrl()}/auth/me`);
        const response = await fetch(`${this.baseUrl()}/auth/me`, {
          headers: this.getAuthHeaders()
        });

        console.log('getCurrentUser response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('getCurrentUser success:', data);
          return data;
        } else {
          const errorText = await response.text();
          console.error('getCurrentUser failed:', { status: response.status, error: errorText });
          return null;
        }
      } catch (error) {
        console.error('getCurrentUser network error:', error);
        throw error; // Re-throw to handle in useEffect
      }
    },

    // Device management
    async getDevices() {
      try {
        const response = await fetch(`${this.baseUrl()}/devices`, {
          headers: this.getAuthHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          return { devices: data };  // API returns devices array directly
        }
        return { devices: [] };
      } catch (error) {
        console.error('Get devices error:', error);
        return { devices: [] };
      }
    },

    async getDevice(deviceId) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}`, {
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Get device error:', error);
        return null;
      }
    },

    async getSensors(deviceId) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}/sensors`, {
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : { sensors: [] };
      } catch (error) {
        console.error('Get sensors error:', error);
        return { sensors: [] };
      }
    },

    async getControls(deviceId) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}/controls`, {
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : { controls: [] };
      } catch (error) {
        console.error('Get controls error:', error);
        return { controls: [] };
      }
    },

    async getLatestSensorValues(deviceId) {
      try {
        const response = await fetch(`${this.baseUrl()}/sensors/${deviceId}`, {
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : { sensors: [] };
      } catch (error) {
        console.error('Get latest sensor values error:', error);
        return { sensors: [] };
      }
    },

    async createDevice(deviceData) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(deviceData)
        });
        if (response.ok) {
          return await response.json();
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create device');
        }
      } catch (error) {
        console.error('Create device error:', error);
        throw error;
      }
    },

    async deleteDevice(deviceId) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Delete device error:', error);
        return null;
      }
    },

    // Device authentication
    async generateDeviceAuth(deviceId) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}/generate-auth`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Generate device auth error:', error);
        return null;
      }
    },

    async revokeDeviceAuth(deviceId) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}/revoke-auth`, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Revoke device auth error:', error);
        return null;
      }
    },

    async addSensor(deviceId, sensorData) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}/sensors`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(sensorData)
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Add sensor error:', error);
        return null;
      }
    },

    async addControl(deviceId, controlData) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}/controls`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(controlData)
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Add control error:', error);
        return null;
      }
    },

    // Sensor data - removed duplicate method

    async getSensorData(deviceId, sensorId, limit = 100) {
      try {
        const response = await fetch(`${this.baseUrl()}/sensors/${deviceId}/${sensorId}/history?limit=${limit}`, {
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : { data: [] };
      } catch (error) {
        console.error('Get sensor data error:', error);
        return { data: [] };
      }
    },

    // Device control - send control command to device
    async sendControlCommand(deviceId, controlId, value) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}/control`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ controlId, value })
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Send control command error:', error);
        return null;
      }
    },

    async getDeviceControls(deviceId) {
      try {
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}/controls`, {
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : { controls: [] };
      } catch (error) {
        console.error('Get device controls error:', error);
        return { controls: [] };
      }
    },

    // Analytics - removed as not in new API

    // User profile management
    async updateProfile(profileData) {
      try {
        const response = await fetch(`${this.baseUrl()}/auth/profile`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(profileData)
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Update profile error:', error);
        return null;
      }
    },

    async changePassword(passwordData) {
      try {
        const response = await fetch(`${this.baseUrl()}/auth/change-password`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(passwordData)
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Change password error:', error);
        return null;
      }
    },

    async refreshToken() {
      try {
        const response = await fetch(`${this.baseUrl()}/auth/refresh`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Refresh token error:', error);
        return null;
      }
    },

    async updateSettings(settings) {
      try {
        const response = await fetch(`${this.baseUrl()}/auth/settings`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(settings)
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Update settings error:', error);
        return null;
      }
    },

    async getSettings() {
      try {
        const response = await fetch(`${this.baseUrl()}/auth/settings`, {
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Get settings error:', error);
        return null;
      }
    },

    // Health check
    async ping() {
      let timeoutId;
      try {
        // Validate server config before making request
        if (!serverConfig.host || !serverConfig.port) {
          console.error('Invalid server configuration:', serverConfig);
          return false;
        }

        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          console.log('Health check timed out after 5 seconds');
          controller.abort();
        }, 5000);

        const healthUrl = `https://${serverConfig.host}:${serverConfig.port}/health`;
        console.log('Health check URL:', healthUrl);

        const response = await fetch(healthUrl, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const isHealthy = response.ok;
        console.log('Health check result:', { status: response.status, ok: isHealthy });
        return isHealthy;

      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('Health check aborted (timeout):', error);
        } else {
          console.error('Health check failed:', error);
        }
        return false;
      } finally {
        // Always clear the timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    },

    // Widget management
    async getWidgetsForDevice(deviceId) {
      try {
        console.log('🔍 Loading widgets for device:', deviceId);
        const response = await fetch(`${this.baseUrl()}/widgets/${deviceId}`, {
          headers: this.getAuthHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          console.log('📦 Raw widget data from API:', data);
          // Backend returns widgets array directly, not wrapped in object
          const widgetsArray = Array.isArray(data) ? data : (data.widgets || []);
          console.log('📋 Processed widgets array:', widgetsArray);
          return { widgets: widgetsArray.map(widget => ({
            ...widget,
            id: widget.widget_id,
            deviceId: widget.device_id,
            sensorId: widget.sensor_id,
            controlId: widget.control_id,
            // Handle both camelCase and lowercase field names from database
            x: parseInt(widget.x) || 0,
            y: parseInt(widget.y) || 0,
            w: parseInt(widget.w) || 2,
            h: parseInt(widget.h) || 2,
            minW: parseInt(widget.minW || widget.minw) || 2,
            minH: parseInt(widget.minH || widget.minh) || 2,
            position: widget.position || {
              x: parseInt(widget.x) || 0,
              y: parseInt(widget.y) || 0,
              w: parseInt(widget.w) || 2,
              h: parseInt(widget.h) || 2
            },
            config: typeof widget.config === 'string' ? JSON.parse(widget.config) : (widget.config || {})
          })) };
        }
        return { widgets: [] };
      } catch (error) {
        console.error('Get widgets error:', error);
        return { widgets: [] };
      }
    },

    async createWidget(widgetData) {
      try {
        // Transform data to match API schema
        const cleanedData = {
          widget_id: widgetData.widget_id || widgetData.id,
          device_id: widgetData.device_id,
          type: widgetData.type,
          name: widgetData.name,
          x: widgetData.position?.x || 0,
          y: widgetData.position?.y || 0,
          w: widgetData.position?.w || 2,
          h: widgetData.position?.h || 2,
          minW: widgetData.position?.minW || 2,
          minH: widgetData.position?.minH || 2,
          config: widgetData.config || {}
        };

        // Only include sensor_id if it has a valid value
        if (widgetData.sensor_id && widgetData.sensor_id !== '') {
          cleanedData.sensor_id = widgetData.sensor_id;
        }

        // Only include control_id if it has a valid value
        if (widgetData.control_id && widgetData.control_id !== '') {
          cleanedData.control_id = widgetData.control_id;
        }

        console.log('Sending widget data to API:', cleanedData);

        console.log('Creating widget with data:', cleanedData);

        const response = await fetch(`${this.baseUrl()}/widgets`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(cleanedData)
        });

        console.log('🎯 Widget creation response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Widget created successfully:', result);
          return result;
        } else {
          const errorData = await response.json();
          console.error('❌ Widget creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create widget');
        }
      } catch (error) {
        console.error('Create widget error:', error);
        throw error;
      }
    },

    async updateWidget(deviceId, widgetId, updates) {
      try {
        console.log('API updateWidget called with:', { deviceId, widgetId, updates });
        const response = await fetch(`${this.baseUrl()}/widgets/${widgetId}`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(updates)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Widget update failed:', response.status, errorText);
          return null;
        }

        return await response.json();
      } catch (error) {
        console.error('Update widget error:', error);
        return null;
      }
    },

    async updateWidgetPosition(deviceId, widgetId, position) {
      return this.updateWidget(deviceId, widgetId, position);
    },

    async batchUpdateWidgetPositions(deviceId, widgets) {
      try {
        const response = await fetch(`${this.baseUrl()}/widgets/batch-update`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ widgets })
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Batch update widgets error:', error);
        return null;
      }
    },

    async deleteWidget(deviceId, widgetId) {
      try {
        const response = await fetch(`${this.baseUrl()}/widgets/${widgetId}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Delete widget error:', error);
        return null;
      }
    },

    // Get current control states for a device
    async getControlStates(deviceId) {
      try {
        console.log('🎛️ Loading control states for device:', deviceId);
        const deviceData = await this.getDevice(deviceId);
        if (deviceData && deviceData.controls) {
          console.log('✅ Control states loaded:', deviceData.controls);
          return { controls: deviceData.controls };
        }
        return { controls: [] };
      } catch (error) {
        console.error('Get control states error:', error);
        return { controls: [] };
      }
    },

    // Seed missing control records for a device
    async seedControlRecords(deviceId) {
      try {
        console.log('🌱 Seeding control records for device:', deviceId);
        const response = await fetch(`${this.baseUrl()}/devices/${deviceId}/seed-controls`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Control seeding result:', result);
          return result;
        } else {
          console.error('❌ Control seeding failed:', response.status);
          return null;
        }
      } catch (error) {
        console.error('Seed control records error:', error);
        return null;
      }
    },

    async getAllUserWidgets() {
      // This method isn't needed for the new API structure
      return { widgets: {} };
    },

    // Widget templates - not implemented in new API
  };

  // Debounced socket connection to prevent rapid connection attempts
  const connectSocketDebounced = useCallback(() => {
    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    connectionTimeoutRef.current = setTimeout(() => {
      if (!token || socketConnectionRef.current || isConnectingSocket) {
        console.log('Skipping debounced socket connection', {
          hasToken: !!token,
          hasSocket: !!socketConnectionRef.current,
          isConnecting: isConnectingSocket
        });
        return;
      }

      // Check cooldown period
      const now = Date.now();
      if (now - lastConnectionAttempt.current < CONNECTION_COOLDOWN) {
        console.log('Connection attempt blocked by cooldown', {
          timeSinceLastAttempt: now - lastConnectionAttempt.current,
          cooldownPeriod: CONNECTION_COOLDOWN
        });
        return;
      }

      console.log('Starting debounced socket connection...');
      lastConnectionAttempt.current = now;
      setIsConnectingSocket(true);

    try {
      const socketConfig = appConfig?.app?.socket || {
        transports: ['polling', 'websocket'],
        timeout: 20000,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        forceNew: true
      };

      const socket = io(`https://${serverConfig.host}:${serverConfig.port}`, {
        auth: {
          token: token
        },
        ...socketConfig,
        upgrade: true,
        rememberUpgrade: false,
        reconnection: true
      });
      
      socket.on('connect', () => {
        console.log('Socket.io connected, socket ID:', socket.id);
        setIsConnectingSocket(false);
        // Manually authenticate after connection
        console.log('Sending authentication...');
        socket.emit('authenticate', { token: token });
      });

      socket.on('auth-success', (data) => {
        console.log('Socket.io authentication successful for user:', data.user);
        // No longer subscribing to sensor updates - using polling instead
      });

      socket.on('auth-error', (data) => {
        console.error('Socket.io authentication failed:', data);
      });

      // Removed sensor_data listener - now using polling instead

      socket.on('device_status', (data) => {
        console.log('Received device_status message:', data);
        // Handle both old format (status: 'online') and new format (type: 'device_online')
        const messageType = data.type || (data.status === 'online' ? 'device_online' : 'device_offline');
        handleSocketMessage({ type: messageType, ...data });
      });
      socket.on('control-state-update', (data) => {
        console.log('Socket.IO: Received control state update:', data);
        handleSocketMessage({ type: 'control_state_update', ...data });
      });

      socket.on('disconnect', () => {
        console.log('Socket.io disconnected');
        setSocketConnection(null);
        socketConnectionRef.current = null;
        setIsConnectingSocket(false);
        // Auto-reconnect is handled automatically by socket.io
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error);
        setIsConnectingSocket(false);

        // If it's a CORS or network error, don't retry immediately
        if (error.message.includes('CORS') || error.message.includes('websocket error')) {
          console.log('CORS or websocket error detected, backing off...');
          return;
        }
      });

      socket.on('error', (error) => {
        console.error('Socket.io error:', error);
      });

      setSocketConnection(socket);
      socketConnectionRef.current = socket;
    } catch (error) {
      console.error('Socket.io connection error:', error);
      setIsConnectingSocket(false);
    }
    }, 500); // 500ms debounce
  }, [token, serverConfig.host, serverConfig.port, isConnectingSocket]);

  // Non-debounced version for immediate connections when needed
  const connectSocket = useCallback(() => {
    connectSocketDebounced();
  }, [connectSocketDebounced]);

  const handleSocketMessage = useCallback((message) => {
    switch (message.type) {
      case 'sensor_data':
        // Sensor data now handled by polling - ignore real-time updates
        console.log('Ignoring real-time sensor data (using polling instead):', message);
        break;
      case 'control_state_update':
        // Update widget control states in real-time
        console.log('Processing control state update:', message);
        setWidgets(prevWidgets => {
          let hasChanges = false;
          const updated = prevWidgets.map(widget => {
            if (widget.deviceId === message.deviceId && widget.controlId === message.controlId) {
              if (widget.value !== message.value) {
                console.log(`Updating widget "${widget.name}" from ${widget.value} to ${message.value}`);
                hasChanges = true;
                return { ...widget, value: message.value };
              }
            }
            return widget;
          });
          if (hasChanges) {
            console.log('Widgets after control state update:', updated);
            return updated;
          }
          return prevWidgets;
        });
        break;

      case 'device_online':
        console.log('Device online message received:', message);

        setDevices(prevDevices =>
          prevDevices.map(device =>
            device.device_id === message.deviceId
              ? {
                  ...device,
                  status: 'online',
                  sensors: message.sensors || device.sensors,
                  controls: message.controls || device.controls
                }
              : device
          )
        );

        // If this is the currently selected device, update available sensors and controls
        if (selectedDevice && selectedDevice.device_id === message.deviceId) {
          console.log('Updating sensors for selected device:', message.sensors);
          if (message.sensors && Array.isArray(message.sensors)) {
            const sensorList = message.sensors.map(sensorType => ({
              sensor_id: sensorType,
              type: sensorType,
              name: sensorType.charAt(0).toUpperCase() + sensorType.slice(1),
              unit: getSensorUnit(sensorType)
            }));
            console.log('Setting sensors from device online message:', sensorList);
            setAvailableSensors(sensorList);
          }

          console.log('Updating controls for selected device:', message.controls);
          if (message.controls && Array.isArray(message.controls)) {
            // Socket.IO sends string arrays: ["relay_1", "led_builtin"]
            const controlList = message.controls.map(controlId => ({
              control_id: controlId,
              type: getControlType(controlId),
              name: controlId.charAt(0).toUpperCase() + controlId.slice(1).replace(/_/g, ' '),
              description: getControlDescription(controlId)
            }));
            console.log('Setting controls from device online message:', controlList);
            setAvailableControls(controlList);
          }
        }
        break;

      case 'device_offline':
        setDevices(prevDevices =>
          prevDevices.map(device => 
            device.device_id === message.device_id 
              ? { ...device, status: 'offline' }
              : device
          )
        );
        break;

      default:
        console.log('Unknown socket message:', message);
    }
  }, []);

  // Polling for sensor data and widget states
  const pollWidgetData = useCallback(async () => {
    if (!selectedDevice || !token) return;

    try {
      // Get latest sensor values
      const sensorData = await TrailCommandAPI.getLatestSensorValues(selectedDevice.device_id);

      if (sensorData?.sensors) {
        // Update widgets with latest sensor values
        setWidgets(prevWidgets => {
          let hasChanges = false;
          const updatedWidgets = prevWidgets.map(widget => {
            if (widget.sensorId) {
              const sensorReading = sensorData.sensors.find(s => s.sensor_id === widget.sensorId);
              if (sensorReading && widget.value !== sensorReading.value) {
                hasChanges = true;
                return { ...widget, value: sensorReading.value };
              }
            }
            return widget;
          });
          return hasChanges ? updatedWidgets : prevWidgets;
        });
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [selectedDevice, token]);

  // Set up polling interval
  useEffect(() => {
    if (!selectedDevice || !token) return;

    const sensorDataInterval = appConfig?.app?.polling?.sensorDataInterval || 15000; // Increased from 5s to 15s
    console.log(`Starting ${sensorDataInterval}ms polling for device:`, selectedDevice.device_id);
    const pollInterval = setInterval(pollWidgetData, sensorDataInterval);

    // Initial poll
    pollWidgetData();

    return () => {
      console.log('Stopping polling for device:', selectedDevice.device_id);
      clearInterval(pollInterval);
    };
  }, [selectedDevice, token]); // Removed pollWidgetData to prevent infinite loop

  // Password validation function
  const validatePassword = (password) => {
    const validation = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    setPasswordValidation(validation);
    return Object.values(validation).every(Boolean);
  };

  // Check password strength
  const getPasswordStrength = (password) => {
    const checks = Object.values(passwordValidation).filter(Boolean).length;
    if (checks === 0) return { strength: 'none', color: 'gray', text: '' };
    if (checks <= 2) return { strength: 'weak', color: 'red', text: 'Weak' };
    if (checks <= 3) return { strength: 'fair', color: 'orange', text: 'Fair' };
    if (checks <= 4) return { strength: 'good', color: 'yellow', text: 'Good' };
    return { strength: 'strong', color: 'green', text: 'Strong' };
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await TrailCommandAPI.login(loginForm.email, loginForm.password);
      if (result && result.token) {
        setToken(result.token);
        setUser(result.user);
        CookieHelper.set('trailcommand-token', result.token, 7); // 7 days expiry
        setShowLogin(false);
        setLoginForm({ email: '', password: '' });
      }
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  // Registration handler
  const handleRegistration = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setRegistrationError('');

    // Validation
    if (registrationForm.password !== registrationForm.confirmPassword) {
      setRegistrationError('Passwords do not match');
      return;
    }

    if (!validatePassword(registrationForm.password)) {
      setRegistrationError('Password does not meet security requirements. Please check the requirements below.');
      return;
    }

    try {
      const userData = {
        username: registrationForm.username,
        email: registrationForm.email,
        password: registrationForm.password
      };

      // Add optional fields if provided
      if (registrationForm.firstName) {
        userData.firstName = registrationForm.firstName;
      }
      if (registrationForm.lastName) {
        userData.lastName = registrationForm.lastName;
      }

      const result = await TrailCommandAPI.register(userData);

      if (result && result.token) {
        // Auto-login after successful registration
        setToken(result.token);
        setUser(result.user);
        CookieHelper.set('trailcommand-token', result.token, 7);
        setShowLogin(false);
        setRegistrationForm({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: ''
        });
        alert('Registration successful! Welcome to TrailCommand.');
      } else {
        // Registration successful but no auto-login
        alert('Registration successful! Please log in with your credentials.');
        setIsRegistering(false);
        setRegistrationForm({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: ''
        });
      }
    } catch (error) {
      // Show the exact error message from the API
      setRegistrationError(error.message || 'Registration failed. Please try again.');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setToken('');
    setUser(null);
    CookieHelper.delete('trailcommand-token');
    if (socketConnection) {
      socketConnection.disconnect();
      setSocketConnection(null);
    }
    socketConnectionRef.current = null;
    setIsConnectingSocket(false);

    // Clear any pending connection timeouts
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    setDevices([]);
    setSelectedDevice(null);
    setWidgets([]);
  };

  // Create device handler
  const handleCreateDevice = async (e) => {
    e.preventDefault();
    try {
      // Generate a unique device_id from the name
      const device_id = newDevice.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
      
      const deviceData = {
        device_id,
        name: newDevice.name,
        type: newDevice.type,
        description: newDevice.description || '',
        location: newDevice.location || ''
      };
      
      const result = await TrailCommandAPI.createDevice(deviceData);
      if (result) {
        await loadDevices();
        setShowDeviceModal(false);
        setNewDevice({ name: '', type: 'sensor', description: '', location: '' });
      }
    } catch (error) {
      alert('Failed to create device: ' + error.message);
    }
  };

  // Load devices
  const loadDevices = async () => {
    if (!token) return;
    
    try {
      const result = await TrailCommandAPI.getDevices();
      setDevices(result.devices || []);
      
      // If no device selected but we have devices, select the first one
      if (!selectedDevice && result.devices.length > 0) {
        setSelectedDevice(result.devices[0]);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  // Load device details and widgets
  const loadDeviceDetails = async (device) => {
    if (!device) return;

    try {
      // First, load persisted widgets from the database
      const widgetResult = await TrailCommandAPI.getWidgetsForDevice(device.device_id);
      const persistedWidgets = widgetResult.widgets || [];

      console.log('Loaded persisted widgets:', persistedWidgets);
      // If we have persisted widgets, use them with minimum dimensions
      if (persistedWidgets.length > 0) {
        const widgetsWithMinConstraints = persistedWidgets.map(widget => {
          // Default minimum dimensions based on widget type
          const getMinDimensions = (type) => {
            const defaults = {
              gauge: { minW: 3, minH: 3 },
              tank: { minW: 2, minH: 3 },
              value: { minW: 2, minH: 2 },
              button: { minW: 2, minH: 2 },
              slider: { minW: 3, minH: 2 },
              led: { minW: 2, minH: 2 },
              chart: { minW: 4, minH: 3 }
            };
            return defaults[type] || { minW: 2, minH: 2 };
          };
          
          const minDims = getMinDimensions(widget.type);
          return {
            ...widget,
            minW: widget.minW || minDims.minW,
            minH: widget.minH || minDims.minH
          };
        });

        console.log('🔧 Setting widgets with constraints:', widgetsWithMinConstraints);
        console.log('🔧 Each widget structure:', widgetsWithMinConstraints.map(w => ({
          id: w.id,
          type: w.type,
          name: w.name,
          config: w.config,
          position: w.position
        })));
        setWidgets(widgetsWithMinConstraints);
      } else {
        // No persisted widgets, create default ones from device sensors/controls
        const deviceDetails = await TrailCommandAPI.getDevice(device.device_id);
        if (deviceDetails) {
          await createDefaultWidgets(device, deviceDetails);
        }
      }

      // No longer subscribing to sensor updates - using polling instead

      // Load initial sensor values
      const sensorData = await TrailCommandAPI.getLatestSensorValues(device.device_id);
      if (sensorData.sensors) {
        setWidgets(prevWidgets =>
          prevWidgets.map(widget => {
            const sensorValue = sensorData.sensors.find(s => s.sensor_id === widget.sensorId);
            if (sensorValue) {
              return { ...widget, value: sensorValue.value };
            }
            return widget;
          })
        );
      }

      // Load initial control states
      const controlData = await TrailCommandAPI.getControlStates(device.device_id);
      console.log('🎛️ Control data received:', controlData);

      if (controlData.controls) {
        console.log('🔄 Updating widgets with control states:', controlData.controls);

        setWidgets(prevWidgets => {
          console.log('🎯 Current widgets before control state update:', prevWidgets.map(w => ({
            id: w.id,
            name: w.name,
            type: w.type,
            controlId: w.controlId,
            currentValue: w.value
          })));

          return prevWidgets.map(widget => {
            if (widget.controlId) {
              console.log(`🔍 Looking for control state for widget "${widget.name}" with controlId: "${widget.controlId}"`);
              const controlState = controlData.controls.find(c => c.control_id === widget.controlId);
              console.log(`🎲 Found control state:`, controlState);

              if (controlState && controlState.current_value !== null && controlState.current_value !== undefined) {
                console.log(`📍 Setting control widget "${widget.name}" value from ${widget.value} to:`, controlState.current_value);
                // Convert string values to appropriate types for buttons
                let value = controlState.current_value;
                if (widget.type === 'button') {
                  value = (value === 'true' || value === '1' || value === 1 || value === true);
                  console.log(`🔲 Button value converted to:`, value);
                }
                return { ...widget, value };
              } else {
                console.log(`⚠️ No valid control state found for widget "${widget.name}"`);
              }
            } else {
              console.log(`ℹ️ Widget "${widget.name}" has no controlId - skipping control state`);
            }
            return widget;
          });
        });
      } else {
        console.warn('❌ No control states received or controls array is empty');
      }

    } catch (error) {
      console.error('Failed to load device details:', error);
    }
  };

  // Create default widgets from device sensors and controls
  const createDefaultWidgets = async (device, deviceDetails) => {
    try {
      const defaultWidgets = [];

      // Check if deviceDetails has the expected structure
      if (!deviceDetails || !deviceDetails.device) {
        console.log('DeviceDetails is missing or invalid:', deviceDetails);
        return;
      }

      // Create widgets from sensors
      const sensors = deviceDetails.device.sensors || [];
      const controls = deviceDetails.device.controls || [];
      const sensorWidgets = sensors.map((sensor, index) => {
        // Check if there's a matching control for switch-type sensors
        const matchingControl = controls.find(control => 
          control.control_id === sensor.sensor_id && sensor.type === 'switch'
        );
        
        return {
          device_id: device.device_id,
          widget_id: `sensor-${sensor.id}`,
          type: getSensorWidgetType(sensor.type),
          name: sensor.name,
          sensor_id: sensor.sensor_id,
          control_id: matchingControl ? matchingControl.control_id : null,
          position: { x: (index % 4) * 3, y: Math.floor(index / 4) * 3, w: 3, h: 3 },
          config: {
            color: matchingControl ? '#4ECDC4' : '#45B7D1',
            unit: sensor.unit || '',
            min: sensor.min_value || 0,
            max: sensor.max_value || 100
          }
        };
      });

      // Create widgets from controls (excluding those already linked to sensors)
      const linkedControlIds = sensorWidgets
        .filter(widget => widget.control_id)
        .map(widget => widget.control_id);
      
      const controlWidgets = controls
        .filter(control => !linkedControlIds.includes(control.control_id))
        .map((control, index) => ({
          device_id: device.device_id,
          widget_id: `control-${control.id}`,
          type: control.type === 'switch' ? 'button' : 'slider',
          name: control.name,
          sensor_id: null,
          control_id: control.control_id,
          position: { 
            x: ((sensorWidgets.length + index) % 4) * 3, 
            y: Math.floor((sensorWidgets.length + index) / 4) * 3, 
            w: 3, 
            h: 3 
          },
          config: {
            color: control.type === 'switch' ? '#4ECDC4' : '#45B7D1',
            unit: '',
            min: control.min_value || 0,
            max: control.max_value || 100
          }
        }));

      // Save widgets to database and create frontend widgets
      const allWidgets = [...sensorWidgets, ...controlWidgets];
      const createdWidgets = [];

      for (const widgetData of allWidgets) {
        const result = await TrailCommandAPI.createWidget(widgetData);
        if (result) {
          createdWidgets.push({
            id: widgetData.widget_id,
            type: widgetData.type,
            name: widgetData.name,
            deviceId: widgetData.device_id,
            sensorId: widgetData.sensor_id,
            controlId: widgetData.control_id,
            position: widgetData.position || { x: 0, y: 0, w: 2, h: 2 },
            config: widgetData.config,
            value: widgetData.type === 'button' || widgetData.type === 'led' ? false : 0
          });
        }
      }

      setWidgets(createdWidgets);
    } catch (error) {
      console.error('Failed to create default widgets:', error);
    }
  };

  // Get appropriate widget type for sensor type
  const getSensorWidgetType = (sensorType) => {
    switch (sensorType.toLowerCase()) {
      case 'temperature':
      case 'humidity':
      case 'pressure':
        return 'gauge';
      case 'boolean':
      case 'switch':
        return 'led';
      default:
        return 'value';
    }
  };

  // Handle widget value changes (for controls)
  const handleWidgetValueChange = async (widgetId, newValue) => {
    console.log('Button clicked! Widget ID:', widgetId, 'New Value:', newValue);

    const widget = widgets.find(w => w.id === widgetId);

    if (!widget) {
      console.warn('Widget not found:', widgetId);
      return;
    }

    console.log('Widget found:', widget);

    if (!widget.controlId) {
      console.warn('No control linked to widget:', widget.name);
      // For demo purposes, allow local state change even without control
      setWidgets(prevWidgets =>
        prevWidgets.map(w =>
          w.id === widgetId ? { ...w, value: newValue } : w
        )
      );
      return;
    }

    console.log('Sending control command:', {
      deviceId: widget.deviceId,
      controlId: widget.controlId,
      value: newValue
    });

    try {
      console.log('Sending control command:', { deviceId: widget.deviceId, controlId: widget.controlId, value: newValue });
      const result = await TrailCommandAPI.sendControlCommand(
        widget.deviceId,
        widget.controlId,
        newValue
      );

      console.log('Control command result:', result);

      if (result) {
        setWidgets(prevWidgets =>
          prevWidgets.map(w =>
            w.id === widgetId ? { ...w, value: newValue } : w
          )
        );
      }
    } catch (error) {
      console.error('Failed to send control command:', error);
    }
  };

  // Handle layout changes (widget position/size updates)
  const handleLayoutChange = async (layout) => {
    if (!editMode || !selectedDevice) return;

    try {
      // Update local widget positions
      const updatedWidgets = widgets.map(widget => {
        const layoutItem = layout.find(item => item.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            position: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h
            }
          };
        }
        return widget;
      });

      setWidgets(updatedWidgets);

      // Batch update positions in the database
      const positionUpdates = layout.map(item => ({
        id: item.i,
        position: {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h
        }
      }));

      await TrailCommandAPI.batchUpdateWidgetPositions(selectedDevice.device_id, positionUpdates);
    } catch (error) {
      console.error('Failed to update widget positions:', error);
    }
  };

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    // Throttle health checks to prevent multiple concurrent requests
    if (healthCheckInProgress.current) {
      console.log('Health check already in progress, skipping...');
      return;
    }

    // Validate server config before attempting connection
    if (!serverConfig.host || !serverConfig.port) {
      console.error('Cannot check connection - invalid server config:', serverConfig);
      setIsConnected(false);
      return;
    }

    try {
      healthCheckInProgress.current = true;
      console.log('Starting health check...');
      const connected = await TrailCommandAPI.ping();
      setIsConnected(connected);
      console.log('Health check completed:', connected);

      if (connected && !socketConnectionRef.current && !isConnectingSocket) {
        console.log('Attempting to connect socket - ping successful, no existing socket');
        connectSocket();
      } else if (connected && socketConnectionRef.current) {
        console.log('Connection check passed - socket already exists');
      } else if (connected && isConnectingSocket) {
        console.log('Connection check passed - socket connection in progress');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setIsConnected(false);
    } finally {
      healthCheckInProgress.current = false;
    }
  }, [token, socketConnection, isConnectingSocket, serverConfig]); // Removed connectSocket to prevent infinite loop

  // Settings handlers
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        username: profileForm.username,
        email: profileForm.email
      };

      const result = await TrailCommandAPI.updateProfile(updateData);
      if (result) {
        setUser(prev => ({ ...prev, ...result.user }));
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      alert('Error updating profile: ' + error.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (profileForm.newPassword !== profileForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (profileForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const result = await TrailCommandAPI.changePassword({
        currentPassword: profileForm.currentPassword,
        newPassword: profileForm.newPassword
      });

      if (result) {
        alert('Password changed successfully!');
        setProfileForm(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        alert('Failed to change password. Please check your current password.');
      }
    } catch (error) {
      alert('Error changing password: ' + error.message);
    }
  };

  const handleRefreshToken = async () => {
    if (!window.confirm('Are you sure you want to regenerate your authentication token? This will invalidate your current token and you may need to update any connected devices.')) {
      return;
    }

    try {
      const result = await TrailCommandAPI.refreshToken();
      if (result && result.token) {
        setToken(result.token);
        CookieHelper.set('trailcommand-token', result.token, 7); // 7 days expiry
        alert('Authentication token regenerated successfully! Your new token is now active.');
      } else {
        alert('Failed to regenerate token. Please try again.');
      }
    } catch (error) {
      alert('Error regenerating token: ' + error.message);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      // Save theme to cookies for persistence
      CookieHelper.set('trailcommand-theme', userSettings.theme, 30); // 30 days for theme
      
      const result = await TrailCommandAPI.updateSettings(userSettings);
      if (result) {
        console.log('Settings updated successfully!');
      } else {
        console.log('Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  // Load user settings
  const loadUserSettings = async () => {
    try {
      const settings = await TrailCommandAPI.getSettings();
      if (settings) {
        setUserSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  };

  // Effects
  useEffect(() => {
    if (token) {
      console.log('Token found, validating with server...', { tokenLength: token.length });
      TrailCommandAPI.getCurrentUser().then(userData => {
        console.log('getCurrentUser response:', userData);
        if (userData) {
          // Handle both response formats: { user: {...} } or direct user object
          const user = userData.user || userData;
          if (user && user.username) {
            console.log('✅ User session restored:', user.username);
            setUser(user);
            // Initialize profile form with user data
            setProfileForm(prev => ({
              ...prev,
              username: user.username,
              email: user.email
            }));
            // Load user settings
            loadUserSettings();
          } else {
            console.log('❌ Invalid user data format:', userData);
            handleLogout();
          }
        } else {
          console.log('❌ getCurrentUser returned null - token may be expired or server unreachable');
          // Don't immediately logout - could be temporary server issue
          // Instead, show an error message and let user manually re-login if needed
          console.warn('Session validation failed. Please refresh or re-login if issues persist.');
        }
      }).catch(error => {
        console.error('❌ Session validation error:', error);
        console.warn('Network error during session validation. Keeping user logged in.');
        // Don't logout on network errors - token might still be valid
      });
    } else {
      console.log('No token found in localStorage');
    }
  }, [token]);

  useEffect(() => {
    if (token && user) {
      loadDevices();
    }
  }, [token, user]);

  useEffect(() => {
    if (selectedDevice) {
      loadDeviceDetails(selectedDevice);

      // Load sensors for the selected device
      console.log('Selected device changed:', selectedDevice);
      console.log('Device sensors:', selectedDevice.sensors);
      console.log('Device controls:', selectedDevice.controls);
      console.log('Device metadata:', selectedDevice.metadata);
      console.log('Full selected device:', selectedDevice);

      if (selectedDevice.sensors && Array.isArray(selectedDevice.sensors)) {
        const sensorList = selectedDevice.sensors.map(sensorType => ({
          sensor_id: sensorType,
          type: sensorType,
          name: sensorType.charAt(0).toUpperCase() + sensorType.slice(1),
          unit: getSensorUnit(sensorType)
        }));
        console.log('Setting available sensors:', sensorList);
        setAvailableSensors(sensorList);
      } else {
        // Clear sensors if device doesn't have any
        console.log('No sensors found for device, clearing available sensors');
        setAvailableSensors([]);
      }

      if (selectedDevice.controls && Array.isArray(selectedDevice.controls)) {
        // Handle both string arrays (from Socket.IO) and object arrays (from API)
        const controlList = selectedDevice.controls.map(control => {
          if (typeof control === 'string') {
            // Socket.IO format: ["relay_1", "led_builtin"]
            return {
              control_id: control,
              type: getControlType(control),
              name: control.charAt(0).toUpperCase() + control.slice(1).replace(/_/g, ' '),
              description: getControlDescription(control)
            };
          } else {
            // API format: [{ control_id: "relay_1", type: "digital", name: "Relay 1", ... }]
            return {
              control_id: control.control_id,
              type: control.type || getControlType(control.control_id),
              name: control.name || control.control_id.charAt(0).toUpperCase() + control.control_id.slice(1).replace(/_/g, ' '),
              description: control.metadata ? JSON.parse(control.metadata).description : getControlDescription(control.control_id)
            };
          }
        });
        console.log('Setting available controls:', controlList);
        setAvailableControls(controlList);
      } else {
        // Clear controls if device doesn't have any
        console.log('No controls found for device, clearing available controls');
        setAvailableControls([]);
      }
    }
  }, [selectedDevice]);

  useEffect(() => {
    checkConnection();
    const connectionCheckInterval = appConfig?.app?.polling?.connectionCheckInterval || 120000; // Increased from 60s to 120s
    const interval = setInterval(checkConnection, connectionCheckInterval);

    return () => {
      clearInterval(interval);
      // Cleanup socket connection on unmount
      if (socketConnectionRef.current) {
        socketConnectionRef.current.disconnect();
        socketConnectionRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setSocketConnection(null);
      setIsConnectingSocket(false);
    };
  }, [token]); // Changed from [checkConnection] to [token] to prevent infinite loop

  // Reconnect when server config changes
  useEffect(() => {
    if (socketConnectionRef.current) {
      socketConnectionRef.current.disconnect();
      socketConnectionRef.current = null;
      setSocketConnection(null);
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    setIsConnectingSocket(false);

    if (token && isConnected) {
      setTimeout(() => connectSocket(), 100);
    }
  }, [serverConfig.host, serverConfig.port, token, isConnected]); // Removed connectSocket to prevent infinite loop

  // Load sensors and controls when widget settings modal opens or device changes
  useEffect(() => {
    const loadData = async () => {
      if (widgetSettings && selectedDevice) {
        // Load sensors
        if (selectedDevice.sensors && Array.isArray(selectedDevice.sensors)) {
          const sensorList = selectedDevice.sensors.map(sensorType => ({
            sensor_id: sensorType,
            type: sensorType,
            name: sensorType.charAt(0).toUpperCase() + sensorType.slice(1),
            unit: getSensorUnit(sensorType)
          }));
          setAvailableSensors(sensorList);
        } else {
          // Fallback to API call for sensors
          try {
            const result = await TrailCommandAPI.getSensors(selectedDevice.device_id);
            setAvailableSensors(result.sensors || []);
          } catch (error) {
            console.error('Failed to load sensors:', error);
            setAvailableSensors([]);
          }
        }

        // Load controls - this will be handled by the useEffect above
        // No need to duplicate logic here
      }
    };

    loadData();
  }, [widgetSettings, selectedDevice]);

  // Auto-collapse sidebar on initial page load
  useEffect(() => {
    const autoCollapseDelay = 3000; // 3 seconds after page load
    
    const timer = setTimeout(() => {
      setSidebarCollapsed(true);
    }, autoCollapseDelay);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only runs once on mount

  // Widget types for adding new widgets
  const widgetTypes = [
    { id: 'button', name: 'Button', icon: Power, description: 'On/Off control' },
    { id: 'slider', name: 'Slider', icon: Settings, description: 'Range input control' },
    { id: 'gauge', name: 'Gauge', icon: Gauge, description: 'Modern animated gauge with multiple styles' },
    { id: 'tank', name: 'Tank Level', icon: Droplets, description: 'Animated tank level indicator' },
    { id: 'value', name: 'Value Display', icon: Activity, description: 'Numeric value display' },
    { id: 'led', name: 'LED', icon: Lightbulb, description: 'Status indicator' },
    { id: 'chart', name: 'Chart', icon: BarChart3, description: 'Historical data chart' }
  ];

  // Color picker component
  const ColorPicker = ({ value, onChange, pickerId }) => {
    const colorOptions = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1',
      '#A8F5FF', '#55DBEC', '#53B4FD', '#2397D1', '#1E40AF', '#7C3AED', '#DB2777', '#DC2626',
      '#EA580C', '#D97706', '#65A30D', '#059669', '#0891B2', '#0284C7', '#7C2D12', '#92400E'
    ];

    return (
      <div className="color-picker-container absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 mt-2">
        <div className="grid grid-cols-6 gap-2">
          {colorOptions.map(color => (
            <button
              key={color}
              className={`w-6 h-6 rounded border-2 ${value === color ? 'border-gray-800' : 'border-gray-300'}`}
              style={{ backgroundColor: color }}
              onClick={() => {
                onChange(color);
                setColorPickerOpen(null);
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Add new widget
  // Widget Configuration Form Component
  const WidgetConfigurationForm = ({ widgetType, availableSensors, availableControls, selectedDevice, onSave, onCancel }) => {
    const [config, setConfig] = useState({
      name: `New ${widgetType.name}`,
      sensorId: '',
      controlId: '',
      color: widgetType.id === 'led' ? '#4ECDC4' : '#45B7D1',
      unit: '',
      min: 0,
      max: 100,
      step: 1
    });

    const handleSave = () => {
      const widgetData = {
        type: widgetType.id,
        name: config.name,
        sensor_id: config.sensorId || null,
        control_id: config.controlId || null,
        config: {
          color: config.color,
          unit: config.unit,
          min: config.min,
          max: config.max,
          step: config.step
        }
      };
      onSave(widgetData);
    };

    return (
      <div className="space-y-6">
        {/* Widget Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Widget Name</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Sensor Selection (for sensor-based widgets) */}
        {['gauge', 'chart', 'led'].includes(widgetType.id) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Source (Sensor)</label>
            <select
              value={config.sensorId}
              onChange={(e) => setConfig(prev => ({ ...prev, sensorId: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a sensor</option>
              {availableSensors.map((sensor) => (
                <option key={sensor.sensor_id} value={sensor.sensor_id}>
                  {sensor.name} ({sensor.type})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Control Selection (for control widgets) */}
        {['button', 'slider'].includes(widgetType.id) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Control Target</label>
            <select
              value={config.controlId}
              onChange={(e) => setConfig(prev => ({ ...prev, controlId: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a control</option>
              {availableControls.map((control) => (
                <option key={control.control_id} value={control.control_id}>
                  {control.name} ({control.type})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={config.color}
              onChange={(e) => setConfig(prev => ({ ...prev, color: e.target.value }))}
              className="w-12 h-12 border border-gray-300 rounded-md cursor-pointer"
            />
            <input
              type="text"
              value={config.color}
              onChange={(e) => setConfig(prev => ({ ...prev, color: e.target.value }))}
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="#45B7D1"
            />
          </div>
        </div>

        {/* Unit (for gauge/chart widgets) */}
        {['gauge', 'chart', 'slider'].includes(widgetType.id) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
            <input
              type="text"
              value={config.unit}
              onChange={(e) => setConfig(prev => ({ ...prev, unit: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="°C, %, V, etc."
            />
          </div>
        )}

        {/* Range Settings (for gauge/slider widgets) */}
        {['gauge', 'slider'].includes(widgetType.id) && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min</label>
              <input
                type="number"
                value={config.min}
                onChange={(e) => setConfig(prev => ({ ...prev, min: Number(e.target.value) }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max</label>
              <input
                type="number"
                value={config.max}
                onChange={(e) => setConfig(prev => ({ ...prev, max: Number(e.target.value) }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Step</label>
              <input
                type="number"
                value={config.step}
                onChange={(e) => setConfig(prev => ({ ...prev, step: Number(e.target.value) }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Widget
          </button>
        </div>
      </div>
    );
  };

  const createCompleteWidget = async (widgetData) => {
    const findNextPosition = (type) => {
      const gridCols = 12;
      const typeDefaultSizes = {
        button: { w: 2, h: 2, minW: 2, minH: 2 },
        gauge: { w: 3, h: 3, minW: 3, minH: 3 },
        chart: { w: 6, h: 4, minW: 4, minH: 3 },
        slider: { w: 4, h: 2, minW: 3, minH: 2 },
        led: { w: 2, h: 2, minW: 2, minH: 2 }
      };

      const dimensions = typeDefaultSizes[type] || { w: 2, h: 2, minW: 2, minH: 2 };
      const widgetWidth = dimensions.w;

      let currentRow = 0;
      let currentX = 0;

      const sortedWidgets = [...widgets].sort((a, b) => {
        if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        return a.position.x - b.position.x;
      });

      for (const widget of sortedWidgets) {
        if (widget.position.y === currentRow) {
          if (widget.position.x >= currentX + widgetWidth) {
            break;
          }
          currentX = widget.position.x + widget.position.w;
        } else {
          break;
        }
      }

      if (currentX + widgetWidth > gridCols) {
        currentRow += 1;
        currentX = 0;
      }

      return { x: currentX, y: currentRow, ...dimensions };
    };

    const widgetId = `widget-${Date.now()}`;
    const position = findNextPosition(widgetData.type);

    const completeWidgetData = {
      device_id: selectedDevice.device_id,
      widget_id: widgetId,
      type: widgetData.type,
      name: widgetData.name,
      sensor_id: widgetData.sensor_id,
      control_id: widgetData.control_id,
      position: position,
      config: widgetData.config
    };

    console.log('Creating complete widget:', completeWidgetData);

    try {
      const result = await TrailCommandAPI.createWidget(completeWidgetData);
      if (result) {
        const newWidget = {
          id: widgetId,
          type: widgetData.type,
          name: widgetData.name,
          deviceId: selectedDevice.device_id,
          sensorId: widgetData.sensor_id,
          controlId: widgetData.control_id,
          value: widgetData.type === 'button' || widgetData.type === 'led' ? false : 0,
          position: position,
          minW: position.minW,
          minH: position.minH,
          config: widgetData.config
        };

        setWidgets([...widgets, newWidget]);
        setSelectedWidgetType(null);
        setShowAddWidget(false);
      } else {
        alert('Failed to create widget');
      }
    } catch (error) {
      console.error('Error creating widget:', error);
      alert('Error creating widget: ' + error.message);
    }
  };

  const addWidget = async (type) => {
    if (!selectedDevice) return;

    // Calculate next position (side by side) with widget-specific dimensions
    const findNextPosition = (widgetType) => {
      // Set widget dimensions based on type
      const widgetDimensions = {
        gauge: { w: 4, h: 4, minW: 3, minH: 3 },
        tank: { w: 3, h: 4, minW: 2, minH: 3 },
        value: { w: 3, h: 2, minW: 2, minH: 2 },
        button: { w: 2, h: 2, minW: 2, minH: 2 },
        slider: { w: 4, h: 2, minW: 3, minH: 2 },
        led: { w: 2, h: 2, minW: 2, minH: 2 },
        chart: { w: 6, h: 4, minW: 4, minH: 3 }
      };
      
      const dimensions = widgetDimensions[widgetType] || { w: 3, h: 3, minW: 2, minH: 2 };
      const widgetWidth = dimensions.w;
      const gridCols = 12; // Grid has 12 columns
      
      if (widgets.length === 0) {
        return { x: 0, y: 0, ...dimensions };
      }
      
      // Sort widgets by row (y) then by column (x)
      const sortedWidgets = [...widgets]
        .filter(widget => widget.position) // Only include widgets with position data
        .sort((a, b) => {
          if (a.position.y === b.position.y) {
            return a.position.x - b.position.x;
          }
          return a.position.y - b.position.y;
        });
      
      // Find the next available horizontal position
      let currentRow = 0;
      let currentX = 0;
      
      for (const widget of sortedWidgets) {
        // Skip widgets without position data
        if (!widget.position) continue;

        if (widget.position.y === currentRow) {
          // Check if there's space between current position and this widget
          if (currentX + widgetWidth <= widget.position.x) {
            break; // Found space
          }
          // Move to after this widget
          currentX = widget.position.x + widget.position.w;
        } else {
          // New row, reset to beginning
          break;
        }
      }
      
      // Check if we need to wrap to next row
      if (currentX + widgetWidth > gridCols) {
        currentRow += 1;
        currentX = 0;
      }
      
      return { x: currentX, y: currentRow, ...dimensions };
    };

    const widgetId = `widget-${Date.now()}`;
    const position = findNextPosition(type);
    
    const widgetData = {
      device_id: selectedDevice.device_id,
      widget_id: widgetId,
      type: type,
      name: `New ${type}`,
      sensor_id: null,
      control_id: null,
      position: position,
      config: {
        color: type === 'led' ? '#4ECDC4' : '#45B7D1',
        unit: '',
        min: 0,
        max: 100,
        step: 1
      }
    };

    try {
      const result = await TrailCommandAPI.createWidget(widgetData);
      if (result) {
        const newWidget = {
          id: widgetId,
          type: type,
          name: `New ${type}`,
          deviceId: selectedDevice.device_id,
          sensorId: null,
          controlId: null,
          value: type === 'button' || type === 'led' ? false : 0,
          position: position,
          minW: position.minW,
          minH: position.minH,
          config: widgetData.config
        };

        setWidgets([...widgets, newWidget]);
        
        // Automatically open settings dialog for the new widget
        setWidgetSettings(newWidget);
      } else {
        alert('Failed to create widget');
      }
    } catch (error) {
      console.error('Error creating widget:', error);
      alert('Error creating widget: ' + error.message);
    }

    setShowAddWidget(false);
  };

  // Widget renderer
  const renderWidget = (widget) => {
    console.log('🎨 Rendering widget:', {
      id: widget.id,
      type: widget.type,
      name: widget.name,
      value: widget.value,
      config: widget.config,
      fullWidget: widget
    });

    const { id, type, name, value, config = {} } = widget;
    const { color = '#45B7D1', min = 0, max = 100, unit = '' } = config;

    switch (type) {
      case 'button':
        return (
          <div className="widget-content h-full flex flex-col p-2 bg-white rounded-lg min-h-0">
            {/* Header */}
            <div className="flex-shrink-0 mb-1">
              <h3 className="text-xs font-semibold text-gray-800 text-center truncate">{name}</h3>
            </div>

            {/* Button Area */}
            <div className="flex-1 flex items-center justify-center min-h-0 p-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleWidgetValueChange(id, !value);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleWidgetValueChange(id, !value);
                }}
                className={`relative rounded-lg transition-all duration-300 flex items-center justify-center shadow-md transform hover:scale-105 hover:shadow-lg cursor-pointer active:scale-95 min-w-0 min-h-0 touch-manipulation ${
                  value
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: value ? color : undefined,
                  boxShadow: value ? `0 4px 15px ${color}40` : undefined,
                  width: 'min(80px, 90%)',
                  height: 'min(80px, 80%)',
                  minWidth: '40px',
                  minHeight: '40px'
                }}
              >
                {/* Icon */}
                <Power
                  className="w-6 h-6 min-w-5 min-h-5"
                  style={{
                    width: 'min(32px, 65%)',
                    height: 'min(32px, 65%)'
                  }}
                />

                {/* Glow effect when active */}
                {value && (
                  <div
                    className="absolute inset-0 rounded-lg opacity-20 animate-pulse"
                    style={{ backgroundColor: color }}
                  />
                )}
              </button>
            </div>

            {/* Status Display */}
            <div className="flex-shrink-0 mt-1 text-center">
              <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-medium ${
                value
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
              style={{
                backgroundColor: value ? `${color}20` : undefined,
                color: value ? color : undefined,
                fontSize: 'min(10px, 2.5vw)',
                minFontSize: '8px'
              }}>
                <div className={`rounded-full ${value ? 'bg-current' : 'bg-gray-400'}`}
                     style={{ width: 'min(6px, 1.5vw)', height: 'min(6px, 1.5vw)', minWidth: '4px', minHeight: '4px' }} />
                <span>{value ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>
        );

      case 'slider':
        return (
          <div className="widget-content h-full flex flex-col p-4 bg-white rounded-lg">
            <h3 className="text-sm font-medium text-gray-800 mb-2">{name}</h3>
            <div className="flex-1 flex flex-col justify-center">
              <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => handleWidgetValueChange(id, parseFloat(e.target.value))}
                disabled={!widget.controlId}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-custom"
                style={{ accentColor: color }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{min}</span>
                <span className="font-medium">{value} {unit}</span>
                <span>{max}</span>
              </div>
            </div>
          </div>
        );

      case 'gauge':
        const gaugeStyle = config?.gaugeStyle || 'modern';
        // Calculate responsive gauge size based on widget dimensions
        const widgetWidth = widget.position?.w || 2;
        const widgetHeight = widget.position?.h || 2;
        const smallerDimension = Math.min(widgetWidth, widgetHeight);
        // More conservative scaling: account for padding and borders
        // Each grid unit is ~60px, subtract padding/margins for actual available space
        const availableSpace = (smallerDimension * 60) - 32; // 32px for padding + borders
        const gaugeSize = Math.min(300, Math.max(80, availableSpace * 0.85)); // Use 85% of available space
        const commonGaugeProps = {
          value,
          min,
          max,
          unit,
          title: name,
          color,
          size: gaugeSize
        };

        const renderGauge = () => {
          switch (gaugeStyle) {
            case 'classic':
              return <ClassicGauge {...commonGaugeProps} />;
            case 'minimal':
              return <MinimalGauge {...commonGaugeProps} />;
            case 'neon':
              return <NeonGauge {...commonGaugeProps} />;
            case 'modern':
            default:
              return (
                <ModernGauge
                  {...commonGaugeProps}
                  animate={config?.animate !== false}
                  gradient={config?.gradient !== false}
                  showTicks={config?.showTicks !== false}
                  showValue={config?.showValue !== false}
                  showMinMax={config?.showMinMax !== false}
                  alertThresholds={
                    (config?.alertHigh || config?.alertLow) ? {
                      warning: config?.alertHigh ? parseFloat(config.alertHigh) * 0.8 : max * 0.8,
                      critical: config?.alertHigh ? parseFloat(config.alertHigh) : max * 0.9
                    } : null
                  }
                />
              );
          }
        };

        return (
          <div className={`widget-content h-full ${
            gaugeStyle === 'neon' ? '' : 'bg-white'
          } rounded-xl overflow-hidden`}>
            {renderGauge()}
          </div>
        );

      case 'value':
        return (
          <div className="widget-content h-full flex flex-col items-center justify-center p-4 bg-white rounded-lg">
            <h3 className="text-sm font-medium text-gray-800 mb-2 text-center">{name}</h3>
            <div className="text-2xl font-bold text-gray-900 mb-1" style={{ color: color }}>
              {typeof value === 'number' && config.decimals ? value.toFixed(config.decimals) : value}
            </div>
            <div className="text-sm text-gray-500">{unit}</div>
          </div>
        );

      case 'led':
        return (
          <div className="widget-content h-full flex flex-col items-center justify-center p-4 bg-white rounded-lg">
            <h3 className="text-sm font-medium text-gray-800 mb-2 text-center">{name}</h3>
            <div 
              className={`w-12 h-12 rounded-full border-4 transition-all duration-200 ${
                value ? 'shadow-lg' : 'border-gray-300'
              }`}
              style={{
                backgroundColor: value ? color : '#e5e7eb',
                borderColor: value ? color : '#d1d5db',
                boxShadow: value ? `0 0 20px ${color}40` : 'none'
              }}
            />
            <span className="text-xs text-gray-500 mt-2">{value ? 'ON' : 'OFF'}</span>
          </div>
        );

      case 'tank':
        return (
          <div className={`widget-content h-full rounded-xl overflow-hidden ${
            userSettings.theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <TankGauge
              value={value}
              min={min}
              max={max}
              unit={unit}
              title={name}
              color={color}
              animate={true}
              showValue={true}
              theme={userSettings.theme}
              alertThresholds={
                (config?.alertLow) ? {
                  warning: config?.alertLow ? parseFloat(config.alertLow) * 1.5 : max * 0.3,
                  critical: config?.alertLow ? parseFloat(config.alertLow) : max * 0.15
                } : null
              }
            />
          </div>
        );

      default:
        return (
          <div className="widget-content h-full flex items-center justify-center p-4 bg-white rounded-lg shadow-lg">
            <span className="text-gray-500">Unknown widget type: {type}</span>
          </div>
        );
    }
  };

  // Login form
  if (!token || !user) {
    // Get theme from localStorage or default to light for login screen
    const loginTheme = CookieHelper.get('trailcommand-theme') || userSettings.theme || 'light';
    
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
        loginTheme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 to-gray-800 dark' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Monitor className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">TrailCommand</h1>
            <p className="text-gray-600">IoT Dashboard</p>
          </div>

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin@trailcommand.local"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-md hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <LogIn className="w-4 h-4 inline mr-2" />
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistration} className="space-y-4">
              {registrationError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {registrationError}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={registrationForm.firstName}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={registrationForm.lastName}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={registrationForm.username}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="johndoe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={registrationForm.email}
                  onChange={(e) => {
                    setRegistrationForm(prev => ({ ...prev, email: e.target.value }));
                    if (registrationError) setRegistrationError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={registrationForm.password}
                  onChange={(e) => {
                    const newPassword = e.target.value;
                    setRegistrationForm(prev => ({ ...prev, password: newPassword }));
                    validatePassword(newPassword);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  minLength="12"
                  required
                />

                {registrationForm.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">Password Strength:</span>
                      <span className={`text-xs font-bold text-${getPasswordStrength(registrationForm.password).color}-600`}>
                        {getPasswordStrength(registrationForm.password).text}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className={`flex items-center ${passwordValidation.length ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-2">{passwordValidation.length ? '✓' : '✗'}</span>
                        At least 12 characters
                      </div>
                      <div className={`flex items-center ${passwordValidation.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-2">{passwordValidation.uppercase ? '✓' : '✗'}</span>
                        One uppercase letter (A-Z)
                      </div>
                      <div className={`flex items-center ${passwordValidation.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-2">{passwordValidation.lowercase ? '✓' : '✗'}</span>
                        One lowercase letter (a-z)
                      </div>
                      <div className={`flex items-center ${passwordValidation.number ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-2">{passwordValidation.number ? '✓' : '✗'}</span>
                        One number (0-9)
                      </div>
                      <div className={`flex items-center ${passwordValidation.special ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-2">{passwordValidation.special ? '✓' : '✗'}</span>
                        One special character (!@#$%^&*)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={registrationForm.confirmPassword}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    registrationForm.confirmPassword && registrationForm.password !== registrationForm.confirmPassword
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  minLength="12"
                  required
                />
                {registrationForm.confirmPassword && registrationForm.password !== registrationForm.confirmPassword && (
                  <div className="mt-1 text-xs text-red-600 flex items-center">
                    <span className="mr-2">✗</span>
                    Passwords do not match
                  </div>
                )}
                {registrationForm.confirmPassword && registrationForm.password === registrationForm.confirmPassword && registrationForm.confirmPassword.length > 0 && (
                  <div className="mt-1 text-xs text-green-600 flex items-center">
                    <span className="mr-2">✓</span>
                    Passwords match
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  !Object.values(passwordValidation).every(Boolean) ||
                  registrationForm.password !== registrationForm.confirmPassword ||
                  !registrationForm.email ||
                  !registrationForm.username
                }
                className={`w-full py-2 px-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${
                  !Object.values(passwordValidation).every(Boolean) ||
                  registrationForm.password !== registrationForm.confirmPassword ||
                  !registrationForm.email ||
                  !registrationForm.username
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 focus:ring-green-500'
                }`}
              >
                <LogIn className="w-4 h-4 inline mr-2" />
                Create Account
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </button>
          </div>

          {shouldShowServerConfig() && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Server: {serverConfig.host}:{serverConfig.port}
              </p>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="text-sm text-blue-600 hover:text-blue-800 mt-2"
              >
                Configure Server
              </button>
            </div>
          )}

          {shouldShowServerConfig() && showConfig && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="mb-3">
                <p className="text-xs text-orange-600 font-medium">⚠️ Admin Only: Changes require application restart</p>
                <p className="text-xs text-gray-600">Default settings are loaded from config.json</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Host</label>
                  <input
                    type="text"
                    value={serverConfig.host}
                    onChange={(e) => setServerConfig(prev => ({ ...prev, host: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Port</label>
                  <input
                    type="text"
                    value={serverConfig.port}
                    onChange={(e) => setServerConfig(prev => ({ ...prev, port: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className={`h-screen flex flex-col transition-colors duration-200 ${
      userSettings.theme === 'dark' 
        ? 'bg-gray-900 dark' 
        : 'bg-gray-100'
    }`}>
      <style>{`
        .slider-custom::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: currentColor;
          cursor: pointer;
        }
        
        .slider-custom::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: currentColor;
          cursor: pointer;
          border: none;
        }
        
        .react-grid-item.resizing {
          opacity: 0.6;
        }
        
        .react-grid-item > .react-resizable-handle {
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 6"><circle cx="1" cy="1" r="1" fill="%23666"/><circle cx="5" cy="1" r="1" fill="%23666"/><circle cx="1" cy="5" r="1" fill="%23666"/><circle cx="5" cy="5" r="1" fill="%23666"/></svg>') no-repeat;
          background-size: contain;
        }
        
        /* Dark mode styles */
        .dark {
          color-scheme: dark;
        }
        
        .dark .bg-white {
          background-color: #1f2937 !important;
          color: #f9fafb;
        }
        
        .dark .bg-gray-50 {
          background-color: #111827 !important;
        }
        
        .dark .bg-gray-100 {
          background-color: #1f2937 !important;
        }
        
        .dark .text-gray-900 {
          color: #f9fafb !important;
        }
        
        .dark .text-gray-800 {
          color: #e5e7eb !important;
        }
        
        .dark .text-gray-700 {
          color: #d1d5db !important;
        }
        
        .dark .text-gray-600 {
          color: #9ca3af !important;
        }
        
        .dark .text-gray-500 {
          color: #6b7280 !important;
        }
        
        .dark .border-gray-200 {
          border-color: #374151 !important;
        }
        
        .dark .border-gray-300 {
          border-color: #4b5563 !important;
        }
        
        .dark .hover\\:bg-gray-50:hover {
          background-color: #374151 !important;
        }
        
        .dark .hover\\:bg-gray-100:hover {
          background-color: #4b5563 !important;
        }
        
        .dark .hover\\:border-gray-300:hover {
          border-color: #6b7280 !important;
        }
        
        .dark .hover\\:border-gray-400:hover {
          border-color: #6b7280 !important;
        }
        
        .dark input, .dark select, .dark textarea {
          background-color: #374151 !important;
          border-color: #4b5563 !important;
          color: #f9fafb !important;
        }
        
        .dark input:focus, .dark select:focus, .dark textarea:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 1px #3b82f6 !important;
        }
        
        .dark .shadow-lg {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2) !important;
        }
        
        .dark .shadow-xl {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
        }
        
        .dark .shadow-sm {
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2) !important;
        }
        
        .dark .widget-content {
          background-color: #1f2937 !important;
          border-color: #374151 !important;
        }
      `}</style>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center space-x-2">
            <Monitor className="w-6 h-6 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">TrailCommand</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <div className="flex flex-col">
              <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              <span className={`text-xs ${
                userSettings.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                API Status
              </span>
            </div>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={() => {
              const newTheme = userSettings.theme === 'dark' ? 'light' : 'dark';
              setUserSettings(prev => ({ ...prev, theme: newTheme }));
              // Auto-save theme preference
              handleUpdateSettings();
            }}
            className={`relative p-2 rounded-md transition-all duration-200 ${
              userSettings.theme === 'dark'
                ? 'hover:bg-gray-700'
                : 'hover:bg-gray-100'
            }`}
            title={`Switch to ${userSettings.theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {/* Toggle Switch Container */}
            <div className="relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out"
                 style={{
                   backgroundColor: userSettings.theme === 'dark' ? '#3B82F6' : '#D1D5DB'
                 }}>

              {/* Toggle Circle */}
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-all duration-300 ease-in-out transform flex items-center justify-center ${
                  userSettings.theme === 'dark'
                    ? 'translate-x-6 bg-white'
                    : 'translate-x-0.5 bg-white'
                }`}
              >
                {/* Icon inside the toggle circle */}
                {userSettings.theme === 'dark' ? (
                  <Moon className="w-3 h-3 text-gray-700" />
                ) : (
                  <Sun className="w-3 h-3 text-yellow-500" />
                )}
              </div>

              {/* Background icons */}
              <div className="absolute inset-0 flex items-center justify-between px-1">
                <Sun className={`w-3 h-3 transition-opacity duration-300 ${
                  userSettings.theme === 'dark' ? 'opacity-40 text-white' : 'opacity-0'
                }`} />
                <Moon className={`w-3 h-3 transition-opacity duration-300 ${
                  userSettings.theme === 'dark' ? 'opacity-0' : 'opacity-40 text-gray-600'
                }`} />
              </div>
            </div>
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-700">
              {user?.username}
            </span>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-80'
        } flex flex-col`}>
          
          {/* Device selector */}
          <div className="p-4 border-b border-gray-200">
            {!sidebarCollapsed ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">Devices</h2>
                  <button
                    onClick={() => setShowDeviceModal(true)}
                    className="p-1 rounded-md hover:bg-gray-100 text-blue-600"
                    title="Add Device"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {devices.length === 0 ? (
                    <div className="text-xs text-gray-500 text-center py-4">
                      No devices found.<br />
                      Click + to add a device.
                    </div>
                  ) : (
                    devices.map((device) => (
                      <button
                        key={device.device_id}
                        onClick={() => setSelectedDevice(device)}
                        className={`group w-full p-3 rounded-lg border text-left transition-all ${
                          selectedDevice?.device_id === device.device_id
                            ? (userSettings.theme === 'dark'
                                ? 'border-blue-400 bg-blue-900/30'
                                : 'border-blue-500 bg-blue-50')
                            : (userSettings.theme === 'dark'
                                ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className={`font-medium text-sm ${
                                userSettings.theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                              }`}>
                                {device.name}
                              </div>
                              <div className={`w-2 h-2 rounded-full ${
                                (device.status === 'online' || device.status === 'connected' || (selectedDevice?.device_id === device.device_id && widgets.length > 0)) 
                                  ? 'bg-green-500' : 'bg-gray-400'
                              }`} title={`${
                                (device.status === 'online' || device.status === 'connected') 
                                  ? 'Connected' 
                                  : (selectedDevice?.device_id === device.device_id && widgets.length > 0)
                                    ? 'Functional (has data)'
                                    : 'Disconnected'
                              } • Status: ${device.status || 'unknown'}`} />
                            </div>
                            {device.uuid && (
                              <div className={`text-xs font-mono ${
                                userSettings.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                UUID: {device.uuid}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeviceAuthModal(device);
                              }}
                              className="p-2 rounded text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Manage device authentication"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDeviceModal(device);
                                setDeleteConfirmationInput('');
                              }}
                              className="p-2 rounded text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete device"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // Collapsed sidebar - device icons only
              <div className="space-y-2 flex flex-col items-center">
                {devices.length === 0 ? (
                  <div className="p-2 text-gray-400" title="No devices">
                    <Smartphone className="w-5 h-5" />
                  </div>
                ) : (
                  devices.map((device) => (
                    <button
                      key={device.device_id}
                      onClick={() => setSelectedDevice(device)}
                      className={`relative p-2 rounded-lg transition-all ${
                        selectedDevice?.device_id === device.device_id
                          ? (userSettings.theme === 'dark'
                              ? 'bg-blue-900/30 text-blue-400'
                              : 'bg-blue-100 text-blue-600')
                          : (userSettings.theme === 'dark'
                              ? 'hover:bg-gray-700/50 text-gray-300'
                              : 'hover:bg-gray-100 text-gray-600')
                      }`}
                      title={`${device.name} (${device.type})`}
                    >
                      <Smartphone className="w-5 h-5" />
                      {/* Status indicator */}
                      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        (device.status === 'online' || device.status === 'connected' || (selectedDevice?.device_id === device.device_id && widgets.length > 0)) 
                          ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 space-y-3">
            {!sidebarCollapsed ? (
              <>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`w-full p-2 rounded-md border transition-all ${
                    editMode
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Edit3 className="w-4 h-4 inline mr-2" />
                  {editMode ? 'Exit Edit' : 'Edit Mode'}
                </button>

                {editMode && (
                  <>
                    <button
                      onClick={() => setShowAddWidget(true)}
                      disabled={!selectedDevice}
                      className="w-full p-2 rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Add Widget
                    </button>
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      className="w-full p-2 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                    >
                      <Copy className="w-4 h-4 inline mr-2" />
                      Templates
                    </button>
                  </>
                )}

                <button
                  onClick={async () => {
                    if (selectedDevice) {
                      await loadDeviceDetails(selectedDevice);
                    }
                  }}
                  disabled={!selectedDevice}
                  className="w-full p-2 rounded-md border border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Refresh
                </button>
              </>
            ) : (
              // Collapsed sidebar - icon-only controls
              <div className="space-y-2 flex flex-col items-center">
                {/* Add Device */}
                <button
                  onClick={() => setShowDeviceModal(true)}
                  className="p-2 rounded-md hover:bg-gray-100 text-blue-600"
                  title="Add Device"
                >
                  <Plus className="w-5 h-5" />
                </button>
                
                {/* Edit Mode Toggle */}
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`p-2 rounded-md transition-all ${
                    editMode
                      ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={editMode ? 'Exit Edit Mode' : 'Edit Mode'}
                >
                  <Edit3 className="w-5 h-5" />
                </button>

                {/* Add Widget (only show in edit mode) */}
                {editMode && (
                  <>
                    <button
                      onClick={() => setShowAddWidget(true)}
                      disabled={!selectedDevice}
                      className="p-2 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add Widget"
                    >
                      <Zap className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      className="p-2 rounded-md bg-green-100 text-green-600 hover:bg-green-200"
                      title="Templates"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Refresh */}
                <button
                  onClick={async () => {
                    if (selectedDevice) {
                      await loadDeviceDetails(selectedDevice);
                    }
                  }}
                  disabled={!selectedDevice}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          {selectedDevice ? (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {selectedDevice.name}
                </h2>
                {selectedDevice.uuid && (
                  <div className="text-xs text-gray-500 font-mono mt-1">
                    UUID: {selectedDevice.uuid}
                  </div>
                )}
              </div>

              {widgets.length > 0 ? (
                <ResponsiveGridLayout
                  className="layout"
                  layouts={{ lg: widgets.map(w => ({
                    i: w.id,
                    x: w.position?.x || w.x || 0,
                    y: w.position?.y || w.y || 0,
                    w: w.position?.w || w.w || 2,
                    h: w.position?.h || w.h || 2,
                    minW: w.position?.minW || w.minW || 2,
                    minH: w.position?.minH || w.minH || 2
                  })) }}
                  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                  cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                  rowHeight={60}
                  isDraggable={editMode}
                  isResizable={editMode}
                  useCSSTransforms={false}
                  onLayoutChange={handleLayoutChange}
                  compactType="vertical"
                >
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className={`relative h-full w-full p-2 bg-white rounded-lg shadow-sm overflow-hidden ${editMode ? 'border-2 border-dashed border-blue-300' : ''}`}
                    >
                      {renderWidget(widget)}
                      {editMode && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setWidgetSettings(widget);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            className="absolute -top-2 -left-2 w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 flex items-center justify-center z-10"
                            title="Widget Settings"
                          >
                            <Settings className="w-6 h-6" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              try {
                                const result = await TrailCommandAPI.deleteWidget(widget.deviceId, widget.id);
                                if (result) {
                                  setWidgets(widgets.filter(w => w.id !== widget.id));
                                } else {
                                  alert('Failed to delete widget');
                                }
                              } catch (error) {
                                console.error('Error deleting widget:', error);
                                alert('Error deleting widget: ' + error.message);
                              }
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            className="absolute -top-2 -right-2 w-12 h-12 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center z-10"
                            title="Delete Widget"
                          >
                            <Trash2 className="w-6 h-6" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </ResponsiveGridLayout>
              ) : (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No widgets found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add sensors and controls to your device to see widgets here.
                  </p>
                  {editMode && (
                    <button
                      onClick={() => setShowAddWidget(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Add Widget
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a device
                </h3>
                <p className="text-gray-600">
                  Choose a device from the sidebar to view its dashboard.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showDeviceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add New Device
              </h3>
              
              <form onSubmit={handleCreateDevice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device Name
                  </label>
                  <input
                    type="text"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="My IoT Device"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device Type
                  </label>
                  <select
                    value={newDevice.type}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sensor">Sensor</option>
                    <option value="controller">Controller</option>
                    <option value="gateway">Gateway</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newDevice.location}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Living Room"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newDevice.description}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="Temperature and humidity sensor"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeviceModal(false);
                      setNewDevice({ name: '', type: 'sensor', description: '', location: '' });
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Device
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Device Confirmation Modal */}
      {deleteDeviceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-red-600 mb-4">
                Delete Device
              </h3>
              
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete <strong>{deleteDeviceModal.name}</strong>?
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  This action cannot be undone. All associated sensors, data, and widgets will be permanently deleted.
                </p>
                
                {deleteDeviceModal.uuid ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      To confirm, please type the device UUID below:
                    </p>
                    <p className="text-sm font-mono text-gray-600 bg-gray-50 p-2 rounded mb-2">
                      {deleteDeviceModal.uuid}
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmationInput}
                      onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter UUID to confirm deletion"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      To confirm, please type the device name below:
                    </p>
                    <p className="text-sm font-medium text-gray-600 bg-gray-50 p-2 rounded mb-2">
                      {deleteDeviceModal.name}
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmationInput}
                      onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter device name to confirm deletion"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeleteDeviceModal(null);
                    setDeleteConfirmationInput('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const confirmationText = deleteDeviceModal.uuid || deleteDeviceModal.name;
                    if (deleteConfirmationInput === confirmationText) {
                      try {
                        const result = await TrailCommandAPI.deleteDevice(deleteDeviceModal.device_id);
                        if (result) {
                          // Remove from devices list
                          setDevices(devices.filter(d => d.device_id !== deleteDeviceModal.device_id));
                          // Clear selected device if it was the deleted one
                          if (selectedDevice?.device_id === deleteDeviceModal.device_id) {
                            setSelectedDevice(null);
                            setWidgets([]);
                          }
                          setDeleteDeviceModal(null);
                          setDeleteConfirmationInput('');
                        } else {
                          alert('Failed to delete device. Please try again.');
                        }
                      } catch (error) {
                        console.error('Delete device error:', error);
                        alert('Error deleting device. Please try again.');
                      }
                    }
                  }}
                  disabled={deleteConfirmationInput !== (deleteDeviceModal.uuid || deleteDeviceModal.name)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Delete Device
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Authentication Modal */}
      {showDeviceAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Device Authentication
                </h3>
                <button
                  onClick={() => {
                    setShowDeviceAuthModal(null);
                    setAuthCodePassword('');
                    setShowFullAuthCode(false);
                    setPasswordError(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate a secure authentication code for <strong>{showDeviceAuthModal.name}</strong>
                    to connect independently without user credentials.
                  </p>
                </div>

                {showDeviceAuthModal.auth_enabled ? (
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400 dark:text-green-300" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                          Authentication Enabled
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                                Auth Code
                              </label>
                            </div>
                            {showFullAuthCode ? (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <code className="flex-1 px-3 py-2 bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-600 rounded text-sm font-mono break-all text-green-900 dark:text-green-100">
                                    {showDeviceAuthModal.auth_code}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(showDeviceAuthModal.auth_code);
                                      alert('Auth code copied to clipboard!');
                                    }}
                                    className="px-2 py-1 bg-green-600 dark:bg-green-700 text-white text-xs rounded hover:bg-green-700 dark:hover:bg-green-600"
                                  >
                                    Copy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <code className="inline-block px-3 py-2 bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-600 rounded text-sm font-mono text-green-900 dark:text-green-100">
                                  ••••••••{showDeviceAuthModal.auth_code ? showDeviceAuthModal.auth_code.slice(-8) : ''}
                                </code>

                                <div className="space-y-2">
                                  <input
                                    type="password"
                                    placeholder="Enter your password to view full auth code"
                                    value={authCodePassword}
                                    onChange={(e) => {
                                      setAuthCodePassword(e.target.value);
                                      // Don't clear error state when user types - keep it until correct password or modal close
                                    }}
                                    className={`w-full px-3 py-2 border-2 rounded-md text-sm transition-all duration-300 ${
                                      passwordError
                                        ? 'border-red-500 dark:border-red-400 animate-shake bg-red-50 dark:bg-red-900/50 text-gray-900 dark:text-red-100 ring-2 ring-red-200 dark:ring-red-500/30'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                    }`}
                                  />
                                  {passwordError && <div className="text-xs text-red-500 dark:text-red-400 mt-1">Invalid password</div>}
                                  <button
                                    onClick={async () => {
                                      if (!authCodePassword) {
                                        console.log('Setting password error to true');
                                        setPasswordError(true);
                                        // Don't auto-clear error - keep it until success or modal close
                                        return;
                                      }

                                      try {
                                        // Get current user info to get their email
                                        const userResponse = await fetch(`${TrailCommandAPI.baseUrl()}/auth/me`, {
                                          headers: {
                                            'Authorization': `Bearer ${CookieHelper.get('trailcommand-token')}`
                                          }
                                        });

                                        if (!userResponse.ok) {
                                          setPasswordError(true);
                                          // Don't auto-clear error - keep it until success or modal close
                                          return;
                                        }

                                        const userData = await userResponse.json();
                                        console.log('Auth code userData response:', userData);

                                        // Handle both response formats: { user: {...} } or direct user object
                                        const user = userData.user || userData;
                                        if (!userData || !user || !user.email) {
                                          setPasswordError(true);
                                          return;
                                        }

                                        // Verify password by attempting to login with current email and entered password
                                        const loginResponse = await fetch(`${TrailCommandAPI.baseUrl()}/auth/login`, {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json'
                                          },
                                          body: JSON.stringify({
                                            email: user.email,
                                            password: authCodePassword
                                          })
                                        });

                                        if (loginResponse.ok) {
                                          setShowFullAuthCode(true);
                                          setAuthCodePassword(''); // Clear password for security
                                          setPasswordError(false); // Clear error on success
                                        } else {
                                          setPasswordError(true);
                                          // Don't auto-clear error - keep it until success or modal close
                                        }
                                      } catch (error) {
                                        console.error('Password verification error:', error);
                                        setPasswordError(true);
                                        // Don't auto-clear error - keep it until success or modal close
                                      }
                                    }}
                                    className="w-full py-2 px-4 bg-green-600 dark:bg-green-700 text-white text-sm rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
                                    disabled={!authCodePassword}
                                  >
                                    Show Full Token
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          {showDeviceAuthModal.auth_code_expires && (
                            <div>
                              <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                                Expires
                              </label>
                              <span className="text-sm text-green-600 dark:text-green-400">
                                {new Date(showDeviceAuthModal.auth_code_expires).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400 dark:text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                          No Authentication Code
                        </h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          This device doesn't have an authentication code yet. Generate one to allow independent device connections.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between space-x-3">
                  <button
                    onClick={() => {
                      setShowDeviceAuthModal(null);
                      setAuthCodePassword('');
                      setShowFullAuthCode(false);
                      setPasswordError(false);
                    }}
                    className="flex-1 py-2 px-4 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>

                  {showDeviceAuthModal.auth_enabled ? (
                    <button
                      onClick={async () => {
                        try {
                          const result = await TrailCommandAPI.revokeDeviceAuth(showDeviceAuthModal.device_id);
                          if (result) {
                            alert('Device authentication revoked successfully!');
                            await loadDevices(); // Refresh device list
                            setShowDeviceAuthModal(null);
                            setAuthCodePassword('');
                            setShowFullAuthCode(false);
                            setPasswordError(false);
                          } else {
                            alert('Failed to revoke device authentication.');
                          }
                        } catch (error) {
                          alert('Error revoking device authentication: ' + error.message);
                        }
                      }}
                      className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Revoke Access
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const result = await TrailCommandAPI.generateDeviceAuth(showDeviceAuthModal.device_id);
                          if (result) {
                            // Show the full auth code in an alert for the user to copy
                            alert(`Device authentication code generated!\n\nAuth Code: ${result.auth_code}\n\nExpires: ${new Date(result.expires_at).toLocaleDateString()}\n\nPlease copy this code for your device configuration.`);
                            await loadDevices(); // Refresh device list
                            setShowDeviceAuthModal(null);
                            setAuthCodePassword('');
                            setShowFullAuthCode(false);
                            setPasswordError(false);
                          } else {
                            alert('Failed to generate device authentication code.');
                          }
                        } catch (error) {
                          alert('Error generating device authentication: ' + error.message);
                        }
                      }}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Generate Auth Code</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Choose Widget Type
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {widgetTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedWidgetType(type)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <type.icon className="w-8 h-8 text-blue-600 mb-2" />
                    <h4 className="font-medium text-gray-900">{type.name}</h4>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={() => {
                    setShowAddWidget(false);
                    setSelectedWidgetType(null);
                  }}
                  className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Settings</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'profile', name: 'Profile', icon: User },
                    { id: 'preferences', name: 'Preferences', icon: Settings },
                    { id: 'notifications', name: 'Notifications', icon: Bell }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsActiveTab(tab.id)}
                      className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                        settingsActiveTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4 mr-2" />
                      {tab.name}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {/* Profile Tab */}
                {settingsActiveTab === 'profile' && (
                  <div className="space-y-6">
                    {/* Profile Information */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h4>
                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Username
                            </label>
                            <input
                              type="text"
                              value={profileForm.username}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={profileForm.email}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            Update Profile
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Change Password */}
                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Change Password</h4>
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={profileForm.currentPassword}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              New Password
                            </label>
                            <input
                              type="password"
                              value={profileForm.newPassword}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              minLength="6"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              value={profileForm.confirmPassword}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              minLength="6"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          >
                            Change Password
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Token Management */}
                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Authentication Token</h4>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Token Regeneration
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>
                                Regenerating your authentication token will invalidate the current token.
                                You'll need to update any connected devices or API clients with the new token.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Token (last 8 characters)
                          </label>
                          <div className="flex items-center space-x-3">
                            <code className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono">
                              ••••••••{token ? token.slice(-8) : ''}
                            </code>
                            <span className="text-sm text-gray-500">
                              {token ? 'Active' : 'No token'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-start">
                          <button
                            type="button"
                            onClick={handleRefreshToken}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 flex items-center space-x-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Regenerate Token</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {settingsActiveTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Display Preferences</h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Timezone
                            </label>
                            <select
                              value={userSettings.timezone}
                              onChange={(e) => setUserSettings(prev => ({ ...prev, timezone: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="UTC">UTC</option>
                              <option value="America/New_York">Eastern Time</option>
                              <option value="America/Chicago">Central Time</option>
                              <option value="America/Denver">Mountain Time</option>
                              <option value="America/Los_Angeles">Pacific Time</option>
                              <option value="Europe/London">London</option>
                              <option value="Europe/Paris">Paris</option>
                              <option value="Asia/Tokyo">Tokyo</option>
                              <option value="Australia/Sydney">Sydney</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Date Format
                            </label>
                            <select
                              value={userSettings.dateFormat}
                              onChange={(e) => setUserSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                              <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Time Format
                            </label>
                            <select
                              value={userSettings.timeFormat}
                              onChange={(e) => setUserSettings(prev => ({ ...prev, timeFormat: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="24h">24 Hour</option>
                              <option value="12h">12 Hour</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Theme
                            </label>
                            <select
                              value={userSettings.theme}
                              onChange={(e) => setUserSettings(prev => ({ ...prev, theme: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="light">Light</option>
                              <option value="dark">Dark</option>
                              <option value="auto">Auto</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Dashboard Settings</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Auto Refresh</label>
                            <p className="text-xs text-gray-500">Automatically refresh dashboard data</p>
                          </div>
                          <button
                            onClick={() => setUserSettings(prev => ({ 
                              ...prev, 
                              dashboard: { ...prev.dashboard, autoRefresh: !prev.dashboard.autoRefresh }
                            }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userSettings.dashboard.autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userSettings.dashboard.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        {userSettings.dashboard.autoRefresh && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Refresh Interval (seconds)
                            </label>
                            <select
                              value={userSettings.dashboard.refreshInterval}
                              onChange={(e) => setUserSettings(prev => ({ 
                                ...prev, 
                                dashboard: { ...prev.dashboard, refreshInterval: parseInt(e.target.value) }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value={10}>10 seconds</option>
                              <option value={30}>30 seconds</option>
                              <option value={60}>1 minute</option>
                              <option value={300}>5 minutes</option>
                              <option value={600}>10 minutes</option>
                            </select>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Show Tooltips</label>
                            <p className="text-xs text-gray-500">Show helpful tooltips on widgets</p>
                          </div>
                          <button
                            onClick={() => setUserSettings(prev => ({ 
                              ...prev, 
                              dashboard: { ...prev.dashboard, showTooltips: !prev.dashboard.showTooltips }
                            }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userSettings.dashboard.showTooltips ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userSettings.dashboard.showTooltips ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end mt-6">
                        <button
                          onClick={handleUpdateSettings}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Save Preferences
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {settingsActiveTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                            <p className="text-xs text-gray-500">Receive notifications via email</p>
                          </div>
                          <button
                            onClick={() => setUserSettings(prev => ({ 
                              ...prev, 
                              notifications: { ...prev.notifications, email: !prev.notifications.email }
                            }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userSettings.notifications.email ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userSettings.notifications.email ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Browser Notifications</label>
                            <p className="text-xs text-gray-500">Show browser push notifications</p>
                          </div>
                          <button
                            onClick={() => setUserSettings(prev => ({ 
                              ...prev, 
                              notifications: { ...prev.notifications, browser: !prev.notifications.browser }
                            }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userSettings.notifications.browser ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userSettings.notifications.browser ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Alert Notifications</label>
                            <p className="text-xs text-gray-500">Receive critical device alerts</p>
                          </div>
                          <button
                            onClick={() => setUserSettings(prev => ({ 
                              ...prev, 
                              notifications: { ...prev.notifications, alerts: !prev.notifications.alerts }
                            }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userSettings.notifications.alerts ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userSettings.notifications.alerts ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end mt-6">
                        <button
                          onClick={handleUpdateSettings}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Save Notifications
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widget Configuration Dialog */}
      {selectedWidgetType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configure {selectedWidgetType.name}
              </h3>

              <WidgetConfigurationForm
                widgetType={selectedWidgetType}
                availableSensors={availableSensors}
                availableControls={availableControls}
                selectedDevice={selectedDevice}
                onSave={(widgetData) => createCompleteWidget(widgetData)}
                onCancel={() => setSelectedWidgetType(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Widget Settings Modal */}
      {widgetSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Widget Settings
                </h3>
                <button
                  onClick={() => setWidgetSettings(null)}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Widget Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Widget Name
                  </label>
                  <input
                    type="text"
                    value={widgetSettings.name}
                    onChange={(e) => setWidgetSettings(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Widget Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Widget Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                      style={{ backgroundColor: widgetSettings.config?.color || '#45B7D1' }}
                      onClick={() => setColorPickerOpen(colorPickerOpen === 'widget' ? null : 'widget')}
                    />
                    <span className="text-sm text-gray-600">
                      {widgetSettings.config?.color || '#45B7D1'}
                    </span>
                  </div>
                  {colorPickerOpen === 'widget' && (
                    <ColorPicker
                      value={widgetSettings.config?.color || '#45B7D1'}
                      onChange={(color) => setWidgetSettings(prev => ({
                        ...prev,
                        config: { ...prev.config, color }
                      }))}
                      pickerId="widget"
                    />
                  )}
                </div>

                {/* Widget Unit */}
                {(widgetSettings.type === 'gauge' || widgetSettings.type === 'value' || widgetSettings.type === 'slider') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={widgetSettings.config?.unit || ''}
                      onChange={(e) => setWidgetSettings(prev => ({
                        ...prev,
                        config: { ...prev.config, unit: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="°C, %, etc."
                    />
                  </div>
                )}

                {/* Gauge Style Selector */}
                {widgetSettings.type === 'gauge' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gauge Style
                      </label>
                      <select
                        value={widgetSettings.config?.gaugeStyle || 'modern'}
                        onChange={(e) => setWidgetSettings(prev => ({
                          ...prev,
                          config: { ...prev.config, gaugeStyle: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="modern">Modern Arc</option>
                        <option value="classic">Classic Dial</option>
                        <option value="minimal">Minimal</option>
                        <option value="neon">Neon Glow</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Animation
                        </label>
                        <select
                          value={widgetSettings.config?.animate !== false ? 'enabled' : 'disabled'}
                          onChange={(e) => setWidgetSettings(prev => ({
                            ...prev,
                            config: { ...prev.config, animate: e.target.value === 'enabled' }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="enabled">Enabled</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Show Ticks
                        </label>
                        <select
                          value={widgetSettings.config?.showTicks !== false ? 'yes' : 'no'}
                          onChange={(e) => setWidgetSettings(prev => ({
                            ...prev,
                            config: { ...prev.config, showTicks: e.target.value === 'yes' }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Options
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={widgetSettings.config?.showValue !== false}
                            onChange={(e) => setWidgetSettings(prev => ({
                              ...prev,
                              config: { ...prev.config, showValue: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Show numeric value</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={widgetSettings.config?.showMinMax !== false}
                            onChange={(e) => setWidgetSettings(prev => ({
                              ...prev,
                              config: { ...prev.config, showMinMax: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Show min/max labels</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={widgetSettings.config?.gradient !== false}
                            onChange={(e) => setWidgetSettings(prev => ({
                              ...prev,
                              config: { ...prev.config, gradient: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Gradient effect</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Min/Max Values for gauges and sliders */}
                {(widgetSettings.type === 'gauge' || widgetSettings.type === 'slider') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Value
                      </label>
                      <input
                        type="number"
                        value={widgetSettings.config?.min || 0}
                        onChange={(e) => setWidgetSettings(prev => ({
                          ...prev,
                          config: { ...prev.config, min: parseFloat(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Value
                      </label>
                      <input
                        type="number"
                        value={widgetSettings.config?.max || 100}
                        onChange={(e) => setWidgetSettings(prev => ({
                          ...prev,
                          config: { ...prev.config, max: parseFloat(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Decimals for value widget */}
                {widgetSettings.type === 'value' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Decimal Places
                    </label>
                    <select
                      value={widgetSettings.config?.decimals || 0}
                      onChange={(e) => setWidgetSettings(prev => ({
                        ...prev,
                        config: { ...prev.config, decimals: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </div>
                )}

                {/* Data Source Selection - Sensors for sensor widgets, Controls for control widgets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {(widgetSettings.type === 'button' || widgetSettings.type === 'slider')
                      ? 'Control Target'
                      : 'Sensor Data Source'}
                  </label>
                  <select
                    value={
                      (widgetSettings.type === 'button' || widgetSettings.type === 'slider')
                        ? (widgetSettings.controlId || '')
                        : (widgetSettings.sensorId || '')
                    }
                    onChange={(e) => {
                      const selectedValue = e.target.value;

                      if (widgetSettings.type === 'button' || widgetSettings.type === 'slider') {
                        // Handle control selection
                        const selectedControl = availableControls.find(c => c.control_id === selectedValue);

                        setWidgetSettings(prev => ({
                          ...prev,
                          controlId: selectedValue,
                          config: {
                            ...prev.config,
                            control_type: selectedControl?.type || 'digital',
                            description: selectedControl?.description || '',
                            // Set defaults based on control type
                            min: selectedControl?.type === 'analog' ? 0 : 0,
                            max: selectedControl?.type === 'analog' ? 255 : 1
                          }
                        }));
                      } else {
                        // Handle sensor selection
                        const selectedSensor = availableSensors.find(s => s.sensor_id === selectedValue);

                        setWidgetSettings(prev => ({
                          ...prev,
                          sensorId: selectedValue,
                          config: {
                            ...prev.config,
                            unit: selectedSensor?.unit || '',
                            data_point: selectedSensor?.type || '',
                            // Use sensor's min/max values from database, with fallbacks based on type
                            min: selectedSensor?.min_value !== null ? selectedSensor.min_value :
                                 selectedSensor?.type === 'temperature' ? -40 :
                                 selectedSensor?.type === 'humidity' ? 0 :
                                 selectedSensor?.type === 'pressure' ? 800 :
                                 selectedSensor?.type === 'light' ? 0 :
                                 selectedSensor?.type === 'motion' ? 0 :
                                 selectedSensor?.type === 'battery' ? 0 : (prev.config?.min || 0),
                            max: selectedSensor?.max_value !== null ? selectedSensor.max_value :
                                 selectedSensor?.type === 'temperature' ? 80 :
                                 selectedSensor?.type === 'humidity' ? 100 :
                                 selectedSensor?.type === 'pressure' ? 1200 :
                                 selectedSensor?.type === 'light' ? 1000 :
                                 selectedSensor?.type === 'motion' ? 1 :
                                 selectedSensor?.type === 'battery' ? 5 : (prev.config?.max || 100)
                          }
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">
                      {(widgetSettings.type === 'button' || widgetSettings.type === 'slider')
                        ? 'Select control...'
                        : 'Select sensor...'}
                    </option>
                    {(widgetSettings.type === 'button' || widgetSettings.type === 'slider')
                      ? availableControls.map(control => (
                          <option key={control.control_id} value={control.control_id}>
                            {control.name} ({control.type})
                          </option>
                        ))
                      : availableSensors.map(sensor => (
                          <option key={sensor.sensor_id} value={sensor.sensor_id}>
                            {sensor.name} {sensor.unit && `(${sensor.unit})`}
                          </option>
                        ))
                    }
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {(widgetSettings.type === 'button' || widgetSettings.type === 'slider')
                      ? 'Select which device control to operate'
                      : 'Select which sensor data to display'}
                  </p>
                </div>

                {/* Default State for buttons and LEDs */}
                {(widgetSettings.type === 'button' || widgetSettings.type === 'led') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default State
                    </label>
                    <select
                      value={widgetSettings.config?.default_state || 'off'}
                      onChange={(e) => setWidgetSettings(prev => ({
                        ...prev,
                        config: { ...prev.config, default_state: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="off">Off</option>
                      <option value="on">On</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Initial state when widget loads</p>
                  </div>
                )}

                {/* PWM Frequency for sliders */}
                {widgetSettings.type === 'slider' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PWM Frequency (Hz)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="40000"
                      value={widgetSettings.config?.pwm_frequency || 1000}
                      onChange={(e) => setWidgetSettings(prev => ({
                        ...prev,
                        config: { ...prev.config, pwm_frequency: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1000"
                    />
                    <p className="text-xs text-gray-500 mt-1">PWM frequency for analog control</p>
                  </div>
                )}

                {/* Update Interval for sensors */}
                {(widgetSettings.type === 'gauge' || widgetSettings.type === 'value') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Update Interval (ms)
                    </label>
                    <select
                      value={widgetSettings.config?.update_interval || 1000}
                      onChange={(e) => setWidgetSettings(prev => ({
                        ...prev,
                        config: { ...prev.config, update_interval: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={250}>250ms (Very Fast)</option>
                      <option value={500}>500ms (Fast)</option>
                      <option value={1000}>1 second (Normal)</option>
                      <option value={2000}>2 seconds</option>
                      <option value={5000}>5 seconds</option>
                      <option value={10000}>10 seconds (Slow)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">How often to update sensor readings</p>
                  </div>
                )}

                {/* Display Configuration for gauges and values */}
                {(widgetSettings.type === 'gauge' || widgetSettings.type === 'value') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Unit
                      </label>
                      <input
                        type="text"
                        value={widgetSettings.config?.display_unit || ''}
                        onChange={(e) => setWidgetSettings(prev => ({
                          ...prev,
                          config: { ...prev.config, display_unit: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., °C, %, hPa, lux, V"
                      />
                      <p className="text-xs text-gray-500 mt-1">Unit of measurement to display</p>
                    </div>

                  </>
                )}

                {/* Alert Thresholds */}
                {(widgetSettings.type === 'gauge' || widgetSettings.type === 'value') && (
                  <>
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Alert Thresholds</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Low Alert
                          </label>
                          <input
                            type="number"
                            value={widgetSettings.config?.low_threshold || ''}
                            onChange={(e) => setWidgetSettings(prev => ({
                              ...prev,
                              config: { ...prev.config, low_threshold: parseFloat(e.target.value) }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Min alert"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            High Alert
                          </label>
                          <input
                            type="number"
                            value={widgetSettings.config?.high_threshold || ''}
                            onChange={(e) => setWidgetSettings(prev => ({
                              ...prev,
                              config: { ...prev.config, high_threshold: parseFloat(e.target.value) }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Max alert"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={widgetSettings.config?.enable_alerts || false}
                            onChange={(e) => setWidgetSettings(prev => ({
                              ...prev,
                              config: { ...prev.config, enable_alerts: e.target.checked }
                            }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Enable threshold alerts</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Data Logging */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Data Logging</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={widgetSettings.config?.enable_logging || false}
                        onChange={(e) => setWidgetSettings(prev => ({
                          ...prev,
                          config: { ...prev.config, enable_logging: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable data logging</span>
                    </label>
                    
                    {widgetSettings.config?.enable_logging && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Log Interval
                        </label>
                        <select
                          value={widgetSettings.config?.log_interval || 60000}
                          onChange={(e) => setWidgetSettings(prev => ({
                            ...prev,
                            config: { ...prev.config, log_interval: parseInt(e.target.value) }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value={5000}>5 seconds</option>
                          <option value={30000}>30 seconds</option>
                          <option value={60000}>1 minute</option>
                          <option value={300000}>5 minutes</option>
                          <option value={900000}>15 minutes</option>
                          <option value={3600000}>1 hour</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setWidgetSettings(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const updateData = {
                        name: widgetSettings.name,
                        sensor_id: widgetSettings.sensorId,
                        control_id: widgetSettings.controlId,
                        config: {
                          ...widgetSettings.config
                        }
                      };

                      console.log('Saving widget with data:', updateData);

                      const result = await TrailCommandAPI.updateWidget(
                        widgetSettings.deviceId,
                        widgetSettings.id,
                        updateData
                      );

                      console.log('Widget save result:', result);
                      
                      if (result) {
                        // Update widget configuration
                        console.log('Updating local widget state with controlId:', widgetSettings.controlId);
                        setWidgets(prevWidgets =>
                          prevWidgets.map(w =>
                            w.id === widgetSettings.id
                              ? {
                                  ...w,
                                  name: widgetSettings.name,
                                  config: widgetSettings.config,
                                  sensorId: widgetSettings.sensorId,
                                  controlId: widgetSettings.controlId,
                                  deviceId: widgetSettings.deviceId // Make sure deviceId is also set
                                }
                              : w
                          )
                        );

                        // Fetch current sensor value to immediately update the widget
                        if (widgetSettings.sensorId && selectedDevice) {
                          try {
                            const latestData = await TrailCommandAPI.getLatestSensorValues(selectedDevice.device_id);
                            const sensorData = latestData.sensors?.find(s => s.sensor_id === widgetSettings.sensorId);
                            
                            if (sensorData) {
                              setWidgets(prevWidgets =>
                                prevWidgets.map(w =>
                                  w.id === widgetSettings.id
                                    ? { ...w, value: sensorData.value }
                                    : w
                                )
                              );
                            }
                          } catch (error) {
                            console.error('Failed to fetch latest sensor value:', error);
                          }
                        }

                        setWidgetSettings(null);
                      } else {
                        alert('Failed to update widget');
                      }
                    } catch (error) {
                      console.error('Error updating widget:', error);
                      alert('Error updating widget: ' + error.message);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrailCommandInterface;