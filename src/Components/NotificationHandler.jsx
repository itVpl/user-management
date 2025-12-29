import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationToast from './NotificationToast';
import sharedSocketService from '../services/sharedSocketService';

const NotificationHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [userEmpId, setUserEmpId] = useState(null);
  const notificationIdsRef = useRef(new Set()); // Track shown notifications to prevent duplicates
  const userEmpIdRef = useRef(null); // Store user empId in ref for use in callbacks

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

  // Initialize socket connection using shared socket service
  useEffect(() => {
    // Get user data directly (not from callback to avoid re-renders)
    const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userString) {
      console.log('❌ No user data found for notification socket connection');
      return;
    }

    let user;
    try {
      user = JSON.parse(userString);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return;
    }

    if (!user?.empId) {
      console.log('❌ No user empId found for notification socket connection');
      return;
    }

    setUserEmpId(user.empId);
    userEmpIdRef.current = user.empId; // Store in ref for use in callbacks

    console.log('🚀 NotificationHandler: Setting up SHARED socket service for user:', user.empId);
    console.log('🌍 This socket is shared with ALL components (Chat, etc.)');
    console.log('📍 This reduces server load by using ONE socket per user!');

    // Try to get existing socket first
    let socketInstance = sharedSocketService.getSocket();
    
    if (socketInstance && socketInstance.connected) {
      // Socket already exists and is connected
      console.log('✅ NotificationHandler: Using existing shared socket:', socketInstance.id);
      setSocket(socketInstance);
    } else {
      // Socket not ready yet - wait for it or initialize
      console.log('⏳ NotificationHandler: Socket not ready yet, waiting...');
      
      // Initialize shared socket service (App.jsx should do this, but ensure it's done)
      socketInstance = sharedSocketService.initialize(user.empId);
      
      if (socketInstance) {
        if (socketInstance.connected) {
          // Socket connected immediately
          console.log('✅ NotificationHandler: Shared socket connected:', socketInstance.id);
          setSocket(socketInstance);
        } else {
          // Socket connecting - wait for connection via callback (no polling to prevent freeze)
          console.log('⏳ NotificationHandler: Waiting for socket connection...');
          sharedSocketService.onConnect((connectedSocket) => {
            console.log('✅ NotificationHandler: Socket connected:', connectedSocket.id);
            setSocket(connectedSocket);
          });
        }
      }
      
      // Also listen for connection event
      sharedSocketService.onConnect((connectedSocket) => {
        console.log('✅ NotificationHandler: Socket connected via callback:', connectedSocket.id);
        setSocket(connectedSocket);
      });
    }

    // No cleanup needed - shared socket service manages the connection
    // This component just uses the shared socket
  }, []); // Empty dependency array - only run once on mount

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Track currently selected chat user/group from Chat component
  const [selectedChatEmpId, setSelectedChatEmpId] = useState(null);
  const [selectedChatGroupId, setSelectedChatGroupId] = useState(null);

  // Listen for chat selection changes from Chat component
  useEffect(() => {
    const handleChatSelectionChange = (event) => {
      const { selectedEmpId, selectedGroupId } = event.detail || {};
      if (selectedEmpId !== undefined) {
        setSelectedChatEmpId(selectedEmpId);
      }
      if (selectedGroupId !== undefined) {
        setSelectedChatGroupId(selectedGroupId);
      }
    };

    // Listen for custom event from Chat component
    window.addEventListener('chatSelectionChanged', handleChatSelectionChange);
    
    return () => {
      window.removeEventListener('chatSelectionChanged', handleChatSelectionChange);
    };
  }, []);

  // Check if user is viewing the chat for this notification
  const shouldShowNotification = useCallback((notificationData) => {
    const currentPath = location.pathname;
    
    // If not on Chat page, always show notification
    if (!currentPath.includes('/Chat')) {
      return true;
    }
    
    // If on Chat page, check if viewing the specific chat
    if (notificationData.type === 'individual') {
      // Get sender/receiver empId from notification data
      const senderEmpId = notificationData.from || notificationData.senderEmpId || notificationData.sender?.empId;
      const receiverEmpId = notificationData.to || notificationData.receiverEmpId || notificationData.receiver?.empId;
      
      // Get current user empId
      const userEmpId = userEmpIdRef.current || 
                       JSON.parse(sessionStorage.getItem('user'))?.empId ||
                       JSON.parse(localStorage.getItem('user'))?.empId;
      
      // Determine which user the notification is about
      // If receiverEmpId matches current user, then senderEmpId is who sent it
      // If senderEmpId matches current user, then receiverEmpId is who it's for
      const chatPartnerEmpId = receiverEmpId === userEmpId ? senderEmpId : receiverEmpId;
      
      // Show notification if:
      // 1. No chat is currently selected, OR
      // 2. The selected chat is NOT the same as the notification's chat partner
      if (!selectedChatEmpId || selectedChatEmpId !== chatPartnerEmpId) {
        return true;
      }
      
      // User is viewing this specific chat, don't show notification
      return false;
    }
    
    if (notificationData.type === 'group') {
      const groupId = notificationData.groupId || notificationData.group?._id;
      // Show notification if no group selected or different group selected
      if (!selectedChatGroupId || selectedChatGroupId !== groupId) {
        return true;
      }
      return false;
    }
    
    if (notificationData.type === 'load') {
      // For load chats, check if viewing this specific load
      return !currentPath.includes(`/load/${notificationData.loadId}`);
    }
    
    // For notifications without type, check if we have sender/receiver info
    const senderEmpId = notificationData.from || notificationData.senderEmpId || notificationData.sender?.empId;
    const receiverEmpId = notificationData.to || notificationData.receiverEmpId || notificationData.receiver?.empId;
    
    if (senderEmpId || receiverEmpId) {
      const userEmpId = userEmpIdRef.current || 
                       JSON.parse(sessionStorage.getItem('user'))?.empId ||
                       JSON.parse(localStorage.getItem('user'))?.empId;
      const chatPartnerEmpId = receiverEmpId === userEmpId ? senderEmpId : receiverEmpId;
      
      // Show notification if no chat selected or different chat selected
      if (!selectedChatEmpId || selectedChatEmpId !== chatPartnerEmpId) {
        return true;
      }
      return false;
    }
    
    // Default: show notification if we can't determine
    return true;
  }, [location.pathname, selectedChatEmpId, selectedChatGroupId]);

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

    // Prevent duplicate browser notifications (browser API handles this with tag, but we check too)
    if (notificationIdsRef.current.has(notificationData.messageId)) {
      return;
    }
    notificationIdsRef.current.add(notificationData.messageId);

    // Clean up old notification IDs after 1 minute
    setTimeout(() => {
      notificationIdsRef.current.delete(notificationData.messageId);
    }, 60000);

    const bodyText = getNotificationBody(notificationData);
    
    // Format title based on notification type
    let title;
    if (notificationData.type === 'group') {
      // For group notifications: "GroupName: SenderName"
      const groupName = notificationData.groupName || notificationData.title || 'Group';
      const senderName = notificationData.senderName || notificationData.senderAliasName || 'Someone';
      title = `${groupName}: ${senderName}`;
    } else {
      // For individual notifications: use sender name or title
      title = notificationData.title || 
              notificationData.senderName || 
              notificationData.senderAliasName || 
              'New Message';
    }

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

  // Update unread count using UnreadCountContext
  const updateUnreadCount = useCallback((notificationData) => {
    // Dispatch custom event that UnreadCountProvider can listen to
    // This allows NotificationHandler to update unread counts without direct dependency
    window.dispatchEvent(new CustomEvent('incrementUnreadCount', {
      detail: {
        type: notificationData.type,
        empId: notificationData.type === 'individual' ? notificationData.from : null,
        groupId: notificationData.type === 'group' ? notificationData.groupId : null,
        count: 1
      }
    }));
  }, []);

  // Listen for notifications - use ref to store handler to prevent recreation
  const handlerRef = useRef(null);
  const listenerSetupRef = useRef(false);

  useEffect(() => {
    // Create handler function - always use latest callbacks
    // Update handler ref whenever callbacks change
    handlerRef.current = (notificationData) => {
      // Log current page for debugging
      const currentPage = location.pathname;
      console.log('🔔🔔🔔 NOTIFICATION RECEIVED! 🔔🔔🔔');
      console.log('📍 Current page:', currentPage);
      console.log('📦 Notification data:', notificationData);
      console.log('✅ This proves notifications work globally on ANY page!');
      
      // Debug: Log socket state
      const currentSocket = sharedSocketService.getSocket();
      console.log('📍 Socket ID:', currentSocket?.id);
      console.log('📍 Socket connected:', currentSocket?.connected);

      // Validate notification data structure
      if (!notificationData || !notificationData.messageId) {
        console.warn('⚠️ Invalid notification data received:', notificationData);
        return;
      }

      // Show browser notification (uses latest callback)
      showBrowserNotification(notificationData);

      // Show in-app notification (uses latest callback)
      showInAppNotification(notificationData);

      // Play sound (only if not viewing that chat)
      if (shouldShowNotification(notificationData)) {
        playNotificationSound();
      }

      // Update unread count
      updateUnreadCount(notificationData);
    };

    // Function to set up listener when socket is ready
    const setupListener = () => {
      // Try to get socket from service (always get fresh instance)
      let currentSocket = sharedSocketService.getSocket();
      
      if (!currentSocket) {
        console.warn('⚠️ NotificationHandler: Socket not initialized yet, will retry in 2 seconds...');
        // Retry after longer delay to prevent rapid retries causing page freeze
        setTimeout(setupListener, 2000);
        return null;
      }

      if (!currentSocket.connected) {
        console.warn('⚠️ NotificationHandler: Socket not connected yet, waiting for connection...');
        // Wait for connection using onConnect callback
        sharedSocketService.onConnect((connectedSocket) => {
          console.log('✅ NotificationHandler: Socket connected via callback, setting up listener');
          setSocket(connectedSocket);
          setupListenerWithSocket(connectedSocket);
        });
        return null;
      }

      // Socket is ready, set it and set up listener
      if (currentSocket !== socket) {
        setSocket(currentSocket);
      }
      return setupListenerWithSocket(currentSocket);
    };

    // Function to actually set up the listener
    const setupListenerWithSocket = (currentSocket) => {
      if (!currentSocket) {
        console.error('❌ NotificationHandler: Cannot set up listener - socket is null');
        return null;
      }
      
      if (!currentSocket.connected) {
        console.error('❌ NotificationHandler: Cannot set up listener - socket not connected');
        return null;
      }

      // Prevent duplicate listener setup
      if (listenerSetupRef.current) {
        console.log('⚠️ Listener already set up, skipping duplicate setup...');
        return null;
      }

      console.log('👂 NotificationHandler: Setting up notification listener');
      console.log('📍 Socket connected:', currentSocket.connected);
      console.log('📍 Socket ID:', currentSocket.id);
      console.log('📍 Current page:', location.pathname);

      // Remove any existing listener first to prevent duplicates
      currentSocket.off('notification', handlerRef.current);
      
      // Add the listener using the ref handler
      currentSocket.on('notification', handlerRef.current);
      
      // Mark as set up
      listenerSetupRef.current = true;
      
      // Log when listener is set up
      console.log('✅✅✅ Notification listener ACTIVE - listening for "notification" events');
      console.log('🌍 This listener works on ALL pages:', location.pathname);
      console.log('📡 Ready to receive notifications from backend!');
      
      // Listen for socket reconnect events to re-setup listener
      const handleReconnect = () => {
        console.log('🔄 NotificationHandler: Socket reconnected, re-setting up listener');
        listenerSetupRef.current = false;
        // Get fresh socket instance after reconnect
        const freshSocket = sharedSocketService.getSocket();
        if (freshSocket && freshSocket.connected) {
          setupListenerWithSocket(freshSocket);
        }
      };

      currentSocket.on('reconnect', handleReconnect);

      // REMOVED: Duplicate connection callback - causes multiple listener setups
      // The reconnect event handler above is sufficient

      // Return cleanup function
      return () => {
        console.log('🧹 Cleaning up notification listener');
        listenerSetupRef.current = false;
        // Removed interval - was causing page freeze
        if (currentSocket) {
          currentSocket.off('notification', handlerRef.current);
          currentSocket.off('reconnect', handleReconnect);
        }
      };
    };

    // Start setting up listener
    const cleanup = setupListener();
    
    // Also register connection callback to ensure listener is set up on reconnect
    // This ensures listener is re-setup whenever socket connects/reconnects
    const connectionCallback = (connectedSocket) => {
      console.log('🔄 NotificationHandler: Socket connected/reconnected via service callback');
      setSocket(connectedSocket);
      listenerSetupRef.current = false; // Reset flag to allow re-setup
      // Re-setup listener with fresh socket
      const freshSocket = sharedSocketService.getSocket();
      if (freshSocket && freshSocket.connected) {
        setupListenerWithSocket(freshSocket);
      }
    };
    
    sharedSocketService.onConnect(connectionCallback);
    
    // Return cleanup function
    return () => {
      listenerSetupRef.current = false;
      if (cleanup) cleanup();
      const s = sharedSocketService.getSocket();
      if (s && handlerRef.current) {
        s.off('notification', handlerRef.current);
      }
    };
  }, [socket, showBrowserNotification, showInAppNotification, playNotificationSound, shouldShowNotification, updateUnreadCount, location.pathname]);

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

