import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const UnreadCountContext = createContext();

/**
 * UnreadCountProvider
 * 
 * Provides global unread message count tracking for the Chat module.
 * Tracks unread counts for individual chats and groups.
 */
export const UnreadCountProvider = ({ children }) => {
  // Track unread counts: { empId: count } for individual chats
  const [unreadCounts, setUnreadCounts] = useState({});
  // Track unread counts: { groupId: count } for group chats
  const [groupUnreadCounts, setGroupUnreadCounts] = useState({});

  // Listen for unread count updates from NotificationHandler and Chat
  useEffect(() => {
    const handleIncrementUnread = (event) => {
      const { type, empId, groupId, count } = event.detail;
      
      if (type === 'individual' && empId) {
        setUnreadCounts(prev => ({
          ...prev,
          [empId]: (prev[empId] || 0) + (count || 1)
        }));
      } else if (type === 'group' && groupId) {
        setGroupUnreadCounts(prev => ({
          ...prev,
          [groupId]: (prev[groupId] || 0) + (count || 1)
        }));
      }
    };

    const handleClearUnread = (event) => {
      const { type, empId, groupId } = event.detail;
      
      if (type === 'individual' && empId) {
        setUnreadCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[empId];
          return newCounts;
        });
      } else if (type === 'group' && groupId) {
        setGroupUnreadCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[groupId];
          return newCounts;
        });
      }
    };

    const handleSetUnreadCount = (event) => {
      const { type, empId, groupId, count } = event.detail;
      
      if (type === 'individual' && empId !== undefined) {
        setUnreadCounts(prev => {
          if (count > 0) {
            return { ...prev, [empId]: count };
          } else {
            const newCounts = { ...prev };
            delete newCounts[empId];
            return newCounts;
          }
        });
      } else if (type === 'group' && groupId !== undefined) {
        setGroupUnreadCounts(prev => {
          if (count > 0) {
            return { ...prev, [groupId]: count };
          } else {
            const newCounts = { ...prev };
            delete newCounts[groupId];
            return newCounts;
          }
        });
      }
    };

    window.addEventListener('incrementUnreadCount', handleIncrementUnread);
    window.addEventListener('clearUnreadCount', handleClearUnread);
    window.addEventListener('setUnreadCount', handleSetUnreadCount);

    return () => {
      window.removeEventListener('incrementUnreadCount', handleIncrementUnread);
      window.removeEventListener('clearUnreadCount', handleClearUnread);
      window.removeEventListener('setUnreadCount', handleSetUnreadCount);
    };
  }, []);

  // Get total unread count (sum of all individual + group unread messages)
  const getTotalUnreadCount = useCallback(() => {
    const individualTotal = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    const groupTotal = Object.values(groupUnreadCounts).reduce((sum, count) => sum + count, 0);
    return individualTotal + groupTotal;
  }, [unreadCounts, groupUnreadCounts]);

  // Check if there are any unread messages
  const hasUnreadMessages = useCallback(() => {
    return getTotalUnreadCount() > 0;
  }, [getTotalUnreadCount]);

  // Increment unread count for individual chat
  const incrementUnreadCount = useCallback((empId, count = 1) => {
    if (!empId) return;
    
    setUnreadCounts(prev => ({
      ...prev,
      [empId]: (prev[empId] || 0) + count
    }));
  }, []);

  // Increment unread count for group chat
  const incrementGroupUnreadCount = useCallback((groupId, count = 1) => {
    if (!groupId) return;
    
    setGroupUnreadCounts(prev => ({
      ...prev,
      [groupId]: (prev[groupId] || 0) + count
    }));
  }, []);

  // Clear unread count for individual chat
  const clearUnreadCount = useCallback((empId) => {
    if (!empId) return;
    
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[empId];
      return newCounts;
    });
  }, []);

  // Clear unread count for group chat
  const clearGroupUnreadCount = useCallback((groupId) => {
    if (!groupId) return;
    
    setGroupUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[groupId];
      return newCounts;
    });
  }, []);

  // Clear all unread counts
  const clearAllUnreadCounts = useCallback(() => {
    setUnreadCounts({});
    setGroupUnreadCounts({});
  }, []);

  // Get unread count for specific user
  const getUnreadCount = useCallback((empId) => {
    return unreadCounts[empId] || 0;
  }, [unreadCounts]);

  // Get unread count for specific group
  const getGroupUnreadCount = useCallback((groupId) => {
    return groupUnreadCounts[groupId] || 0;
  }, [groupUnreadCounts]);

  // Initialize unread counts from API response
  const initializeUnreadCounts = useCallback((counts) => {
    if (counts && typeof counts === 'object') {
      setUnreadCounts(counts);
    }
  }, []);

  const value = {
    unreadCounts,
    groupUnreadCounts,
    getTotalUnreadCount,
    hasUnreadMessages,
    incrementUnreadCount,
    incrementGroupUnreadCount,
    clearUnreadCount,
    clearGroupUnreadCount,
    clearAllUnreadCounts,
    getUnreadCount,
    getGroupUnreadCount,
    initializeUnreadCounts
  };

  return (
    <UnreadCountContext.Provider value={value}>
      {children}
    </UnreadCountContext.Provider>
  );
};

/**
 * useUnreadCount Hook
 * 
 * Hook to access unread count context
 */
export const useUnreadCount = () => {
  const context = useContext(UnreadCountContext);
  if (!context) {
    throw new Error('useUnreadCount must be used within UnreadCountProvider');
  }
  return context;
};

export default UnreadCountContext;

