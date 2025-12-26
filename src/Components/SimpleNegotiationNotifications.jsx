import React, { useState, useEffect } from 'react';
import { X, MessageCircle, DollarSign } from 'lucide-react';

const SimpleNegotiationNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Listen for negotiation message events
    const handleNegotiationMessage = (event) => {
      const { bidId, loadId, rate, message, senderName, timestamp, isShipper } = event.detail;
      
      console.log('🎯 Simple negotiation notification received:', event.detail);
      
      // Create notification object
      const notification = {
        id: `${bidId}-${Date.now()}`,
        bidId,
        loadId,
        rate,
        message,
        senderName,
        timestamp,
        isShipper,
        createdAt: new Date()
      };

      // Add to notifications array
      setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep max 5 notifications

      // Auto-remove after 8 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 8000);
    };

    // Add event listener
    window.addEventListener('NEGOTIATION_MESSAGE_RECEIVED', handleNegotiationMessage);

    return () => {
      window.removeEventListener('NEGOTIATION_MESSAGE_RECEIVED', handleNegotiationMessage);
    };
  }, []);

  const removeNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleNotificationClick = (notification) => {
    // Navigate to negotiation page or open modal
    const event = new CustomEvent('OPEN_NEGOTIATION_MODAL', {
      detail: {
        bidId: notification.bidId,
        loadId: notification.loadId
      }
    });
    window.dispatchEvent(event);
    
    // Remove notification after click
    removeNotification(notification.id);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="pointer-events-auto transform transition-all duration-300 ease-in-out"
          style={{
            animation: `slideInRight 0.3s ease-out ${index * 0.1}s both`,
            transform: `translateY(${index * 10}px)`,
          }}
        >
          <div
            className="bg-white rounded-lg shadow-2xl border-l-4 border-green-500 p-4 max-w-sm cursor-pointer hover:shadow-3xl transition-shadow duration-200"
            onClick={() => handleNotificationClick(notification)}
            style={{
              backdropFilter: 'blur(10px)',
              background: 'rgba(255, 255, 255, 0.95)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  New Negotiation
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="text-xs text-gray-500">
                Load #{notification.loadId}
              </div>
              
              <div className="text-sm text-gray-700">
                <strong>From:</strong> {notification.senderName || 'Shipper'}
              </div>

              {notification.rate && (
                <div className="text-sm font-medium text-green-600">
                  <strong>Rate:</strong> ${notification.rate.toLocaleString()}
                </div>
              )}

              {notification.message && (
                <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded text-left">
                  {notification.message.length > 60 
                    ? `${notification.message.substring(0, 60)}...` 
                    : notification.message
                  }
                </div>
              )}

              <div className="text-xs text-gray-400 flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                Just now
              </div>
            </div>

            {/* Action hint */}
            <div className="mt-3 text-xs text-blue-600 font-medium">
              Click to view negotiation →
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
};

export default SimpleNegotiationNotifications;