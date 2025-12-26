import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { socketService } from '../utils/socket';
import './PaymentNotificationPopup.css';
import API_CONFIG from '../config/api';

const PaymentNotificationPopup = ({ user, onNotificationClick }) => {
  const [notification, setNotification] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const lastNotificationIdRef = useRef(null);
  const socketConnectedRef = useRef(false);

  // Handle showing notification
  const showNotification = useCallback((data) => {
    console.log('📧 Payment notification received:', data);
    
    // Prevent duplicate notifications
    if (data?.id && data.id === lastNotificationIdRef.current) {
      return;
    }
    
    if (data?.id) {
      lastNotificationIdRef.current = data.id;
    }
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setNotification(data);
    setShowPopup(true);

    // Auto-hide after 10 seconds
    timeoutRef.current = setTimeout(() => {
      setShowPopup(false);
      setTimeout(() => {
        setNotification(null);
      }, 300); // Wait for fade-out animation
    }, 10000);
  }, []);

  useEffect(() => {
    // Get user data from prop or storage (for resilience across all pages)
    let userData = user;
    
    if (!userData) {
      // Fallback: Read from storage directly
      const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (userString) {
        try {
          userData = JSON.parse(userString);
        } catch (error) {
          console.error('Error parsing user data:', error);
          return;
        }
      }
    }

    // Only connect if user is from Finance department
    if (!userData || !userData.department) {
      return;
    }

    // Get department - handle both string and object formats
    const department = typeof userData.department === 'string' 
      ? userData.department 
      : userData.department?.name || '';
    
    const departmentLower = department.toLowerCase().trim();
    
    // Check if user is from Finance department
    if (departmentLower !== 'finance' && !departmentLower.includes('finance')) {
      return;
    }

    // Get token
    const token = sessionStorage.getItem('token') || 
                  sessionStorage.getItem('authToken') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('authToken');

    const empId = userData.empId || userData.employeeId;
    
    if (!token || !empId) {
      console.warn('⚠️ Missing token or empId for socket connection');
      return;
    }

    // ========== Setup BroadcastChannel (Cross-tab communication) ==========
    let broadcastChannel;
    if ('BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel('payment_notifications');
        broadcastChannelRef.current = broadcastChannel;
        
        broadcastChannel.addEventListener('message', (event) => {
          const message = event?.data;
          if (message?.type === 'PAYMENT_NOTIFICATION' && message?.notification) {
            console.log('📢 Payment notification received via BroadcastChannel:', message.notification);
            showNotification(message.notification);
          }
        });
        
        console.log('✅ BroadcastChannel initialized for payment notifications');
      } catch (error) {
        console.warn('⚠️ BroadcastChannel not supported:', error);
      }
    }

    // ========== Setup WebSocket Connection ==========
    try {
      socketService.connect(token, empId);
      
      // Wait for socket connection before joining room
      const checkConnection = setInterval(() => {
        if (socketService.isConnected()) {
          clearInterval(checkConnection);
          socketConnectedRef.current = true;
          socketService.joinFinanceDepartment();
          console.log('✅ Socket connected and joined Finance department');
        }
      }, 500);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkConnection);
        if (!socketConnectedRef.current) {
          console.warn('⚠️ Socket connection timeout, using polling fallback');
        }
      }, 5000);

      // Listen for payment notifications via WebSocket
      const handlePaymentNotification = (data) => {
        console.log('📧 Payment notification received via WebSocket:', data);
        socketConnectedRef.current = true;
        showNotification(data);
      };

      socketService.onPaymentNotification(handlePaymentNotification);

      // ========== Setup Polling Fallback ==========
      const pollForNotifications = async () => {
        try {
          const response = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/accountant/payment-notifications?unreadOnly=true&limit=5`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );

          if (response?.data?.success && response?.data?.data?.notifications) {
            const notifications = response.data.data.notifications;
            
            // Show the most recent unread notification
            if (notifications.length > 0) {
              const latestNotification = notifications[0];
              
              // Only show if it's newer than the last one we showed
              if (!lastNotificationIdRef.current || 
                  latestNotification.id !== lastNotificationIdRef.current) {
                showNotification(latestNotification);
              }
            }
          }
        } catch (error) {
          // Silently fail - don't spam console with polling errors
          if (error.response?.status !== 403 && error.response?.status !== 401) {
            console.debug('Polling error (non-critical):', error.message);
          }
        }
      };

      // Start polling every 60 seconds as fallback (reduced frequency to prevent 429 errors)
      pollingIntervalRef.current = setInterval(pollForNotifications, 60000);
      
      // Initial poll after 5 seconds
      setTimeout(pollForNotifications, 5000);

      // Cleanup on unmount
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        if (broadcastChannel) {
          broadcastChannel.close();
          broadcastChannelRef.current = null;
        }
        socketService.offPaymentNotification(handlePaymentNotification);
        socketService.leaveFinanceDepartment();
        clearInterval(checkConnection);
      };
    } catch (error) {
      console.error('Error setting up payment notifications:', error);
    }
  }, [user, showNotification]); // Re-run if user prop changes, but also reads from storage as fallback

  const handleClose = () => {
    // Clear auto-dismiss timeout if exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setShowPopup(false);
    setTimeout(() => {
      setNotification(null);
    }, 300); // Wait for fade-out animation
  };

  const handleViewDetails = () => {
    if (notification) {
      if (onNotificationClick) {
        onNotificationClick(notification);
      } else {
        // Default navigation to DO details page
        navigate(`/DODetails`, { 
          state: { doId: notification.doId } 
        });
      }
    }
    handleClose();
  };

  const getNotificationTitle = (type) => {
    switch (type) {
      case 'do_payment':
        return '✅ DO Payment Marked as Paid';
      case 'carrier_payment':
        return '✅ Carrier Payment Marked as Paid';
      case 'short_payment':
        return '💰 Short Payment Made (Partial Payment)';
      case 'short_payment_completed':
        return '✅ Carrier Payment Completed via Short Payments';
      default:
        return '✅ Payment Notification';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'do_payment':
        return '💰';
      case 'carrier_payment':
        return '🚚';
      case 'short_payment':
        return '💳';
      case 'short_payment_completed':
        return '✅';
      default:
        return '📧';
    }
  };

  // Don't render if not Finance employee or no notification
  if (!showPopup || !notification) {
    return null;
  }

  return (
    <div className="payment-notification-overlay" onClick={handleClose}>
      <div 
        className="payment-notification-popup" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notification-header">
          <div className="notification-icon">
            {getNotificationIcon(notification.type)}
          </div>
          <h3>{getNotificationTitle(notification.type)}</h3>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="notification-content">
          <div className="notification-detail-row">
            <span className="detail-label">Load Number:</span>
            <span className="detail-value">{notification.loadNo}</span>
          </div>

          {notification.type === 'carrier_payment' && notification.carrierName && (
            <div className="notification-detail-row">
              <span className="detail-label">Carrier Name:</span>
              <span className="detail-value">{notification.carrierName}</span>
            </div>
          )}

          {(notification.type === 'short_payment' || notification.type === 'short_payment_completed') && (
            <>
              {notification.carrierName && (
                <div className="notification-detail-row">
                  <span className="detail-label">Carrier Name:</span>
                  <span className="detail-value">{notification.carrierName}</span>
                </div>
              )}
              <div className="notification-detail-row">
                <span className="detail-label">Short Payment Amount:</span>
                <span className="detail-value amount">${notification.paymentAmount}</span>
              </div>
              {notification.totalCarrierFees && (
                <div className="notification-detail-row">
                  <span className="detail-label">Total Carrier Fees:</span>
                  <span className="detail-value">${notification.totalCarrierFees}</span>
                </div>
              )}
              {notification.totalPaid && (
                <div className="notification-detail-row">
                  <span className="detail-label">Total Paid (All Short Payments):</span>
                  <span className="detail-value amount">${notification.totalPaid}</span>
                </div>
              )}
              {notification.remainingAmount && (
                <div className="notification-detail-row">
                  <span className="detail-label">Remaining Amount:</span>
                  <span className="detail-value remaining">${notification.remainingAmount}</span>
                </div>
              )}
              {notification.numberOfShortPayments !== undefined && (
                <div className="notification-detail-row">
                  <span className="detail-label">Number of Short Payments:</span>
                  <span className="detail-value">{notification.numberOfShortPayments}</span>
                </div>
              )}
            </>
          )}

          {notification.type !== 'short_payment' && notification.type !== 'short_payment_completed' && (
            <div className="notification-detail-row">
              <span className="detail-label">Payment Amount:</span>
              <span className="detail-value amount">${notification.paymentAmount}</span>
            </div>
          )}

          <div className="notification-detail-row">
            <span className="detail-label">Payment Method:</span>
            <span className="detail-value">{notification.paymentMethod}</span>
          </div>

          {notification.paymentReference && (
            <div className="notification-detail-row">
              <span className="detail-label">Payment Reference:</span>
              <span className="detail-value">{notification.paymentReference}</span>
            </div>
          )}

          <div className="notification-detail-row">
            <span className="detail-label">Marked By:</span>
            <span className="detail-value">
              {notification.markedBy?.employeeName || 'Unknown'} ({notification.markedBy?.empId || 'N/A'})
            </span>
          </div>

          <div className="notification-detail-row">
            <span className="detail-label">Time:</span>
            <span className="detail-value">
              {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>

        <div className="notification-actions">
          <button className="btn-secondary" onClick={handleClose}>
            Dismiss
          </button>
          <button className="btn-primary" onClick={handleViewDetails}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentNotificationPopup;

