import React, { useMemo } from 'react';
import ModernGauge from './ModernGauge';
import { ClassicGauge, MinimalGauge, NeonGauge } from './GaugeVariants';
import TankGauge from './TankGauge';

const OptimizedGaugeWidget = React.memo(({ widget, editMode }) => {
  // Memoize gauge size calculation
  const gaugeSize = useMemo(() => {
    const widgetWidth = widget.position?.w || 2;
    const widgetHeight = widget.position?.h || 2;
    const smallerDimension = Math.min(widgetWidth, widgetHeight);
    const availableSpace = (smallerDimension * 60) - 32;
    return Math.min(300, Math.max(80, availableSpace * 0.85));
  }, [widget.position?.w, widget.position?.h]);

  // Memoize gauge configuration
  const gaugeConfig = useMemo(() => {
    const config = widget.config || {};
    return {
      value: parseFloat(widget.value) || 0,
      min: config.min || 0,
      max: config.max || 100,
      unit: config.unit || '',
      title: config.title || widget.type || 'Sensor',
      color: config.color || '#3B82F6',
      size: gaugeSize,
      animate: !editMode, // Disable animation in edit mode for better performance
      showValue: config.showValue !== false,
      showMinMax: config.showMinMax !== false,
      thickness: config.thickness || 12,
      backgroundColor: config.backgroundColor || '#E5E7EB',
      gradient: config.gradient !== false,
      showTicks: config.showTicks !== false,
      alertThresholds: config.alertThresholds || null
    };
  }, [
    widget.value,
    widget.config,
    widget.type,
    gaugeSize,
    editMode
  ]);

  // Memoize gauge type selection
  const GaugeComponent = useMemo(() => {
    const gaugeType = widget.config?.gaugeType || 'modern';

    switch (gaugeType) {
      case 'classic':
        return ClassicGauge;
      case 'minimal':
        return MinimalGauge;
      case 'neon':
        return NeonGauge;
      case 'tank':
        return TankGauge;
      case 'modern':
      default:
        return ModernGauge;
    }
  }, [widget.config?.gaugeType]);

  return (
    <div className="gauge-widget h-full w-full flex items-center justify-center p-2">
      <GaugeComponent {...gaugeConfig} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.widget.id === nextProps.widget.id &&
    prevProps.widget.value === nextProps.widget.value &&
    prevProps.widget.type === nextProps.widget.type &&
    JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config) &&
    JSON.stringify(prevProps.widget.position) === JSON.stringify(nextProps.widget.position) &&
    prevProps.editMode === nextProps.editMode
  );
});

OptimizedGaugeWidget.displayName = 'OptimizedGaugeWidget';

export default OptimizedGaugeWidget;