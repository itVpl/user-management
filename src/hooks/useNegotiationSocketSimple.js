import { useEffect, useRef, useState } from 'react';

// Simple version without socket.io for now
export const useNegotiationSocket = (user, bidId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [newMessage, setNewMessage] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user || !bidId) return;

    console.log('🔌 Negotiation socket hook initialized (simple version)');
    
    // Simulate connection
    setIsConnected(true);

    // Listen for global events
    const handleNegotiationMessage = (event) => {
      const data = event.detail;
      if (data.bidId === bidId) {
        setNewMessage(data);
        
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
      }
    };

    window.addEventListener('NEGOTIATION_MESSAGE_RECEIVED', handleNegotiationMessage);

    return () => {
      window.removeEventListener('NEGOTIATION_MESSAGE_RECEIVED', handleNegotiationMessage);
      setIsConnected(false);
    };
  }, [user, bidId]);

  return {
    isConnected,
    newMessage,
    notifications,
    refreshNegotiation: () => setNewMessage(null),
    clearNotifications: () => setNotifications([])
  };
};