import React from 'react';

type Status = 'not_started' | 'in_progress' | 'ready';
type Size = 'sm' | 'md' | 'lg';

interface CircularProgressIndicatorProps {
  percentage: number;
  size?: Size;
  status?: Status;
  showLabel?: boolean;
}

export function CircularProgressIndicator({
  percentage,
  size = 'md',
  status = 'in_progress',
  showLabel = false
}: CircularProgressIndicatorProps) {
  // Size configurations
  const sizeConfig = {
    sm: {
      width: 40,
      strokeWidth: 3,
      fontSize: 10
    },
    md: {
      width: 60,
      strokeWidth: 4,
      fontSize: 14
    },
    lg: {
      width: 80,
      strokeWidth: 5,
      fontSize: 18
    }
  };
  
  const config = sizeConfig[size];
  const radius = (config.width / 2) - (config.strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Color based on status
  const getStatusColor = (status: Status) => {
    switch(status) {
      case 'ready':
        return 'text-green-500 stroke-green-500';
      case 'in_progress':
        return 'text-blue-500 stroke-blue-500';
      case 'not_started':
      default:
        return 'text-amber-500 stroke-amber-500';
    }
  };
  
  const statusColor = getStatusColor(status);
  
  return (
    <div className="inline-flex items-center justify-center">
      <svg 
        width={config.width} 
        height={config.width} 
        viewBox={`0 0 ${config.width} ${config.width}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          className="stroke-gray-200"
          strokeWidth={config.strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          className={statusColor}
          strokeWidth={config.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      
      {showLabel && (
        <div 
          className="absolute flex items-center justify-center" 
          style={{ 
            width: config.width, 
            height: config.width 
          }}
        >
          <span 
            className={`font-medium ${statusColor}`} 
            style={{ fontSize: config.fontSize }}
          >
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
} 