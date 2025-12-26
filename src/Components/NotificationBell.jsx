// components/NotificationBell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Bell, X, Check, MessageSquare, DollarSign, AlertCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

const NotificationBell = () => {
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications, 
    getUnreadCount,
    connected 
  } = useSocket();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const unreadCount = getUnreadCount();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getIcon = (type) => {
    switch(type) {
      case 'message': 
        return <MessageSquare size={16} className="text-blue-500" />;
      case 'new_bid': 
        return <DollarSign size={16} className="text-green-500" />;
      case 'bid_accepted': 
        return <Check size={16} className="text-green-600" />;
      case 'bid_rejected': 
        return <AlertCircle size={16} className="text-red-500" />;
      default: 
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getColorClass = (type) => {
    switch(type) {
      case 'message': return 'border-l-4 border-blue-500';
      case 'new_bid': return 'border-l-4 border-green-500';
      case 'bid_accepted': return 'border-l-4 border-green-600';
      case 'bid_rejected': return 'border-l-4 border-red-500';
      default: return 'border-l-4 border-gray-500';
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Handle click based on type
    switch(notification.type) {
      case 'message':
        // Open chat with sender
        window.dispatchEvent(new CustomEvent('open-chat', {
          detail: { senderId: notification.senderId }
        }));
        break;
      case 'new_bid':
        // Navigate to load details
        if (notification.data?.loadId) {
          window.location.href = `/load-board?loadId=${notification.data.loadId}`;
        }
        break;
      case 'bid_accepted':
      case 'bid_rejected':
        // Navigate to bids page
        window.location.href = '/load-board';
        break;
    }
    
    setIsOpen(false);
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Connection Status Badge */}
      {!connected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse z-10"></div>
      )}
      
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Notifications"
      >
        <Bell size={24} className="text-gray-700 dark:text-gray-300" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Notifications</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {unreadCount} unread • {notifications.length} total
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className={`flex items-center gap-1 text-xs ${connected ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                {connected ? 'Connected' : 'Disconnected'}
              </div>
              
              {/* Action Buttons */}
              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Mark all as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={clearNotifications}
                    className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Clear all"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-96">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  You'll see notifications here when you receive messages or bid updates
                </p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    } ${getColorClass(notification.type)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="mt-1 flex-shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className={`font-medium text-sm ${
                            !notification.read 
                              ? 'text-gray-900 dark:text-gray-100 font-semibold' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {formatTime(notification.timestamp)}
                            </span>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.body}
                        </p>
                        
                        {/* Additional Data */}
                        {notification.data && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            {notification.data.senderName && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">From:</span>
                                <span>{notification.data.senderName}</span>
                              </div>
                            )}
                            {notification.data.rate && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Amount:</span>
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  ${Number(notification.data.rate).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {notification.data.loadId && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Load ID:</span>
                                <span className="font-mono text-xs">{notification.data.loadId.substring(0, 8)}...</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Action Buttons for Message Notifications */}
                        {notification.type === 'message' && (
                          <div className="mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Reply
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-center">
              <button
                onClick={() => {
                  // Navigate to all notifications page
                  window.location.href = '/notifications';
                }}
                className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;