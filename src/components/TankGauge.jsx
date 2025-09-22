import React, { useEffect, useState } from 'react';

const TankGauge = ({
  value = 0,
  min = 0,
  max = 100,
  unit = '%',
  title = 'Tank Level',
  color = '#3B82F6',
  animate = true,
  showValue = true,
  alertThresholds = null, // { warning: 25, critical: 10 }
  theme = 'light'
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

  // Calculate fill percentage
  const percentage = Math.min(Math.max((animatedValue - min) / (max - min), 0), 1);
  
  // Determine color based on alert thresholds
  const getValueColor = () => {
    if (!alertThresholds) return color;
    
    const thresholdPercentage = (animatedValue - min) / (max - min) * 100;
    if (thresholdPercentage <= alertThresholds.critical) return '#EF4444'; // red
    if (thresholdPercentage <= alertThresholds.warning) return '#F59E0B'; // yellow
    return color;
  };

  const currentColor = getValueColor();

  // Theme-aware colors
  const themeColors = {
    light: {
      outerStroke: '#E5E7EB',
      backgroundFill: '#F3F4F6',
      title: 'text-gray-800',
      value: 'text-gray-900',
      markerStroke: '#9CA3AF',
      markerText: 'fill-gray-500'
    },
    dark: {
      outerStroke: '#4B5563',
      backgroundFill: '#374151',
      title: 'text-gray-200',
      value: 'text-gray-100',
      markerStroke: '#6B7280',
      markerText: 'fill-gray-400'
    }
  };

  const colors = themeColors[theme] || themeColors.light;

  // Liquid gauge dimensions
  const size = 240;
  const center = size / 2;
  const radius = size * 0.35;
  const fillCircleMargin = 8;
  const fillCircleRadius = radius - fillCircleMargin;
  
  // Create unique IDs
  const gradientId = `liquid-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const clipId = `liquid-clip-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="tank-gauge flex flex-col items-center h-full w-full p-2">
      {/* Title */}
      <div className="mb-2">
        <h3 className={`text-sm font-semibold ${colors.title} text-center`}>{title}</h3>
      </div>

      {/* Liquid Gauge SVG */}
      <div className="relative flex-1 flex items-center justify-center min-h-0">
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{ aspectRatio: '1/1', maxWidth: `${size}px`, maxHeight: `${size}px` }}
        >
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Liquid gradient */}
              <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor={currentColor} stopOpacity="0.8" />
                <stop offset="50%" stopColor={currentColor} stopOpacity="0.9" />
                <stop offset="100%" stopColor={currentColor} stopOpacity="0.7" />
              </linearGradient>
              
              {/* Clip path for circle */}
              <clipPath id={clipId}>
                <circle cx={center} cy={center} r={fillCircleRadius} />
              </clipPath>
            </defs>

            {/* Outer circle border */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={colors.outerStroke}
              strokeWidth="3"
            />

            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={fillCircleRadius}
              fill={colors.backgroundFill}
            />

            {/* Liquid fill with simple wave */}
            <g clipPath={`url(#${clipId})`}>
              {/* Base liquid */}
              <rect
                x={center - fillCircleRadius}
                y={center + fillCircleRadius - (fillCircleRadius * 2 * percentage)}
                width={fillCircleRadius * 2}
                height={fillCircleRadius * 2 * percentage}
                fill={`url(#${gradientId})`}
                className={animate ? "transition-all duration-1000 ease-out" : ""}
              />
              
              {/* Simple wave on surface */}
              {percentage > 0.05 && (
                <ellipse
                  cx={center}
                  cy={center + fillCircleRadius - (fillCircleRadius * 2 * percentage)}
                  rx={fillCircleRadius * 0.9}
                  ry="4"
                  fill={currentColor}
                  opacity="0.4"
                >
                  <animate
                    attributeName="ry"
                    values="3;6;3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.3;0.6;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              )}
              
              {/* Surface shimmer */}
              {percentage > 0.05 && (
                <ellipse
                  cx={center}
                  cy={center + fillCircleRadius - (fillCircleRadius * 2 * percentage)}
                  rx={fillCircleRadius * 0.6}
                  ry="2"
                  fill="white"
                  opacity="0.3"
                >
                  <animate
                    attributeName="rx"
                    values={`${fillCircleRadius * 0.4};${fillCircleRadius * 0.8};${fillCircleRadius * 0.4}`}
                    dur="3s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.2;0.4;0.2"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              )}
            </g>
            
            {/* Level markers */}
            {[0.25, 0.5, 0.75].map((level, index) => {
              const angle = Math.PI * (0.75 + level * 0.5); // 135° to 45°
              const markerRadius = radius + 10;
              const x = center + markerRadius * Math.cos(angle);
              const y = center + markerRadius * Math.sin(angle);
              
              return (
                <g key={`marker-${index}`}>
                  <line
                    x1={center + radius * Math.cos(angle)}
                    y1={center + radius * Math.sin(angle)}
                    x2={x}
                    y2={y}
                    stroke={colors.markerStroke}
                    strokeWidth="2"
                  />
                  <text
                    x={x + 15 * Math.cos(angle)}
                    y={y + 15 * Math.sin(angle)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-xs ${colors.markerText}`}
                  >
                    {Math.round(min + level * (max - min))}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Value Display */}
      {showValue && (
        <div className="mt-2 text-center">
          <div className={`text-lg font-bold ${colors.value}`} style={{ color: currentColor }}>
            {animatedValue.toFixed(1)}
            {unit && <span className={`text-sm ml-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{unit}</span>}
          </div>
        </div>
      )}

      {/* Alert indicators */}
      {alertThresholds && (
        <div className="flex space-x-2 mt-2">
          <div className={`w-2 h-2 rounded-full ${
            percentage * 100 <= alertThresholds.critical 
              ? 'bg-red-400' 
              : 'bg-gray-300'
          }`} />
          <div className={`w-2 h-2 rounded-full ${
            percentage * 100 <= alertThresholds.warning 
              ? 'bg-yellow-400' 
              : 'bg-gray-300'
          }`} />
        </div>
      )}
    </div>
  );
};

export default TankGauge;