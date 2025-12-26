import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import API_CONFIG from '../config/api.js';
import NotificationToast from './NotificationToast';

const NotificationHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [userEmpId, setUserEmpId] = useState(null);
  const notificationIdsRef = useRef(new Set()); // Track shown notifications to prevent duplicates

  // Get user data from storage
  const getUser = useCallback(() => {
    const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userString) return null;
    
    try {
      return JSON.parse(userString);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    // Check current permission status
    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Notification permission denied');
      setNotificationPermission('denied');
      return false;
    }

    // Request permission
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const user = getUser();
    if (!user?.empId) {
      console.log('❌ No user empId found for notification socket connection');
      return;
    }

    setUserEmpId(user.empId);

    console.log('🚀 Initializing notification socket connection for user:', user.empId);

    // Get socket URL from API config
    const socketUrl = API_CONFIG.BASE_URL || 'https://vpl-liveproject-1.onrender.com';

    // Connect to socket
    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('✅ Notification socket connected:', socketInstance.id);
      
      // Join with empId after connection
      socketInstance.emit('join', user.empId);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Notification socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Notification socket connection error:', error);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`✅ Notification socket reconnected after ${attemptNumber} attempts`);
      // Re-join with empId after reconnection
      if (user.empId) {
        socketInstance.emit('join', user.empId);
      }
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up notification socket connection');
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance.removeAllListeners();
      }
    };
  }, [getUser]);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Check if user is viewing the chat for this notification
  const shouldShowNotification = useCallback((notificationData) => {
    const currentPath = location.pathname;
    
    // If not on Chat page, always show notification
    if (!currentPath.includes('/Chat')) {
      return true;
    }
    
    // If on Chat page, check if viewing the specific chat
    // Note: This is a basic check. For more accurate detection, you may need to
    // check the Chat component's internal state via a context or event system
    if (notificationData.type === 'individual') {
      // For individual chats, we can't easily detect which user is selected
      // without accessing Chat component state, so we'll show notifications
      // but the Chat component itself can suppress them if needed
      return true;
    }
    
    if (notificationData.type === 'group') {
      // Similar for group chats
      return true;
    }
    
    if (notificationData.type === 'load') {
      // For load chats, check if viewing this specific load
      return !currentPath.includes(`/load/${notificationData.loadId}`);
    }
    
    return true;
  }, [location.pathname]);

  // Handle notification click navigation
  const handleNotificationClick = useCallback((notificationData) => {
    window.focus();
    
    switch (notificationData.type) {
      case 'individual':
        // Navigate to individual chat page
        // The Chat component will need to handle selecting the user
        navigate('/Chat');
        // Dispatch a custom event that Chat component can listen to
        window.dispatchEvent(new CustomEvent('openChatWithUser', {
          detail: { empId: notificationData.from }
        }));
        break;
        
      case 'group':
        // Navigate to group chat page
        navigate('/Chat');
        // Dispatch a custom event that Chat component can listen to
        window.dispatchEvent(new CustomEvent('openGroupChat', {
          detail: { groupId: notificationData.groupId }
        }));
        break;
        
      case 'load':
        // Navigate to load chat - adjust route based on your app structure
        navigate('/Chat');
        // Dispatch a custom event that Chat component can listen to
        window.dispatchEvent(new CustomEvent('openLoadChat', {
          detail: { loadId: notificationData.loadId }
        }));
        break;
    }
  }, [navigate]);

  // Get notification body text
  const getNotificationBody = useCallback((notificationData) => {
    if (notificationData.body) {
      return notificationData.body;
    }
    
    if (notificationData.hasImage) {
      return `${notificationData.senderName || notificationData.senderAliasName || 'Someone'} sent an image`;
    }
    
    if (notificationData.hasFile) {
      return `${notificationData.senderName || notificationData.senderAliasName || 'Someone'} sent a file`;
    }
    
    if (notificationData.hasAudio) {
      return `${notificationData.senderName || notificationData.senderAliasName || 'Someone'} sent an audio message`;
    }
    
    return 'New message';
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notificationData) => {
    if (!('Notification' in window) || notificationPermission !== 'granted') {
      return;
    }

    // Don't show notification if user is viewing that chat
    if (!shouldShowNotification(notificationData)) {
      return;
    }

    // Prevent duplicate notifications
    if (notificationIdsRef.current.has(notificationData.messageId)) {
      return;
    }
    notificationIdsRef.current.add(notificationData.messageId);

    // Clean up old notification IDs after 1 minute
    setTimeout(() => {
      notificationIdsRef.current.delete(notificationData.messageId);
    }, 60000);

    const bodyText = getNotificationBody(notificationData);
    const title = notificationData.title || 
                  notificationData.senderName || 
                  notificationData.senderAliasName || 
                  'New Message';

    try {
      const notification = new Notification(title, {
        body: bodyText,
        icon: '/LogoFinal.png', // Your app icon
        badge: '/LogoFinal.png', // Badge icon
        tag: notificationData.messageId, // Prevent duplicates
        data: notificationData, // Store notification data
        requireInteraction: false, // Auto-close after a few seconds
        silent: false // Play sound
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        handleNotificationClick(notificationData);
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }, [notificationPermission, shouldShowNotification, getNotificationBody, handleNotificationClick]);

  // Show in-app notification
  const showInAppNotification = useCallback((notificationData) => {
    // Don't show notification if user is viewing that chat
    if (!shouldShowNotification(notificationData)) {
      return;
    }

    // Prevent duplicate notifications
    if (notificationIdsRef.current.has(notificationData.messageId)) {
      return;
    }

    setNotifications(prev => [...prev, notificationData]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => 
        prev.filter(n => n.messageId !== notificationData.messageId)
      );
    }, 5000);
  }, [shouldShowNotification]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => {
        // User may have blocked autoplay
        console.log('Could not play notification sound:', err);
      });
    } catch (error) {
      console.log('Error playing notification sound:', error);
    }
  }, []);

  // Update unread count (placeholder - implement based on your unread count system)
  const updateUnreadCount = useCallback((notificationData) => {
    // TODO: Implement unread count update based on your state management
    // This could update a context, Redux store, or local state
    console.log('Update unread count for:', notificationData);
  }, []);

  // Listen for notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notificationData) => {
      console.log('🔔 Notification received:', notificationData);

      // Validate notification data structure
      if (!notificationData || !notificationData.messageId) {
        console.warn('Invalid notification data received:', notificationData);
        return;
      }

      // Show browser notification
      showBrowserNotification(notificationData);

      // Show in-app notification
      showInAppNotification(notificationData);

      // Play sound (only if not viewing that chat)
      if (shouldShowNotification(notificationData)) {
        playNotificationSound();
      }

      // Update unread count
      updateUnreadCount(notificationData);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, showBrowserNotification, showInAppNotification, playNotificationSound, shouldShowNotification, updateUnreadCount]);

  // Remove notification
  const removeNotification = useCallback((messageId) => {
    setNotifications(prev => 
      prev.filter(n => n.messageId !== messageId)
    );
  }, []);

  return (
    <>
      {/* In-app notification toasts */}
      <div 
        style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          zIndex: 9999,
          pointerEvents: 'none'
        }}
      >
        {notifications.map((notification, index) => (
          <div
            key={notification.messageId}
            style={{
              pointerEvents: 'auto',
              marginBottom: '10px'
            }}
          >
            <NotificationToast
              notification={notification}
              onClose={() => removeNotification(notification.messageId)}
              onClick={() => {
                handleNotificationClick(notification);
                removeNotification(notification.messageId);
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificationHandler;

