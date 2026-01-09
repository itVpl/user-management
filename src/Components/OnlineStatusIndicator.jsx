import React from 'react';

/**
 * OnlineStatusIndicator Component
 * 
 * Displays a visual indicator (green/gray circle) showing whether a user is online or offline.
 * 
 * @param {Object} props
 * @param {string} props.empId - The employee ID to check online status for
 * @param {boolean} props.isOnline - Whether the user is online (optional, if not provided will use context)
 * @param {number} props.size - Size of the indicator in pixels (default: 8)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 */
const OnlineStatusIndicator = ({ 
  empId, 
  isOnline, 
  size = 8, 
  className = '', 
  style = {},
  showLabel = false 
}) => {
  // If isOnline is explicitly provided, use it; otherwise we'd need context
  // For now, we'll use the prop directly
  const onlineStatus = isOnline !== undefined ? isOnline : false;

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      style={style}
      title={onlineStatus ? 'Online' : 'Offline'}
    >
      <span
        style={{
          display: 'inline-block',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: onlineStatus ? '#10b981' : '#9ca3af', // green-500 for online, gray-400 for offline
          border: '2px solid white',
          marginLeft: '4px',
          verticalAlign: 'middle',
          flexShrink: 0,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
        }}
        aria-label={onlineStatus ? 'Online' : 'Offline'}
      />
      {showLabel && (
        <span 
          className="text-xs text-gray-500"
          style={{ marginLeft: '4px' }}
        >
          {onlineStatus ? 'Online' : 'Offline'}
        </span>
      )}
    </span>
  );
};

export default OnlineStatusIndicator;




