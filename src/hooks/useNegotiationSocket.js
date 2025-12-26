import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 
                   import.meta.env.VITE_SOCKET_URL || 
                   'https://vpl-liveproject-1.onrender.com';

export const useNegotiationSocket = (user, bidId) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newMessage, setNewMessage] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user || !bidId) return;

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    // Handle connection
    socket.on('connect', () => {
      console.log('✅ Negotiation Socket connected');
      setIsConnected(true);

      // Identify user based on type
      if (user.userType === 'shipper') {
        // For shippers: use userId or _id
        socket.emit('join_shipper', user._id || user.userId);
      } else if (user.empId) {
        // For employees: use empId
        socket.emit('join', user.empId);
      }

      // Join the negotiation room for this specific bid
      socket.emit('join_bid_negotiation', bidId);
    });

    socket.on('disconnect', () => {
      console.log('❌ Negotiation Socket disconnected');
      setIsConnected(false);
    });

    // 🔥 MAIN EVENT: Listen for new negotiation messages
    socket.on('new_negotiation_message', (data) => {
      console.log('📨 New negotiation message:', data);

      // Only process if it's for the current bid
      if (data.bidId === bidId) {
        setNewMessage(data);

        // Create notification object
        const notification = {
          id: Date.now(),
          bidId: data.bidId,
          sender: data.senderName,
          message: data.message || `New rate: $${data.rate}`,
          rate: data.rate,
          timestamp: data.timestamp,
          isShipper: data.sender === 'shipper'
        };

        setNotifications(prev => [notification, ...prev]);

        // Dispatch global event for cross-route notifications
        window.dispatchEvent(new CustomEvent('NEGOTIATION_MESSAGE_RECEIVED', {
          detail: {
            bidId: data.bidId,
            loadId: data.loadId || bidId, // Use loadId if available, fallback to bidId
            rate: data.rate,
            message: data.message,
            senderName: data.senderName,
            timestamp: data.timestamp,
            sender: data.sender,
            isShipper: data.sender === 'shipper'
          }
        }));

        // Optional: Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Negotiation Message', {
            body: `${data.senderName}: ${data.message || `Rate: $${data.rate}`}`,
            icon: '/logo_vpower.png'
          });
        }
      }
    });

    // Cleanup on unmount
    return () => {
      if (bidId) {
        socket.emit('leave_bid_negotiation', bidId);
      }
      socket.disconnect();
    };
  }, [user, bidId]);

  // Request browser notification permission on first use
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    isConnected,      // Boolean: socket connection status
    newMessage,       // Object: latest message received
    notifications,    // Array: all notifications
    refreshNegotiation: () => setNewMessage(null),
    clearNotifications: () => setNotifications([])
  };
};