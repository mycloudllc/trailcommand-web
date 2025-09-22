import React, { useMemo } from 'react';
import OptimizedGaugeWidget from './OptimizedGaugeWidget';
import {
  Power,
  Thermometer,
  Lightbulb,
  Gauge,
  Activity,
  BarChart3,
  Zap,
  Droplets,
  Wind,
  Sun,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

// Memoized switch widget component
const SwitchWidget = React.memo(({ widget, onValueChange }) => {
  const isOn = widget.value === 1 || widget.value === true || widget.value === 'on';

  const handleToggle = () => {
    const newValue = isOn ? 0 : 1;
    onValueChange?.(widget.id, newValue);
  };

  return (
    <div className="switch-widget h-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          {widget.config?.title || widget.type || 'Switch'}
        </h3>
      </div>

      <button
        onClick={handleToggle}
        className={`relative inline-flex h-8 w-14 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isOn ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span className="sr-only">Toggle switch</span>
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
            isOn ? 'translate-x-3' : '-translate-x-3'
          }`}
        />
      </button>

      <div className="text-center mt-4">
        <span className={`text-sm font-medium ${isOn ? 'text-blue-600' : 'text-gray-500'}`}>
          {isOn ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.widget.id === nextProps.widget.id &&
    prevProps.widget.value === nextProps.widget.value &&
    JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config)
  );
});

// Memoized slider widget component
const SliderWidget = React.memo(({ widget, onValueChange }) => {
  const value = parseFloat(widget.value) || 0;
  const min = widget.config?.min || 0;
  const max = widget.config?.max || 100;
  const step = widget.config?.step || 1;

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    onValueChange?.(widget.id, newValue);
  };

  return (
    <div className="slider-widget h-full flex flex-col justify-center p-4">
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          {widget.config?.title || widget.type || 'Control'}
        </h3>
        <div className="text-2xl font-bold text-gray-900">
          {value.toFixed(1)}
          {widget.config?.unit && <span className="text-sm text-gray-600 ml-1">{widget.config.unit}</span>}
        </div>
      </div>

      <div className="px-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.widget.id === nextProps.widget.id &&
    prevProps.widget.value === nextProps.widget.value &&
    JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config)
  );
});

// Main widget renderer with optimized type checking
const WidgetRenderer = React.memo(({ widget, editMode, onValueChange }) => {
  // Memoize widget type determination
  const widgetType = useMemo(() => {
    return widget.type?.toLowerCase() || 'gauge';
  }, [widget.type]);

  // Memoize icon selection
  const WidgetIcon = useMemo(() => {
    const iconMap = {
      temperature: Thermometer,
      humidity: Droplets,
      pressure: Gauge,
      light: Sun,
      battery: Zap,
      motion: Activity,
      switch: widget.value ? ToggleRight : ToggleLeft,
      relay: Power,
      led: Lightbulb,
      fan: Wind,
      default: BarChart3
    };

    return iconMap[widgetType] || iconMap.default;
  }, [widgetType, widget.value]);

  // Render different widget types
  switch (widgetType) {
    case 'gauge':
    case 'sensor':
    case 'temperature':
    case 'humidity':
    case 'pressure':
    case 'battery':
    case 'light':
      return (
        <OptimizedGaugeWidget
          widget={widget}
          editMode={editMode}
        />
      );

    case 'switch':
    case 'relay':
    case 'led':
    case 'digital':
      return (
        <SwitchWidget
          widget={widget}
          onValueChange={onValueChange}
        />
      );

    case 'slider':
    case 'pwm':
    case 'analog':
    case 'fan':
    case 'servo':
      return (
        <SliderWidget
          widget={widget}
          onValueChange={onValueChange}
        />
      );

    default:
      return (
        <div className="default-widget h-full flex flex-col items-center justify-center p-4 text-center">
          <WidgetIcon className="w-8 h-8 text-gray-400 mb-2" />
          <h3 className="text-sm font-semibold text-gray-800 mb-1">
            {widget.config?.title || widget.type || 'Widget'}
          </h3>
          <div className="text-lg font-bold text-gray-900">
            {widget.value || 0}
            {widget.config?.unit && <span className="text-sm text-gray-600 ml-1">{widget.config.unit}</span>}
          </div>
        </div>
      );
  }
}, (prevProps, nextProps) => {
  // Optimized comparison
  return (
    prevProps.widget.id === nextProps.widget.id &&
    prevProps.widget.type === nextProps.widget.type &&
    prevProps.widget.value === nextProps.widget.value &&
    JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config) &&
    prevProps.editMode === nextProps.editMode
  );
});

SwitchWidget.displayName = 'SwitchWidget';
SliderWidget.displayName = 'SliderWidget';
WidgetRenderer.displayName = 'WidgetRenderer';

export default WidgetRenderer;