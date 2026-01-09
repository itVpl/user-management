import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import { showChatNotification, showNegotiationNotification } from '../utils/notifications';

export const useEnhancedNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [latestMessage, setLatestMessage] = useState(null);
  
  const processedMessageIdsRef = useRef(new Set());
  const processedNegotiationIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  // Get current user info
  const getCurrentUser = useCallback(() => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (!token || !userString) return null;
    
    try {
      const userData = JSON.parse(userString);
      const empId = userData?.empId || userData?.employeeId;
      return { token, empId, userData };
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }, []);

  // Fetch notifications for both chat and negotiation
  const fetchNotifications = useCallback(async () => {
    try {
      const userInfo = getCurrentUser();
      if (!userInfo) return;

      const { token, empId, userData } = userInfo;

      // 1. Fetch loads based on user department
      let items = [];
      const userDepartment = userData?.department?.name?.toLowerCase() || userData?.department?.toLowerCase() || '';
      
      if (userDepartment.includes('sales')) {
        // Fetch Sales Loads (Loads created by this user)
        try {
          const salesResponse = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/load/filter-by-customer-added-by`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (salesResponse.data && (salesResponse.data.loads || salesResponse.data.data)) {
            const loads = salesResponse.data.loads || salesResponse.data.data || [];
            items = loads.map(l => ({ 
              loadId: l._id || l.loadId, 
              bidId: null // Sales users typically don't track specific bids this way for notifications yet
            })).filter(i => i.loadId);
          }
        } catch (err) {
          console.error("Error fetching sales loads:", err);
        }
      } else {
        // Default to CMT behavior (Assigned Loads)
        const loadsResponse = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/bid/cmt-assigned-loads/${empId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (loadsResponse.data?.success) {
          const assignedLoads = loadsResponse.data.data?.assignedLoads || [];
          items = assignedLoads
            .map(al => ({ 
              bidId: al._id, 
              loadId: al.load?._id,
              load: al.load 
            }))
            .filter(item => item.bidId && item.loadId);
        }
      }

      if (items.length === 0) return;

      const newNotifications = [];

      // 2. Check chat messages for each load
      await Promise.all(items.map(async (item) => {
        if (!item.bidId) return; // Skip if no bid ID (e.g. Sales view of raw loads)

        try {
          // Fetch load-specific chat messages
          const chatResponse = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/chat/public/load/${item.loadId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (chatResponse.data?.success && chatResponse.data?.messages) {
            const messages = chatResponse.data.messages;
            
            // Filter incoming messages (not sent by current user)
            const incomingMessages = messages.filter(msg => {
              const isMyMessage = String(msg.senderEmpId).trim() === String(empId).trim();
              return !isMyMessage;
            });

            incomingMessages.forEach(msg => {
              if (!processedMessageIdsRef.current.has(msg._id)) {
                const isRecent = new Date(msg.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000);

                const notificationObj = {
                  _id: msg._id,
                  loadId: item.loadId,
                  bidId: item.bidId,
                  message: msg.message,
                  sender: {
                    employeeName: msg.senderName || msg.sender?.employeeName || 'User',
                    empId: msg.senderEmpId
                  },
                  timestamp: msg.timestamp,
                  type: 'chat'
                };

                if (initialLoadRef.current) {
                  if (isRecent) {
                    newNotifications.push(notificationObj);
                  }
                } else {
                  newNotifications.push(notificationObj);
                  
                  // Show real-time notification
                  showChatNotification(
                    item.loadId,
                    notificationObj.sender.employeeName,
                    msg.message
                  );
                }
                processedMessageIdsRef.current.add(msg._id);
              }
            });
          }
        } catch (error) {
          // Only log non-404 errors (404 means endpoint doesn't exist or load has no chat)
          if (error.response?.status !== 404) {
            console.error(`Error fetching chat for load ${item.loadId}:`, error);
          } else {
            // 404 is expected if load doesn't have chat messages yet
            // Silently skip - this is not an error condition
          }
        }
      }));

      // 3. Check internal negotiation threads for each bid
      await Promise.all(items.map(async (item) => {
        if (!item.bidId) return; // Skip if no bid ID

        try {
          // Fetch internal negotiation thread
          const negotiationResponse = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/bid/${item.bidId}/internal-negotiation-thread`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (negotiationResponse.data?.success && negotiationResponse.data?.data?.internalNegotiation?.history) {
            const history = negotiationResponse.data.data.internalNegotiation.history;
            
            // Filter incoming negotiation messages (from shipper to inhouse/CMT)
            const incomingNegotiations = history.filter(msg => msg.by === 'shipper');

            incomingNegotiations.forEach(msg => {
              if (!processedNegotiationIdsRef.current.has(msg._id)) {
                const isRecent = new Date(msg.at) > new Date(Date.now() - 24 * 60 * 60 * 1000);

                const notificationObj = {
                  _id: msg._id,
                  loadId: item.loadId,
                  bidId: item.bidId,
                  message: msg.message,
                  rate: msg.rate,
                  sender: {
                    employeeName: 'Shipper',
                    empId: 'shipper'
                  },
                  timestamp: msg.at,
                  type: 'negotiation'
                };

                if (initialLoadRef.current) {
                  if (isRecent) {
                    newNotifications.push(notificationObj);
                  }
                } else {
                  newNotifications.push(notificationObj);
                  
                  // Dispatch global event for cross-route notifications
                  window.dispatchEvent(new CustomEvent('NEGOTIATION_MESSAGE_RECEIVED', {
                    detail: {
                      bidId: item.bidId,
                      loadId: item.loadId,
                      rate: msg.rate,
                      message: msg.message,
                      senderName: 'Shipper',
                      timestamp: msg.at
                    }
                  }));
                  
                  // Show real-time notification (keeping existing for immediate feedback)
                  showNegotiationNotification(
                    item.bidId,
                    item.loadId,
                    msg.rate,
                    msg.message
                  );
                }
                processedNegotiationIdsRef.current.add(msg._id);
              }
            });
          }
        } catch (error) {
          // Only log non-404 errors (404 means endpoint doesn't exist or bid has no negotiation thread)
          if (error.response?.status !== 404) {
            console.error(`Error fetching negotiation for bid ${item.bidId}:`, error);
          } else {
            // 404 is expected if bid doesn't have an internal negotiation thread yet
            // Silently skip - this is not an error condition
          }
        }
      }));

      // Update state with new notifications
      if (newNotifications.length > 0) {
        // Sort by timestamp (newest first)
        newNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setNotifications(prev => [...newNotifications, ...prev]);
        setUnreadCount(prev => prev + newNotifications.length);
        setLatestMessage(newNotifications[0]);
      }
      
      initialLoadRef.current = false;

    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [getCurrentUser]);

  // Set up polling - reduced frequency to prevent 429 errors
  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000); // Poll every 30 seconds (was 10s)
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  // Clear specific notification
  const clearNotification = useCallback((notificationId, type) => {
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Remove from processed sets so it can be re-processed if needed
    if (type === 'chat') {
      processedMessageIdsRef.current.delete(notificationId);
    } else if (type === 'negotiation') {
      processedNegotiationIdsRef.current.delete(notificationId);
    }
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Clear notifications by load ID
  const clearNotificationsByLoad = useCallback((loadId) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => n.loadId !== loadId);
      const removedCount = prev.length - filtered.length;
      setUnreadCount(prevCount => Math.max(0, prevCount - removedCount));
      return filtered;
    });
  }, []);

  return {
    unreadCount,
    notifications,
    latestMessage,
    clearNotification,
    clearAllNotifications,
    clearNotificationsByLoad,
    refreshNotifications: fetchNotifications
  };
};