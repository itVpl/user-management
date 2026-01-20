// contexts/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children, userId }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);

  // Initialize socket connection
  useEffect(() => {
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.log('❌ No user ID provided for socket connection');
      return;
    }

    console.log('🚀 Initializing WebSocket connection for user:', userId);

    // Get socket URL - Socket.io needs base URL WITHOUT /api/v1
    // Priority: VITE_SOCKET_URL > VITE_BACKEND_URL > VITE_API_BASE_URL (with /api/v1 removed) > fallback
    const getBackendUrl = () => {
      if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
      if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
      if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '');
      }
      return 'https://vpl-liveproject-1.onrender.com';
    };
    const backendUrl = getBackendUrl();
    
    const socketInstance = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      autoConnect: true,
      forceNew: true,
      query: {
        userId: userId
      }
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('✅ WebSocket Connected:', socketInstance.id);
      setConnected(true);
      setReconnectionAttempts(0);
      
      // Register user after connection
      socketInstance.emit('register-user', userId);
      
      // CRITICAL: Join user room for notifications (backend sends to user_{empId})
      socketInstance.emit('join', userId);
      console.log('📤 [SocketContext] Emitted "join" event with userId:', userId);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ WebSocket Connection Error:', error);
      setConnected(false);
      
      // Auto-reconnect logic
      const attempts = reconnectionAttempts + 1;
      setReconnectionAttempts(attempts);
      
      if (attempts < 5) {
        console.log(`🔄 Reconnection attempt ${attempts}/5 in 3 seconds...`);
        setTimeout(() => {
          socketInstance.connect();
        }, 3000);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ WebSocket Disconnected:', reason);
      setConnected(false);
      
      // Try to reconnect if not manually disconnected
      if (reason !== 'io client disconnect') {
        setTimeout(() => {
          if (!socketInstance.connected) {
            socketInstance.connect();
          }
        }, 2000);
      }
    });

    // Reconnect event - rejoin room
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`✅ WebSocket Reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setReconnectionAttempts(0);
      
      // Re-join user room after reconnection
      if (userId) {
        socketInstance.emit('join', userId);
        console.log('📤 [SocketContext] Re-emitted "join" event after reconnect with userId:', userId);
      }
    });

    // DEBUG: Listen for ALL socket events to see what backend is sending
    socketInstance.onAny((eventName, ...args) => {
      console.log('🔔🔔🔔 [SocketContext] Event received:', eventName);
      console.log('📍 [SocketContext] Event args:', args);
      if (eventName === 'bid-submitted') {
        console.log('🎯 [SocketContext] BID-SUBMITTED EVENT DETECTED!');
      }
    });

    // Message received event
    socketInstance.on('receive-message', (data) => {
      console.log('📩 New message received:', data);
      
      const notification = {
        id: Date.now(),
        type: 'message',
        title: 'New Message',
        body: data.message,
        senderId: data.senderId,
        senderName: data.senderName || 'Unknown',
        timestamp: new Date(),
        read: false,
        data: data
      };

      // Show toast notification
      toast.info(
        <div className="space-y-1">
          <div className="font-semibold">New message from {data.senderName}</div>
          <div className="text-sm">{data.message.substring(0, 50)}...</div>
        </div>,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          onClick: () => {
            // Open chat when notification is clicked
            window.dispatchEvent(new CustomEvent('open-chat', {
              detail: { senderId: data.senderId }
            }));
          }
        }
      );

      // Store notification
      setNotifications(prev => [notification, ...prev]);
      
      // Play notification sound if permission granted
      playNotificationSound();
    });

    // Notification event (generic)
    socketInstance.on('notification', (data) => {
      console.log('🔔 Notification received:', data);
      
      const notification = {
        id: Date.now(),
        type: data.type || 'info',
        title: data.title || 'Notification',
        body: data.body || '',
        timestamp: new Date(),
        read: false,
        data: data.data || {}
      };

      // Show appropriate toast
      switch(data.type) {
        case 'error':
          toast.error(data.body, {
            position: "top-right",
            autoClose: 5000
          });
          break;
        case 'success':
          toast.success(data.body, {
            position: "top-right",
            autoClose: 5000
          });
          break;
        case 'warning':
          toast.warning(data.body, {
            position: "top-right",
            autoClose: 5000
          });
          break;
        default:
          toast.info(data.body, {
            position: "top-right",
            autoClose: 5000
          });
      }

      setNotifications(prev => [notification, ...prev]);
      playNotificationSound();
    });

    // Bid notification events
    socketInstance.on('new-bid-notification', (data) => {
      console.log('💰 New bid notification:', data);
      
      toast.info(
        <div className="space-y-1">
          <div className="font-semibold">New Bid Received</div>
          <div className="text-sm">${data.data?.rate} for your load</div>
        </div>,
        {
          position: "top-right",
          autoClose: 5000,
          onClick: () => {
            // Navigate to bids page
            window.location.href = `/load-board?loadId=${data.data?.loadId}`;
          }
        }
      );

      setNotifications(prev => [{
        id: Date.now(),
        type: 'new_bid',
        title: 'New Bid',
        body: `New bid of $${data.data?.rate} received`,
        timestamp: new Date(),
        read: false,
        data: data.data
      }, ...prev]);
    });

    socketInstance.on('bid-accepted-notification', (data) => {
      console.log('🎉 Bid accepted notification:', data);
      
      toast.success(
        <div className="space-y-1">
          <div className="font-semibold">Bid Accepted!</div>
          <div className="text-sm">Your bid has been accepted</div>
        </div>,
        {
          position: "top-right",
          autoClose: 5000
        }
      );

      setNotifications(prev => [{
        id: Date.now(),
        type: 'bid_accepted',
        title: 'Bid Accepted',
        body: 'Your bid has been accepted by the shipper',
        timestamp: new Date(),
        read: false,
        data: data.data
      }, ...prev]);
    });

    socketInstance.on('bid-rejected-notification', (data) => {
      console.log('❌ Bid rejected notification:', data);
      
      toast.warning(
        <div className="space-y-1">
          <div className="font-semibold">Bid Rejected</div>
          <div className="text-sm">Your bid has been rejected</div>
        </div>,
        {
          position: "top-right",
          autoClose: 5000
        }
      );

      setNotifications(prev => [{
        id: Date.now(),
        type: 'bid_rejected',
        title: 'Bid Rejected',
        body: 'Your bid has been rejected by the shipper',
        timestamp: new Date(),
        read: false,
        data: data.data
      }, ...prev]);
    });

    // Bid submitted notification - for sales person when CMT submits a bid
    socketInstance.on('bid-submitted', (data) => {
      console.log('🔔🔔🔔 [BID NOTIFICATION] Bid submitted notification received!');
      console.log('📨 [BID NOTIFICATION] Full data:', JSON.stringify(data, null, 2));
      console.log('📨 [BID NOTIFICATION] Rate:', data.rate);
      console.log('📨 [BID NOTIFICATION] LoadId:', data.loadId);
      console.log('📨 [BID NOTIFICATION] SubmittedBy:', data.submittedBy);
      console.log('📨 [BID NOTIFICATION] SalesPerson:', data.salesPerson);
      
      // Show toast notification
      toast.success(
        <div className="space-y-1">
          <div className="font-semibold">New Bid Submitted</div>
          <div className="text-sm">
            ${data.rate?.toLocaleString()} bid submitted for Load {data.loadDetails?.shipmentNumber || data.loadId}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Submitted by: {data.submittedBy?.empName || 'CMT Team'}
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 6000,
          onClick: () => {
            // Navigate to rate request details page
            if (data.loadId) {
              window.location.href = `/rate-request?loadId=${data.loadId}`;
            }
          }
        }
      );

      // Add to notifications state
      setNotifications(prev => [{
        id: Date.now(),
        type: 'bid_submitted',
        title: 'New Bid Submitted',
        body: `A bid of $${data.rate?.toLocaleString()} has been submitted for your rate request`,
        timestamp: new Date(data.timestamp || Date.now()),
        read: false,
        data: {
          bidId: data.bidId,
          loadId: data.loadId,
          rate: data.rate,
          message: data.message,
          submittedBy: data.submittedBy,
          loadDetails: data.loadDetails
        }
      }, ...prev]);

      // Play notification sound
      playNotificationSound();

      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notification = new Notification('New Bid Submitted', {
            body: `A bid of $${data.rate?.toLocaleString()} has been submitted for Load ${data.loadDetails?.shipmentNumber || data.loadId}`,
            icon: '/LogoFinal.png',
            badge: '/LogoFinal.png',
            tag: `bid-submitted-${data.bidId}`,
            data: {
              bidId: data.bidId,
              loadId: data.loadId,
              type: 'bid_submitted'
            }
          });

          notification.onclick = () => {
            window.focus();
            if (data.loadId) {
              window.location.href = `/rate-request?loadId=${data.loadId}`;
            }
            notification.close();
          };
        } catch (error) {
          console.error('Error showing browser notification:', error);
        }
      }
    });

    socketInstance.on('bid-status-updated', (data) => {
      console.log('🔄 Bid status updated:', data);
      
      if (data.status === 'Accepted') {
        toast.success(
          <div className="space-y-1">
            <div className="font-semibold">Bid Status Updated</div>
            <div className="text-sm">Bid accepted by shipper</div>
          </div>,
          {
            position: "top-right",
            autoClose: 5000
          }
        );
      } else if (data.status === 'Rejected') {
        toast.warning(
          <div className="space-y-1">
            <div className="font-semibold">Bid Status Updated</div>
            <div className="text-sm">Bid rejected by shipper</div>
          </div>,
          {
            position: "top-right",
            autoClose: 5000
          }
        );
      }
    });

    // Error handling
    socketInstance.on('error', (error) => {
      console.error('WebSocket error:', error);
      toast.error('WebSocket connection error. Please refresh the page.');
    });

    socketInstance.on('message-sent', (data) => {
      console.log('✅ Message sent successfully:', data);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance.removeAllListeners();
      }
    };
  }, [userId]);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Check if browser supports Audio
      if (typeof Audio !== 'undefined') {
        const audio = new Audio('/notification.mp3'); // Add notification sound file in public folder
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play failed:', e));
      }
    } catch (error) {
      console.log('Notification sound error:', error);
    }
  };

  // Send message function
  const sendMessage = (receiverId, message, loadId = null) => {
    if (!socket || !connected) {
      toast.error('Not connected to chat server');
      return false;
    }

    if (!message.trim()) {
      toast.warning('Message cannot be empty');
      return false;
    }

    socket.emit('send-message', {
      senderId: userId,
      receiverId,
      message: message.trim(),
      loadId
    });

    return true;
  };

  // Send bid notification
  const sendBidNotification = (loadId, carrierId, rate, message) => {
    if (!socket || !connected) {
      console.warn('Socket not connected, cannot send bid notification');
      return false;
    }

    socket.emit('new-bid', {
      loadId,
      carrierId,
      rate,
      message
    });

    return true;
  };

  // Update bid status notification
  const updateBidStatus = (bidId, status, shipperId, carrierId) => {
    if (!socket || !connected) {
      console.warn('Socket not connected, cannot send bid status update');
      return false;
    }

    socket.emit('bid-status-updated', {
      bidId,
      status,
      shipperId,
      carrierId
    });

    return true;
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  // Clear notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Get unread count
  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const value = {
    socket,
    connected,
    notifications,
    sendMessage,
    sendBidNotification,
    updateBidStatus,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    getUnreadCount,
    reconnectionAttempts
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};