import React, { useState, useEffect, useCallback, useRef } from 'react';
import GaugeComponent from 'react-gauge-component';
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
  Clock,
  Trash2,
  Copy,
  Move,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Menu,
  Triangle
} from 'lucide-react';

const ResponsiveGridLayout = WidthProvider(Responsive);

const BlynkWebInterface = () => {
  // State management
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [resizingWidget, setResizingWidget] = useState(null);
  const [resizeStartPos, setResizeStartPos] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [serverConfig, setServerConfig] = useState({
    host: 'localhost',
    port: '8080',
    authToken: ''
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [widgetSettings, setWidgetSettings] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(null);

  const dashboardRef = useRef(null);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerOpen && !event.target.closest('.color-picker-container')) {
        setColorPickerOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [colorPickerOpen]);

  // Widget types available
  const widgetTypes = [
    { id: 'button', name: 'Button', icon: Power, description: 'On/Off control' },
    { id: 'slider', name: 'Slider', icon: Settings, description: 'Range input control' },
    { id: 'gauge', name: 'Gauge', icon: Gauge, description: 'Circular value display' },
    { id: 'value', name: 'Value Display', icon: Activity, description: 'Numeric value display' },
    { id: 'led', name: 'LED', icon: Lightbulb, description: 'Status indicator' },
    { id: 'chart', name: 'Chart', icon: BarChart3, description: 'Historical data chart' },
    { id: 'terminal', name: 'Terminal', icon: Edit3, description: 'Text input/output' },
    { id: 'timer', name: 'Timer', icon: Clock, description: 'Scheduled control' }
  ];

  // Color picker component
  const ColorPicker = ({ value, onChange, pickerId }) => {
    const colorOptions = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1',
      '#A8F5FF', '#55DBEC', '#53B4FD', '#2397D1', '#1E40AF', '#7C3AED', '#DB2777', '#DC2626',
      '#EA580C', '#D97706', '#65A30D', '#059669', '#0891B2', '#0284C7', '#7C2D12', '#92400E',
      '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6', '#FFFFFF', '#000000', '#1F2937'
    ];

    return (
      <div className="relative color-picker-container">
        <button
          type="button"
          onClick={() => setColorPickerOpen(colorPickerOpen === pickerId ? null : pickerId)}
          className="w-full h-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 flex items-center px-2"
          style={{ backgroundColor: value }}
        >
          <div 
            className="flex-1 h-6 rounded border border-gray-200" 
            style={{ backgroundColor: value }}
          />
          <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
        </button>
        
        {colorPickerOpen === pickerId && (
          <div className="absolute z-50 mt-1 p-3 bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="grid grid-cols-8 gap-1 mb-2">
              {colorOptions.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                    value.toUpperCase() === color.toUpperCase() ? 'border-gray-800' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onChange(color);
                    setColorPickerOpen(null);
                  }}
                />
              ))}
            </div>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="#FFFFFF"
            />
          </div>
        )}
      </div>
    );
  };

  // Blynk Legacy API Service
  const BlynkAPI = {
    baseUrl: () => `http://${serverConfig.host}:${serverConfig.port}`,
    
    // Authentication
    async ping() {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/ping`);
        return response.status === 200;
      } catch (error) {
        console.error('Ping failed:', error);
        return false;
      }
    },

    // Hardware status
    async isHardwareConnected() {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/isHardwareConnected`);
        return await response.text() === '1';
      } catch (error) {
        console.error('Hardware connection check failed:', error);
        return false;
      }
    },

    async isAppConnected() {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/isAppConnected`);
        return await response.text() === '1';
      } catch (error) {
        console.error('App connection check failed:', error);
        return false;
      }
    },

    // Pin operations
    async getPinValue(pin) {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/get/${pin}`);
        if (response.ok) {
          const value = await response.text();
          return value;
        }
        throw new Error(`Failed to get pin ${pin} value`);
      } catch (error) {
        console.error(`Get pin ${pin} failed:`, error);
        return null;
      }
    },

    async setPinValue(pin, value) {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/update/${pin}?value=${value}`, {
          method: 'GET'
        });
        return response.ok;
      } catch (error) {
        console.error(`Set pin ${pin} failed:`, error);
        return false;
      }
    },

    async getAllPinValues() {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/get/all`);
        if (response.ok) {
          return await response.json();
        }
        throw new Error('Failed to get all pin values');
      } catch (error) {
        console.error('Get all pins failed:', error);
        return {};
      }
    },

    // Batch operations
    async batchUpdate(updates) {
      try {
        const updatePromises = updates.map(({ pin, value }) => 
          this.setPinValue(pin, value)
        );
        const results = await Promise.all(updatePromises);
        return results.every(result => result);
      } catch (error) {
        console.error('Batch update failed:', error);
        return false;
      }
    },

    // Project operations
    async getProject() {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/project`);
        if (response.ok) {
          return await response.json();
        }
        throw new Error('Failed to get project');
      } catch (error) {
        console.error('Get project failed:', error);
        return null;
      }
    },

    // Historical data
    async getHistoryData(pin, period = 'day') {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/data/${pin}?period=${period}`);
        if (response.ok) {
          return await response.json();
        }
        throw new Error(`Failed to get history for pin ${pin}`);
      } catch (error) {
        console.error(`Get history for pin ${pin} failed:`, error);
        return [];
      }
    },

    // Widget property operations
    async setProperty(pin, property, value) {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/setProperty/${pin}/${property}/${value}`, {
          method: 'GET'
        });
        return response.ok;
      } catch (error) {
        console.error(`Set property ${property} for pin ${pin} failed:`, error);
        return false;
      }
    },

    // Bridge operations
    async bridgeWrite(bridgePin, pin, value) {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/bridge/${bridgePin}/write/${pin}?value=${value}`, {
          method: 'GET'
        });
        return response.ok;
      } catch (error) {
        console.error(`Bridge write failed:`, error);
        return false;
      }
    },

    // Email and notifications
    async sendEmail(to, subject, message) {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject, message })
        });
        return response.ok;
      } catch (error) {
        console.error('Send email failed:', error);
        return false;
      }
    },

    async notify(message) {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/notify?message=${encodeURIComponent(message)}`, {
          method: 'GET'
        });
        return response.ok;
      } catch (error) {
        console.error('Notify failed:', error);
        return false;
      }
    },

    // Log events
    async logEvent(eventName, description) {
      try {
        const response = await fetch(`${this.baseUrl()}/${serverConfig.authToken}/logEvent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName, description })
        });
        return response.ok;
      } catch (error) {
        console.error('Log event failed:', error);
        return false;
      }
    }
  };

  // Mock data for demonstration
  const mockData = {
    projects: [
      {
        id: 1,
        name: 'Smart Home',
        dashboardLayout: {
          cols: 12,
          rows: 8
        }
      },
      {
        id: 2,
        name: 'Garden Monitor',
        dashboardLayout: {
          cols: 12,
          rows: 6
        }
      }
    ],
    widgets: [
      {
        id: 'w1',
        type: 'button',
        pin: 'V1',
        name: 'Living Room Light',
        position: { x: 0, y: 0, w: 4, h: 4 },
        config: { onColor: '#4CAF50', offColor: '#9E9E9E' },
        value: false
      },
      {
        id: 'w2',
        type: 'gauge',
        pin: 'V2',
        name: 'Temperature',
        position: { x: 4, y: 0, w: 4, h: 4 },
        config: { min: 0, max: 50, unit: '°C', color: '#FF5722' },
        value: 23.5
      },
      {
        id: 'w3',
        type: 'slider',
        pin: 'V3',
        name: 'Fan Speed',
        position: { x: 8, y: 0, w: 4, h: 4 },
        config: { min: 0, max: 100, step: 1 },
        value: 75
      },
      {
        id: 'w4',
        type: 'value',
        pin: 'V4',
        name: 'Humidity',
        position: { x: 0, y: 4, w: 4, h: 4 },
        config: { suffix: '%', decimals: 1 },
        value: 45.2
      },
      {
        id: 'w5',
        type: 'led',
        pin: 'V5',
        name: 'Motion Detected',
        position: { x: 4, y: 4, w: 4, h: 4 },
        config: { onColor: '#F44336', offColor: '#4CAF50' },
        value: false
      }
    ]
  };

  // Initialize with mock data
  useEffect(() => {
    setProjects(mockData.projects);
    setSelectedProject(mockData.projects[0]);
    setWidgets(mockData.widgets);
    
    // Check connection periodically
    const checkConnection = async () => {
      if (serverConfig.authToken) {
        const connected = await BlynkAPI.ping();
        setIsConnected(connected);
      }
    };
    
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [serverConfig.authToken]);

  // Auto-refresh widget values
  useEffect(() => {
    if (!isConnected || !selectedProject) return;

    const refreshData = async () => {
      try {
        const allValues = await BlynkAPI.getAllPinValues();
        setWidgets(prevWidgets => 
          prevWidgets.map(widget => ({
            ...widget,
            value: allValues[widget.pin] !== undefined ? allValues[widget.pin] : widget.value
          }))
        );
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    };

    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [isConnected, selectedProject]);

  // Widget update handler
  const updateWidget = async (widgetId, newValue) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    // Update local state immediately for responsiveness
    setWidgets(prev => 
      prev.map(w => w.id === widgetId ? { ...w, value: newValue } : w)
    );

    // Send to Blynk server
    if (isConnected) {
      const success = await BlynkAPI.setPinValue(widget.pin, newValue);
      if (!success) {
        console.error(`Failed to update ${widget.pin} on server`);
        // Optionally revert local state
      }
    }
  };

  // FlowFuse-style auto-layout system
  const autoLayoutWidgets = (widgetList, changedWidget = null, targetPosition = null) => {
    const maxCols = (selectedProject && selectedProject.dashboardLayout && selectedProject.dashboardLayout.cols) || 12;
    const sortedWidgets = [...widgetList].sort((a, b) => {
      // If we have a target position for the changed widget, prioritize it
      if (changedWidget && targetPosition) {
        if (a.id === changedWidget.id) return -1;
        if (b.id === changedWidget.id) return 1;
      }
      // Sort by current y position, then x position
      if (a.position.y === b.position.y) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });

    const result = [];
    let currentRow = 0;
    let currentX = 0;

    sortedWidgets.forEach(widget => {
      let w = widget.position.w;
      let h = widget.position.h;
      let targetX = currentX;
      let targetY = currentRow;

      // If this is the widget being moved and we have a target position
      if (changedWidget && widget.id === changedWidget.id && targetPosition) {
        targetX = targetPosition.x;
        targetY = targetPosition.y;
        
        // Find the best row for this position
        let bestRow = targetY;
        let rowFits = false;
        
        // Check if it fits at the target position
        while (!rowFits && bestRow < 50) { // Prevent infinite loop
          if (targetX + w <= maxCols) {
            // Check if this position conflicts with any already placed widgets
            const conflicts = result.some(placedWidget => {
              const px = placedWidget.position.x;
              const py = placedWidget.position.y;
              const pw = placedWidget.position.w;
              const ph = placedWidget.position.h;
              
              return !(targetX >= px + pw || targetX + w <= px || bestRow >= py + ph || bestRow + h <= py);
            });
            
            if (!conflicts) {
              rowFits = true;
              targetY = bestRow;
            } else {
              bestRow++;
            }
          } else {
            bestRow++;
            targetX = 0;
          }
        }
      } else {
        // Auto-layout logic for other widgets
        // Check if widget fits on current row
        if (currentX + w > maxCols) {
          // Move to next row
          currentRow = Math.max(currentRow + 1, ...result.map(w => w.position.y + w.position.h));
          currentX = 0;
          targetX = 0;
          targetY = currentRow;
        }
        
        // Find next available position in this row
        let positionFound = false;
        while (!positionFound && targetY < 50) { // Prevent infinite loop
          const conflicts = result.some(placedWidget => {
            const px = placedWidget.position.x;
            const py = placedWidget.position.y;
            const pw = placedWidget.position.w;
            const ph = placedWidget.position.h;
            
            return !(targetX >= px + pw || targetX + w <= px || targetY >= py + ph || targetY + h <= py);
          });
          
          if (!conflicts && targetX + w <= maxCols) {
            positionFound = true;
          } else {
            targetX++;
            if (targetX + w > maxCols) {
              targetY++;
              targetX = 0;
            }
          }
        }
      }

      result.push({
        ...widget,
        position: { ...widget.position, x: targetX, y: targetY }
      });

      // Update current position for next widget
      if (!changedWidget || widget.id !== changedWidget.id) {
        currentX = targetX + w;
        currentRow = Math.max(currentRow, targetY);
      }
    });

    return result;
  };

  // Helper function to check if position is available (legacy - keeping for compatibility)
  const isPositionAvailable = (x, y, w, h, excludeId = null) => {
    return !widgets.some(widget => {
      if (widget.id === excludeId) return false;
      const wx = widget.position.x;
      const wy = widget.position.y;
      const ww = widget.position.w;
      const wh = widget.position.h;
      
      return !(x >= wx + ww || x + w <= wx || y >= wy + wh || y + h <= wy);
    });
  };

  // Find next available position using auto-layout
  const findNextAvailablePosition = (w, h) => {
    const tempWidget = { id: 'temp', position: { w, h, x: 0, y: 0 } };
    const layouted = autoLayoutWidgets([...widgets, tempWidget]);
    const placedWidget = layouted.find(widget => widget.id === 'temp');
    return { x: placedWidget.position.x, y: placedWidget.position.y };
  };

  // Grid snapping helper
  const snapToGrid = (value, cellSize) => {
    return Math.round(value / cellSize) * cellSize;
  };

  // Handle layout changes from react-grid-layout
  const handleLayoutChange = (layout) => {
    if (!editMode) return;
    
    // Update widget positions based on layout changes
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
  };

  // Grafana-style resize handler (bottom-right only)
  const handleResizeStart = (e, widget, direction) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startPos = { x: e.clientX, y: e.clientY };
    const startWidget = { ...widget };
    
    const handleMouseMove = (e) => {
      const rect = dashboardRef.current.getBoundingClientRect();
      const cellWidth = rect.width / 12;
      const cellHeight = 48;
      
      // Calculate deltas in grid units
      const rawDeltaX = (e.clientX - startPos.x) / cellWidth;
      const rawDeltaY = (e.clientY - startPos.y) / cellHeight;
      
      // Apply snapping to deltas
      const deltaX = Math.round(rawDeltaX);
      const deltaY = Math.round(rawDeltaY);
      
      const maxCols = (selectedProject && selectedProject.dashboardLayout && selectedProject.dashboardLayout.cols) || 12;
      const maxRows = selectedProject?.dashboardLayout?.rows || 8;
      
      // Only handle bottom-right resize (expanding width and height)
      const newW = Math.max(4, Math.min(startWidget.position.w + deltaX, maxCols - startWidget.position.x));
      const newH = Math.max(4, Math.min(startWidget.position.h + deltaY, maxRows - startWidget.position.y));
      
      // Update the widget with new size and auto-layout the rest
      const updatedWidget = { 
        ...widget, 
        position: { 
          x: startWidget.position.x, 
          y: startWidget.position.y, 
          w: newW, 
          h: newH 
        } 
      };
      const updatedWidgets = widgets.map(w => w.id === widget.id ? updatedWidget : w);
      const newLayout = autoLayoutWidgets(updatedWidgets, updatedWidget, { 
        x: startWidget.position.x, 
        y: startWidget.position.y 
      });
      
      setWidgets(newLayout);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getNextAvailablePin = () => {
    const usedPins = new Set(widgets.map(w => w.pin));
    let pinNumber = 0;
    while (usedPins.has(`V${pinNumber}`)) {
      pinNumber++;
    }
    return `V${pinNumber}`;
  };

  const addNewWidget = (type) => {
    const defaultSize = { w: 8, h: 8 };
    
    const newWidget = {
      id: `w${Date.now()}`,
      type,
      pin: getNextAvailablePin(),
      name: `New ${type}`,
      position: { x: 0, y: 0, ...defaultSize },
      config: {},
      value: type === 'button' || type === 'led' ? false : 0
    };
    
    // Use auto-layout to find the best position for the new widget
    const newLayout = autoLayoutWidgets([...widgets, newWidget]);
    
    setWidgets(newLayout);
    setShowAddWidget(false);
  };

  const deleteWidget = (widgetId) => {
    const widget = widgets.find(w => w.id === widgetId);
    setDeleteConfirmation({
      widgetId,
      widgetName: widget ? widget.name : 'this widget'
    });
  };

  const confirmDelete = () => {
    if (deleteConfirmation) {
      const remainingWidgets = widgets.filter(w => w.id !== deleteConfirmation.widgetId);
      const newLayout = autoLayoutWidgets(remainingWidgets);
      setWidgets(newLayout);
      setDeleteConfirmation(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const openWidgetSettings = (widgetId) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      setWidgetSettings({ ...widget });
    }
  };

  const closeWidgetSettings = () => {
    setWidgetSettings(null);
  };

  const saveWidgetSettings = (updatedWidget) => {
    setWidgets(prev => 
      prev.map(w => w.id === updatedWidget.id ? updatedWidget : w)
    );
    setWidgetSettings(null);
  };

  // Grafana-style Resize Handle Component
  const ResizeHandles = ({ widget }) => (
    <div className="absolute inset-0 pointer-events-none">
      {/* Grafana-style bottom-right resize handle */}
      <div 
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-teal-500 to-teal-600 border border-white/80 cursor-se-resize pointer-events-auto z-10 shadow-lg shadow-teal-500/30 hover:scale-110 transition-all duration-200 flex items-center justify-center"
        onMouseDown={(e) => handleResizeStart(e, widget, 'bottom-right')}
        style={{ 
          clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
          borderRadius: '0 0 4px 0'
        }}
        title="Drag to resize"
      >
        <Triangle 
          className="text-white/80" 
          style={{ 
            width: '8px', 
            height: '8px', 
            transform: 'rotate(135deg)',
            marginTop: '1px',
            marginLeft: '1px'
          }} 
        />
      </div>
    </div>
  );

  // Responsive scaling functions
  const getScaleFactors = (position) => {
    const area = position.w * position.h;
    const baseArea = 64; // 8x8 widget base size (4x increase)
    const scaleFactor = Math.sqrt(area / baseArea);
    
    // More conservative scaling for small widgets
    const minWidthHeight = Math.min(position.w, position.h);
    const isSmallWidget = minWidthHeight < 8; // Updated for 4x larger minimum
    const isLargeWidget = area > 128; // Updated for 4x larger widgets
    
    return {
      iconScale: isSmallWidget 
        ? Math.max(0.5, Math.min(scaleFactor * 0.6, 1.0))
        : Math.max(0.7, Math.min(scaleFactor * 0.8, 2.5)),
      textScale: isSmallWidget 
        ? Math.max(0.6, Math.min(scaleFactor * 0.5, 0.9))
        : Math.max(0.8, Math.min(scaleFactor * 0.6, 1.8)),
      paddingScale: isSmallWidget 
        ? Math.max(0.3, Math.min(scaleFactor * 0.4, 0.8))
        : Math.max(0.8, Math.min(scaleFactor * 0.5, 1.5)),
      gaugeScale: isSmallWidget 
        ? Math.max(0.4, Math.min(scaleFactor * 0.5, 0.8))
        : Math.max(0.6, Math.min(scaleFactor * 0.7, 2.0))
    };
  };

  const getResponsiveIconSize = (position) => {
    const { iconScale } = getScaleFactors(position);
    const baseSize = 36; // Base icon size in pixels - increased 50% for larger text
    return Math.round(baseSize * iconScale);
  };

  const getResponsiveTextSizes = (position) => {
    const { textScale } = getScaleFactors(position);
    return {
      title: Math.max(24, Math.round(27 * textScale)),
      value: Math.max(30, Math.round(42 * textScale)),
      label: Math.max(18, Math.round(21 * textScale)),
      button: Math.max(24, Math.round(27 * textScale))
    };
  };

  const getResponsivePadding = (position) => {
    const { paddingScale } = getScaleFactors(position);
    return Math.max(8, Math.round(16 * paddingScale));
  };

  const getResponsiveGaugeSize = (position) => {
    const padding = getResponsivePadding(position);
    
    // Calculate available space after padding and text
    const availableWidth = (position.w * 48) - (padding * 2);
    const availableHeight = (position.h * 48) - (padding * 2) - 80; // Reserve space for title and value text
    
    // Make gauge very big - use most of the available space
    const targetSize = Math.min(availableWidth * 2.5, availableHeight * 3.5);
    
    // Allow for very large gauges
    return Math.min(1200, Math.max(300, targetSize));
  };

  // Convert widgets to react-grid-layout format
  const getLayoutFromWidgets = () => {
    return widgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
      minW: 4,
      minH: 4,
    }));
  };

  // Widget renderer
  const renderWidget = (widget) => {
    const { id, type, name, position, config, value, pin } = widget;
    
    // Get responsive sizing
    const iconSize = getResponsiveIconSize(position);
    const textSizes = getResponsiveTextSizes(position);
    const padding = getResponsivePadding(position);
    const gaugeSize = getResponsiveGaugeSize(position);
    
    const widgetStyle = {
      padding: `${padding}px`,
      height: '100%'
    };

    const baseClasses = `bg-white rounded-lg shadow-sm hover:shadow-md border transition-all duration-300 ease-out relative overflow-hidden ${
      editMode 
        ? 'border-dashed border-teal-200 hover:border-teal-300 hover:shadow-md cursor-move bg-teal-50/30' 
        : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
    }`;

    switch (type) {
      case 'button':
        return (
          <div key={id} className={baseClasses} style={widgetStyle}>
            {/* Floating Edit Controls Banner */}
            {editMode && (
              <div className="absolute top-0 left-0 right-0 bg-teal-100/80 border-b border-teal-200/50 flex justify-between items-center px-3 py-2 z-20 rounded-t-lg shadow-sm">
                <Grip style={{ width: 20, height: 20 }} className="text-gray-400" />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      openWidgetSettings(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-blue-500 hover:text-blue-700 pointer-events-auto"
                    title="Widget Settings"
                  >
                    <Settings style={{ width: 20, height: 20 }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteWidget(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-red-500 hover:text-red-700 pointer-events-auto"
                    title="Delete Widget"
                  >
                    <Trash2 style={{ width: 20, height: 20 }} />
                  </button>
                </div>
              </div>
            )}
            
            <div 
              style={{ fontSize: textSizes.title }} 
              className="text-gray-700 mb-4 font-medium truncate text-center"
              title={name}
            >
              {name}
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              {/* Rectangular Button */}
              <button
                onClick={() => !editMode && updateWidget(id, !value)}
                disabled={editMode}
                className={`w-full px-6 py-9 rounded-lg font-medium transition-all duration-300 ease-out shadow-lg hover:shadow-xl active:scale-95 ${
                  value 
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                } ${editMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  fontSize: Math.min(textSizes.value * 1.5, position.h * 40),
                  minHeight: Math.max(120, position.h * 37)
                }}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Power 
                    style={{ 
                      width: Math.min(iconSize * 0.7, position.w * 35, position.h * 25), 
                      height: Math.min(iconSize * 0.7, position.w * 35, position.h * 25)
                    }} 
                    className="transition-transform duration-200" 
                  />
                  <span className="font-semibold tracking-wide">
                    {value ? 'ON' : 'OFF'}
                  </span>
                </div>
              </button>
            </div>
            {editMode && <ResizeHandles widget={widget} />}
          </div>
        );

      case 'gauge':
        return (
          <div key={id} className={baseClasses} style={widgetStyle}>
            {/* Floating Edit Controls Banner */}
            {editMode && (
              <div className="absolute top-0 left-0 right-0 bg-teal-100/80 border-b border-teal-200/50 flex justify-between items-center px-3 py-2 z-20 rounded-t-lg shadow-sm">
                <Grip style={{ width: 20, height: 20 }} className="text-gray-400" />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      openWidgetSettings(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-blue-500 hover:text-blue-700 pointer-events-auto"
                    title="Widget Settings"
                  >
                    <Settings style={{ width: 20, height: 20 }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteWidget(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-red-500 hover:text-red-700 pointer-events-auto"
                    title="Delete Widget"
                  >
                    <Trash2 style={{ width: 20, height: 20 }} />
                  </button>
                </div>
              </div>
            )}
            <div 
              style={{ fontSize: textSizes.title }} 
              className="text-gray-700 mb-3 font-medium truncate text-center"
              title={name}
            >
              {name}
            </div>
            <div className="flex flex-col items-center" style={{ height: `calc(100% - ${textSizes.title + 24}px)` }}>
              <div className="flex items-center justify-center" style={{ flex: '0 1 auto', maxHeight: '70%' }}>
                <GaugeComponent
                id={`gauge-component-${id}`}
                type="semicircle"
                arc={{
                  gradient: true,
                  width: 0.2,
                  padding: 0.02,
                  cornerRadius: 1,
                  subArcs: [
                    {
                      limit: (config.min || 0) + ((config.max || 100) - (config.min || 0)) * ((config.range1 || 25) / 100),
                      color: config.color1 || '#A8F5FF',
                      showTick: false
                    },
                    {
                      limit: (config.min || 0) + ((config.max || 100) - (config.min || 0)) * ((config.range2 || 50) / 100),
                      color: config.color2 || '#55DBEC',
                      showTick: false
                    },
                    {
                      limit: (config.min || 0) + ((config.max || 100) - (config.min || 0)) * ((config.range3 || 75) / 100),
                      color: config.color3 || '#53B4FD',
                      showTick: false
                    },
                    {
                      limit: config.max || 100,
                      color: config.color4 || '#2397D1',
                      showTick: false
                    }
                  ]
                }}
                pointer={{
                  type: "needle",
                  elastic: true,
                  animationDelay: 100,
                  animationDuration: 1000,
                  color: '#374151',
                  width: 12,
                  length: 0.8
                }}
                value={value}
                minValue={config.min || 0}
                maxValue={config.max || 100}
                style={{ 
                  width: `${gaugeSize}px`, 
                  height: `${gaugeSize * 0.5}px`,
                  marginBottom: '20px'
                }}
                labels={{
                  valueLabel: {
                    hide: true
                  },
                  tickLabels: {
                    type: 'outer',
                    hideMinMax: false,
                    defaultTickValueConfig: {
                      formatTextValue: (value) => String(value),
                      style: { fontSize: '16px', fill: '#6b7280', fontWeight: 'bold' }
                    },
                    ticks: [
                      { 
                        value: config.min || 0,
                        valueConfig: { formatTextValue: (value) => String(value), style: { fontSize: '16px', fill: '#6b7280', fontWeight: 'bold' } }
                      },
                      { 
                        value: config.max || 100,
                        valueConfig: { formatTextValue: (value) => String(value), style: { fontSize: '16px', fill: '#6b7280', fontWeight: 'bold' } }
                      }
                    ]
                  }
                }}
              />
              </div>
              
              {/* Value display under the gauge */}
              <div className="flex flex-col justify-center text-center" style={{ flex: '1 1 auto', minHeight: '30%' }}>
                <div 
                  style={{ fontSize: `${textSizes.value * 1.5}px` }}
                  className="text-gray-800 font-bold"
                >
                  {Math.round(value)}{config.unit ? ` ${config.unit}` : ''}
                </div>
                {config.label && (
                  <div 
                    style={{ fontSize: `${textSizes.label}px` }}
                    className="text-gray-500 mt-1"
                  >
                    {config.label}
                  </div>
                )}
              </div>
            </div>
            {editMode && <ResizeHandles widget={widget} />}
          </div>
        );

      case 'slider':
        return (
          <div key={id} className={baseClasses} style={widgetStyle}>
            {/* Floating Edit Controls Banner */}
            {editMode && (
              <div className="absolute top-0 left-0 right-0 bg-teal-100/80 border-b border-teal-200/50 flex justify-between items-center px-3 py-2 z-20 rounded-t-lg shadow-sm">
                <Grip style={{ width: 20, height: 20 }} className="text-gray-400" />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      openWidgetSettings(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-blue-500 hover:text-blue-700 pointer-events-auto"
                    title="Widget Settings"
                  >
                    <Settings style={{ width: 20, height: 20 }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteWidget(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-red-500 hover:text-red-700 pointer-events-auto"
                    title="Delete Widget"
                  >
                    <Trash2 style={{ width: 20, height: 20 }} />
                  </button>
                </div>
              </div>
            )}
            <div className="h-full flex flex-col items-center px-4">
              <div 
                style={{ fontSize: textSizes.title }} 
                className="text-gray-700 font-medium truncate text-center"
                title={name}
              >
                {name}
              </div>
              <div className="flex-1 flex flex-col justify-center w-full max-w-sm">
                <div className="space-y-1">
                <div className="text-center">
                  <span style={{ fontSize: Math.min(textSizes.value * 1.5, position.h * 40) }} className="font-bold text-gray-800">{value}</span>
                  <span style={{ fontSize: Math.min(textSizes.label * 1.5, position.h * 22) }} className="text-gray-500 font-medium ml-1">{config.suffix || '%'}</span>
                </div>
                <div className="relative flex items-center">
                <input
                  type="range"
                  min={config.min || 0}
                  max={config.max || 100}
                  step={config.step || 1}
                  value={value}
                  onChange={(e) => !editMode && updateWidget(id, parseInt(e.target.value))}
                  disabled={editMode}
                  style={{ 
                    height: Math.max(40, Math.min(padding * 5, position.h * 40)),
                    background: `linear-gradient(to right, #0d9488 0%, #0d9488 ${value}%, #e2e8f0 ${value}%, #e2e8f0 100%)`,
                    WebkitAppearance: 'none',
                    outline: 'none'
                  }}
                  className={`w-full appearance-none rounded-lg cursor-pointer transition-all duration-200 slider-custom ${
                    editMode ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:shadow-teal-500/25'
                  }`}
                />
              </div>
                </div>
              </div>
            </div>
            {editMode && <ResizeHandles widget={widget} />}
          </div>
        );

      case 'value':
        return (
          <div key={id} className={baseClasses} style={widgetStyle}>
            {/* Floating Edit Controls Banner */}
            {editMode && (
              <div className="absolute top-0 left-0 right-0 bg-teal-100/80 border-b border-teal-200/50 flex justify-between items-center px-3 py-2 z-20 rounded-t-lg shadow-sm">
                <Grip style={{ width: 20, height: 20 }} className="text-gray-400" />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      openWidgetSettings(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-blue-500 hover:text-blue-700 pointer-events-auto"
                    title="Widget Settings"
                  >
                    <Settings style={{ width: 20, height: 20 }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteWidget(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-red-500 hover:text-red-700 pointer-events-auto"
                    title="Delete Widget"
                  >
                    <Trash2 style={{ width: 20, height: 20 }} />
                  </button>
                </div>
              </div>
            )}
            <div className="h-full flex flex-col items-center px-4">
              <div 
                style={{ fontSize: textSizes.title }} 
                className="text-gray-700 font-medium truncate text-center"
                title={name}
              >
                {name}
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div 
                  style={{ 
                    fontSize: Math.min(textSizes.value * 1.5, position.h * 40)
                  }} 
                  className="font-bold text-center"
                >
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    {typeof value === 'number' && config.decimals ? value.toFixed(config.decimals) : value}
                  </span>
                  {config.suffix && (
                    <span className="text-slate-500 dark:text-slate-400 font-bold ml-1">{config.suffix}</span>
                  )}
                </div>
              </div>
            </div>
            {editMode && <ResizeHandles widget={widget} />}
          </div>
        );

      case 'led':
        const availableWidth = (position.w * 48) - (padding * 2);
        const availableHeight = (position.h * 48) - (padding * 3) - 60; // Reserve space for title and status
        const maxLedSize = Math.min(availableWidth, availableHeight);
        const ledSize = Math.max(84, Math.min(iconSize * 5.6, Math.min(maxLedSize, 240)));
        const ledIconSize = ledSize * 1.1;
        return (
          <div key={id} className={baseClasses} style={widgetStyle}>
            {/* Floating Edit Controls Banner */}
            {editMode && (
              <div className="absolute top-0 left-0 right-0 bg-teal-100/80 border-b border-teal-200/50 flex justify-between items-center px-3 py-2 z-20 rounded-t-lg shadow-sm">
                <Grip style={{ width: 20, height: 20 }} className="text-gray-400" />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      openWidgetSettings(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-blue-500 hover:text-blue-700 pointer-events-auto"
                    title="Widget Settings"
                  >
                    <Settings style={{ width: 20, height: 20 }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteWidget(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-red-500 hover:text-red-700 pointer-events-auto"
                    title="Delete Widget"
                  >
                    <Trash2 style={{ width: 20, height: 20 }} />
                  </button>
                </div>
              </div>
            )}
            <div 
              style={{ fontSize: textSizes.title }} 
              className="text-gray-700 mb-3 font-medium truncate text-center"
              title={name}
            >
              {name}
            </div>
            <div className="flex items-center justify-center h-full">
              <span 
                style={{ fontSize: `${ledIconSize}px`, lineHeight: '1' }}
                className={`material-icons transition-all duration-300 ${
                  value 
                    ? 'text-emerald-500 scale-110 drop-shadow-lg' 
                    : 'text-slate-400'
                }`}
              >
                {config.icon || 'lightbulb'}
              </span>
            </div>
            <div className="text-center mt-2">
              <div style={{ fontSize: textSizes.label }} className={`font-semibold ${
                value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {value ? 'ON' : 'OFF'}
              </div>
            </div>
            {editMode && <ResizeHandles widget={widget} />}
          </div>
        );

      default:
        return (
          <div key={id} className={baseClasses} style={widgetStyle}>
            {/* Floating Edit Controls Banner */}
            {editMode && (
              <div className="absolute top-0 left-0 right-0 bg-teal-100/80 border-b border-teal-200/50 flex justify-between items-center px-3 py-2 z-20 rounded-t-lg shadow-sm">
                <Grip style={{ width: 20, height: 20 }} className="text-gray-400" />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      openWidgetSettings(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-blue-500 hover:text-blue-700 pointer-events-auto"
                    title="Widget Settings"
                  >
                    <Settings style={{ width: 20, height: 20 }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteWidget(id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-red-500 hover:text-red-700 pointer-events-auto"
                    title="Delete Widget"
                  >
                    <Trash2 style={{ width: 20, height: 20 }} />
                  </button>
                </div>
              </div>
            )}
            <div style={{ fontSize: textSizes.title }} className="text-gray-500 mb-2 text-center">{name}</div>
            <div className="flex items-center justify-center h-full text-gray-400">
              <Activity style={{ width: iconSize * 1.5, height: iconSize * 1.5 }} />
            </div>
            {editMode && <ResizeHandles widget={widget} />}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen font-roboto" style={{ backgroundColor: 'rgb(250, 250, 250)', fontFamily: 'Roboto, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      <style>{`
        .slider-custom::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 64px;
          height: 48px;
          border-radius: 8px;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #0d9488;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .slider-custom::-moz-range-thumb {
          width: 64px;
          height: 48px;
          border-radius: 8px;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #0d9488;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-bold text-gray-800">ESP Dashboard</h1>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${isConnected ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-800'}`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="text-base font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {selectedProject && (
                <>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      editMode 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  >
                    {editMode ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    <span>{editMode ? 'Exit Edit' : 'Edit Mode'}</span>
                  </button>
                  
                  {editMode && (
                    <button
                      onClick={async () => {
                        // Save dashboard layout to server
                        const layoutData = {
                          projectId: selectedProject.id,
                          widgets: widgets.map(({ id, position, config, pin, name, type }) => ({
                            id, position, config, pin, name, type
                          }))
                        };
                        console.log('Saving layout:', layoutData);
                        // In real implementation, save to Blynk server or local storage
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  )}
                </>
              )}

              <button
                onClick={async () => {
                  if (isConnected) {
                    const allValues = await BlynkAPI.getAllPinValues();
                    console.log('Refreshed data:', allValues);
                  }
                }}
                className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-teal-50 border-b border-teal-200 p-4">
          <div className="max-w-full mx-auto">
            <h3 className="text-lg font-medium text-teal-800 mb-4">ESP Server Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Host</label>
                <input
                  type="text"
                  value={serverConfig.host}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, host: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  placeholder="localhost or server IP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Port</label>
                <input
                  type="text"
                  value={serverConfig.port}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, port: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  placeholder="8080 (default HTTP port)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Auth Token</label>
                <input
                  type="password"
                  value={serverConfig.authToken}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, authToken: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Your Blynk project auth token"
                />
              </div>
            </div>
            <div className="mt-4 flex space-x-4">
              <button
                onClick={async () => {
                  const connected = await BlynkAPI.ping();
                  setIsConnected(connected);
                  if (connected) {
                    await BlynkAPI.logEvent('WebUI', 'Connected to Blynk Legacy server');
                  }
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
              >
                Test Connection
              </button>
              <button
                onClick={async () => {
                  if (isConnected) {
                    await BlynkAPI.notify('Hello from Blynk Legacy Web UI!');
                  }
                }}
                disabled={!isConnected}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Add Widget</h3>
              <button
                onClick={() => setShowAddWidget(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {widgetTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => addNewWidget(type.id)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors"
                  >
                    <IconComponent className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <div className="font-medium text-sm text-gray-800">{type.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Delete Widget</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">"{deleteConfirmation.widgetName}"</span>?
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget Settings Modal */}
      {widgetSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full m-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Widget Settings</h3>
                  <p className="text-sm text-gray-600">{widgetSettings.name}</p>
                </div>
              </div>
              <button
                onClick={closeWidgetSettings}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Widget Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Widget Name</label>
                <input
                  type="text"
                  value={widgetSettings.name}
                  onChange={(e) => setWidgetSettings(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Blynk Pin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blynk Pin</label>
                <input
                  type="text"
                  value={widgetSettings.pin}
                  onChange={(e) => setWidgetSettings(prev => ({ ...prev, pin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="V0, A1, D2, etc."
                />
              </div>

              {/* Widget-specific settings */}
              {widgetSettings.type === 'gauge' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Value</label>
                      <input
                        type="number"
                        value={widgetSettings.config.min || 0}
                        onChange={(e) => setWidgetSettings(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, min: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Value</label>
                      <input
                        type="number"
                        value={widgetSettings.config.max || 100}
                        onChange={(e) => setWidgetSettings(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, max: parseFloat(e.target.value) || 100 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={widgetSettings.config.unit || ''}
                      onChange={(e) => setWidgetSettings(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, unit: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="°C, %, RPM, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Range Colors & Values</label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Range 1 Color</label>
                          <ColorPicker
                            value={widgetSettings.config.color1 || '#A8F5FF'}
                            onChange={(color) => setWidgetSettings(prev => ({ 
                              ...prev, 
                              config: { ...prev.config, color1: color }
                            }))}
                            pickerId="color1"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1">End at (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={widgetSettings.config.range1 || 25}
                            onChange={(e) => setWidgetSettings(prev => ({ 
                              ...prev, 
                              config: { ...prev.config, range1: parseFloat(e.target.value) || 25 }
                            }))}
                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Range 2 Color</label>
                          <ColorPicker
                            value={widgetSettings.config.color2 || '#55DBEC'}
                            onChange={(color) => setWidgetSettings(prev => ({ 
                              ...prev, 
                              config: { ...prev.config, color2: color }
                            }))}
                            pickerId="color2"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1">End at (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={widgetSettings.config.range2 || 50}
                            onChange={(e) => setWidgetSettings(prev => ({ 
                              ...prev, 
                              config: { ...prev.config, range2: parseFloat(e.target.value) || 50 }
                            }))}
                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Range 3 Color</label>
                          <ColorPicker
                            value={widgetSettings.config.color3 || '#53B4FD'}
                            onChange={(color) => setWidgetSettings(prev => ({ 
                              ...prev, 
                              config: { ...prev.config, color3: color }
                            }))}
                            pickerId="color3"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1">End at (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={widgetSettings.config.range3 || 75}
                            onChange={(e) => setWidgetSettings(prev => ({ 
                              ...prev, 
                              config: { ...prev.config, range3: parseFloat(e.target.value) || 75 }
                            }))}
                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Range 4 Color</label>
                          <ColorPicker
                            value={widgetSettings.config.color4 || '#2397D1'}
                            onChange={(color) => setWidgetSettings(prev => ({ 
                              ...prev, 
                              config: { ...prev.config, color4: color }
                            }))}
                            pickerId="color4"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1">End at (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={100}
                            disabled
                            className="w-full px-2 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {widgetSettings.type === 'slider' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min</label>
                      <input
                        type="number"
                        value={widgetSettings.config.min || 0}
                        onChange={(e) => setWidgetSettings(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, min: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max</label>
                      <input
                        type="number"
                        value={widgetSettings.config.max || 100}
                        onChange={(e) => setWidgetSettings(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, max: parseFloat(e.target.value) || 100 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Step</label>
                      <input
                        type="number"
                        value={widgetSettings.config.step || 1}
                        onChange={(e) => setWidgetSettings(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, step: parseFloat(e.target.value) || 1 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit/Suffix</label>
                    <input
                      type="text"
                      value={widgetSettings.config.suffix || '%'}
                      onChange={(e) => setWidgetSettings(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, suffix: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="%, °C, RPM, etc."
                    />
                  </div>
                </>
              )}

              {widgetSettings.type === 'value' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
                    <input
                      type="text"
                      value={widgetSettings.config.suffix || ''}
                      onChange={(e) => setWidgetSettings(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, suffix: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="%, °C, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Decimal Places</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={widgetSettings.config.decimals || 0}
                      onChange={(e) => setWidgetSettings(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, decimals: parseInt(e.target.value) || 0 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
              {widgetSettings.type === 'led' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <select
                    value={widgetSettings.config.icon || 'lightbulb'}
                    onChange={(e) => setWidgetSettings(prev => ({ 
                      ...prev, 
                      config: { ...prev.config, icon: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="lightbulb">💡 Light Bulb</option>
                    <option value="power">⚡ Power</option>
                    <option value="wifi">📶 WiFi</option>
                    <option value="battery_full">🔋 Battery</option>
                    <option value="notification_important">⚠️ Alert</option>
                    <option value="check_circle">✅ Check</option>
                    <option value="error">❌ Error</option>
                    <option value="home">🏠 Home</option>
                    <option value="lock">🔒 Lock</option>
                    <option value="security">🔐 Security</option>
                    <option value="thermostat">🌡️ Thermostat</option>
                    <option value="visibility">👁️ Visibility</option>
                    <option value="favorite">❤️ Heart</option>
                    <option value="star">⭐ Star</option>
                    <option value="play_arrow">▶️ Play</option>
                    <option value="pause">⏸️ Pause</option>
                    <option value="stop">⏹️ Stop</option>
                    <option value="volume_up">🔊 Volume</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeWidgetSettings}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveWidgetSettings(widgetSettings)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex h-full">
        {/* Sidebar - Projects */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ease-in-out bg-white border-r border-gray-200 h-screen overflow-y-auto flex-shrink-0`}>
          <div className={`${sidebarCollapsed ? 'p-3' : 'p-6'} border-b border-gray-200`}>
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-gray-800">Projects</h2>
                <button className="p-1 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button className="p-1 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className={`${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedProject(project);
                  setEditMode(false);
                }}
                className={`w-full text-left ${sidebarCollapsed ? 'p-2 mb-1' : 'p-3 mb-2'} rounded-lg transition-colors ${
                  selectedProject?.id === project.id
                    ? 'bg-teal-100 text-teal-800 border border-teal-200'
                    : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? project.name : undefined}
              >
                {!sidebarCollapsed ? (
                  <>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm opacity-75">{widgets.length} widgets</div>
                  </>
                ) : (
                  <div className="flex justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* API Status Panel */}
          <div className={`${sidebarCollapsed ? 'p-2' : 'p-4'} border-t border-gray-200`}>
            {!sidebarCollapsed ? (
              <>
                <h3 className="text-sm font-medium text-gray-700 mb-3">API Status</h3>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center justify-between ${isConnected ? 'text-teal-600' : 'text-red-600'}`}>
                    <span>Server</span>
                    <span>{isConnected ? 'Online' : 'Offline'}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-500">
                    <span>Hardware</span>
                    <span>-</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-500">
                    <span>App</span>
                    <span>-</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex justify-center">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-teal-500' : 'bg-red-500'}`} title={isConnected ? 'Server Online' : 'Server Offline'}></div>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Area */}
        <div className="flex-1 overflow-auto">
          {selectedProject ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">{selectedProject.name}</h2>
                  <p className="text-lg text-gray-600">
                    {widgets.length} widgets • {editMode ? 'Edit Mode Active' : 'View Mode'}
                  </p>
                </div>
                
                {editMode && (
                  <button
                    onClick={() => setShowAddWidget(true)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Widget</span>
                  </button>
                )}
              </div>

              {/* Dashboard Grid */}
              <div ref={dashboardRef} className="min-h-screen">
                <ResponsiveGridLayout
                  className="layout"
                  layouts={{ lg: getLayoutFromWidgets() }}
                  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                  cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                  rowHeight={48}
                  onLayoutChange={handleLayoutChange}
                  isDraggable={editMode}
                  isResizable={editMode}
                  margin={[16, 16]}
                  containerPadding={[0, 0]}
                >
                  {widgets.map(widget => 
                    <div key={widget.id}>
                      {renderWidget(widget)}
                    </div>
                  )}
                </ResponsiveGridLayout>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-800 mb-2">No Project Selected</h3>
                <p className="text-gray-600">Select a project from the sidebar to view the dashboard</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Data Stream Indicator */}
      {isConnected && (
        <div className="fixed bottom-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs flex items-center space-x-2 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <span>Live Data</span>
        </div>
      )}

      {/* Quick API Test Panel (Development) */}
      {process.env.NODE_ENV === 'development' && isConnected && (
        <div className="fixed top-20 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700 max-w-xs">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">API Testing</div>
          <div className="space-y-2">
            <button
              onClick={async () => {
                const result = await BlynkAPI.getAllPinValues();
                console.log('All pin values:', result);
              }}
              className="w-full px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
            >
              Get All Pins
            </button>
            
            <button
              onClick={async () => {
                const result = await BlynkAPI.isHardwareConnected();
                console.log('Hardware connected:', result);
              }}
              className="w-full px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
            >
              Check Hardware
            </button>
            
            <button
              onClick={async () => {
                await BlynkAPI.logEvent('Test', 'API test from web UI');
              }}
              className="w-full px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors"
            >
              Log Test Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlynkWebInterface;
