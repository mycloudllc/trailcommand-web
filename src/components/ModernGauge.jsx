import React, { useEffect, useState } from 'react';

const ModernGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  unit = '', 
  title = 'Gauge',
  color = '#3B82F6',
  size = 200,
  animate = true,
  showValue = true,
  showMinMax = true,
  thickness = 12,
  backgroundColor = '#E5E7EB',
  gradient = true,
  showTicks = true,
  alertThresholds = null // { warning: 75, critical: 90 }
}) => {
  const [animatedValue, setAnimatedValue] = useState(min);
  const [mounted, setMounted] = useState(false);

  // Animation effect
  useEffect(() => {
    setMounted(true);
    if (animate && mounted) {
      const timer = setTimeout(() => {
        setAnimatedValue(value);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedValue(value);
    }
  }, [value, animate, mounted]);

  // Calculate angle and color based on value
  const percentage = Math.min(Math.max((animatedValue - min) / (max - min), 0), 1);
  const angle = percentage * 270 - 135; // 270 degree arc starting from -135°
  
  // Determine color based on alert thresholds
  const getValueColor = () => {
    if (!alertThresholds) return color;
    
    const thresholdPercentage = (animatedValue - min) / (max - min) * 100;
    if (thresholdPercentage >= alertThresholds.critical) return '#EF4444'; // red
    if (thresholdPercentage >= alertThresholds.warning) return '#F59E0B'; // yellow
    return color;
  };

  const currentColor = getValueColor();
  
  // Create gradient definition
  const gradientId = `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`;
  
  // SVG dimensions
  const center = size / 2;
  const radius = (size - thickness) / 2 - 10;
  const strokeWidth = thickness;
  
  // Create tick marks
  const createTicks = () => {
    if (!showTicks) return null;
    
    const ticks = [];
    const tickCount = 8; // 0, 1, 2, 3, 4, 5, 6, 7, 8 (9 total ticks)
    
    // Only show min and max labels
    const positions = [
      { percentage: 0, value: min, label: 'min' },
      { percentage: 1, value: max, label: 'max' }
    ];
    
    positions.forEach(({ percentage, value }, index) => {
      const tickAngle = -225 + percentage * 270; // -225° to -45°
      const tickRadians = (tickAngle * Math.PI) / 180;
      
      const labelX = center + (radius + 30) * Math.cos(tickRadians);
      const labelY = center + (radius + 30) * Math.sin(tickRadians);
      
      ticks.push(
        <text
          key={`label-${index}`}
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-medium fill-gray-600"
        >
          {Math.round(value)}
        </text>
      );
    });
    
    return ticks;
  };

  // Calculate path for the arc
  const createArcPath = (startAngle, endAngle, radius) => {
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <div className="modern-gauge flex flex-col items-center h-full w-full p-2">
      {/* Title */}
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-gray-800 text-center">{title}</h3>
      </div>

      {/* SVG Gauge */}
      <div className="relative flex-1 flex items-center justify-center min-h-0">
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{ aspectRatio: '4/3', maxWidth: `${size}px`, maxHeight: `${size * 0.75}px` }}
        >
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${size} ${size * 0.75}`}
            className="overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
          {/* Gradient definitions */}
          <defs>
            {gradient && (
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={currentColor} stopOpacity="0.8" />
                <stop offset="100%" stopColor={currentColor} stopOpacity="1" />
              </linearGradient>
            )}
            
            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background arc */}
          <path
            d={createArcPath(-135, 135, radius)}
            fill="none"
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Value arc with animation */}
          <path
            d={createArcPath(-135, angle)}
            fill="none"
            stroke={gradient ? `url(#${gradientId})` : currentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter="url(#glow)"
            style={{
              transition: animate ? 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
            }}
          />

          {/* Tick marks and labels */}
          {createTicks()}

          {/* Needle/Pointer */}
          <line
            x1={center}
            y1={center}
            x2={center + (radius * 0.8) * Math.cos((angle - 90) * Math.PI / 180)}
            y2={center + (radius * 0.8) * Math.sin((angle - 90) * Math.PI / 180)}
            stroke="#374151"
            strokeWidth="4"
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />

          {/* Center dot */}
          <circle
            cx={center}
            cy={center}
            r="4"
            fill={currentColor}
            className="drop-shadow-sm"
          />
        </svg>
        </div>
      </div>

      {/* Value Display */}
      {showValue && (
        <div className="mt-8 text-center">
          <div className="text-lg font-bold text-gray-900">
            {animatedValue.toFixed(1)}
            {unit && <span className="text-sm text-gray-600 ml-1">{unit}</span>}
          </div>
          {showMinMax && (
            <div className="text-xs text-gray-500 mt-0.5">
              {min} - {max} {unit}
            </div>
          )}
        </div>
      )}

      {/* Alert indicators */}
      {alertThresholds && (
        <div className="flex space-x-2 mt-2">
          <div className={`w-2 h-2 rounded-full ${
            (animatedValue - min) / (max - min) * 100 >= alertThresholds.warning 
              ? 'bg-yellow-400' 
              : 'bg-gray-300'
          }`} />
          <div className={`w-2 h-2 rounded-full ${
            (animatedValue - min) / (max - min) * 100 >= alertThresholds.critical 
              ? 'bg-red-400' 
              : 'bg-gray-300'
          }`} />
        </div>
      )}
    </div>
  );
};

export default ModernGauge;