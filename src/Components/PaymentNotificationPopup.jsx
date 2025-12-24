import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../utils/socket';
import './PaymentNotificationPopup.css';

const PaymentNotificationPopup = ({ user, onNotificationClick }) => {
  const [notification, setNotification] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

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

    // Connect to Socket.io
    socketService.connect(token, empId);

    // Join Finance department room
    socketService.joinFinanceDepartment();

    // Listen for payment notifications
    const handlePaymentNotification = (data) => {
      console.log('📧 Payment notification received:', data);
      
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
    };

    socketService.onPaymentNotification(handlePaymentNotification);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      socketService.offPaymentNotification(handlePaymentNotification);
      socketService.leaveFinanceDepartment();
    };
  }, [user]); // Re-run if user prop changes, but also reads from storage as fallback

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

