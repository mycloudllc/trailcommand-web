import React, { useEffect, useState } from 'react';

// Classic circular dial gauge
export const ClassicGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  unit = '', 
  title = 'Gauge',
  color = '#3B82F6',
  size = 200
}) => {
  const [animatedValue, setAnimatedValue] = useState(min);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = Math.min(Math.max((animatedValue - min) / (max - min), 0), 1);
  const angle = percentage * 300 - 150; // 300 degree arc
  
  const center = size / 2;
  const radius = size * 0.35;

  return (
    <div className="classic-gauge flex flex-col items-center justify-center h-full w-full p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">{title}</h3>
      
      <div 
        className="relative w-full h-full flex items-center justify-center"
        style={{ aspectRatio: '1/1', maxWidth: `${size}px`, maxHeight: `${size}px` }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
          {/* Outer ring */}
          <circle
            cx={center}
            cy={center}
            r={radius + 15}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="2"
          />
          
          {/* Background arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#F3F4F6"
            strokeWidth="8"
            strokeDasharray="471"
            strokeDashoffset="78"
            transform={`rotate(-150 ${center} ${center})`}
          />
          
          {/* Value arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="471"
            strokeDashoffset={471 - (471 * 0.83 * percentage) + 78}
            transform={`rotate(-150 ${center} ${center})`}
            style={{
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
          
          {/* Center circle */}
          <circle cx={center} cy={center} r="8" fill={color} />
          
          {/* Needle */}
          <line
            x1={center}
            y1={center}
            x2={center + (radius - 20) * Math.cos((angle - 90) * Math.PI / 180)}
            y2={center + (radius - 20) * Math.sin((angle - 90) * Math.PI / 180)}
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
            style={{
              transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
          
          {/* Tick marks */}
          {Array.from({ length: 11 }, (_, i) => {
            const tickAngle = (i / 10) * 300 - 150;
            const tickRadians = (tickAngle * Math.PI) / 180;
            const isMain = i % 5 === 0;
            const tickLength = isMain ? 15 : 8;
            
            return (
              <line
                key={i}
                x1={center + (radius + 5) * Math.cos(tickRadians)}
                y1={center + (radius + 5) * Math.sin(tickRadians)}
                x2={center + (radius + 5 + tickLength) * Math.cos(tickRadians)}
                y2={center + (radius + 5 + tickLength) * Math.sin(tickRadians)}
                stroke="#6B7280"
                strokeWidth={isMain ? "2" : "1"}
              />
            );
          })}
        </svg>
      </div>
      
      <div className="text-center mt-2">
        <div className="text-2xl font-bold text-gray-900">
          {animatedValue.toFixed(1)}
          {unit && <span className="text-lg text-gray-600 ml-1">{unit}</span>}
        </div>
      </div>
    </div>
  );
};

// Minimal linear progress gauge
export const MinimalGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  unit = '', 
  title = 'Gauge',
  color = '#3B82F6'
}) => {
  const [animatedValue, setAnimatedValue] = useState(min);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = Math.min(Math.max((animatedValue - min) / (max - min), 0), 1);

  return (
    <div className="minimal-gauge flex flex-col justify-center h-full w-full p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-baseline">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {animatedValue.toFixed(1)}
              {unit && <span className="text-xl text-gray-600 ml-1">{unit}</span>}
            </div>
            <div className="text-sm text-gray-500">{min} - {max}</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${percentage * 100}%`,
                background: `linear-gradient(90deg, ${color}88, ${color})`
              }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>{min}</span>
            <span>{((min + max) / 2).toFixed(0)}</span>
            <span>{max}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Neon glow effect gauge
export const NeonGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  unit = '', 
  title = 'Gauge',
  color = '#3B82F6',
  size = 200
}) => {
  const [animatedValue, setAnimatedValue] = useState(min);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = Math.min(Math.max((animatedValue - min) / (max - min), 0), 1);
  const angle = percentage * 270 - 135;
  
  const center = size / 2;
  const radius = (size - 40) / 2;

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
    <div className="neon-gauge flex flex-col items-center justify-center h-full w-full p-4 bg-gray-900 rounded-xl">
      <h3 className="text-sm font-semibold text-gray-200 mb-2">{title}</h3>
      
      <div 
        className="relative w-full h-full flex items-center justify-center"
        style={{ aspectRatio: '4/3', maxWidth: `${size}px`, maxHeight: `${size * 0.75}px` }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size * 0.75}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Neon glow filters */}
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
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
            stroke="#374151"
            strokeWidth="3"
          />

          {/* Neon value arc */}
          <path
            d={createArcPath(-135, angle)}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            filter="url(#strongGlow)"
            style={{
              transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: 'drop-shadow(0 0 10px currentColor)'
            }}
          />
          
          {/* Inner glow arc */}
          <path
            d={createArcPath(-135, angle)}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#neonGlow)"
            style={{
              transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />

          {/* Center glow dot */}
          <circle
            cx={center}
            cy={center}
            r="6"
            fill={color}
            filter="url(#neonGlow)"
          />
        </svg>
      </div>
      
      <div className="text-center mt-2">
        <div className="text-2xl font-bold text-white">
          {animatedValue.toFixed(1)}
          {unit && <span className="text-lg text-gray-300 ml-1">{unit}</span>}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {min} - {max} {unit}
        </div>
      </div>
    </div>
  );
};