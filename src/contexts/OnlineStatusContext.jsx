import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import API_CONFIG from '../config/api.js';

const OnlineStatusContext = createContext();

/**
 * OnlineStatusProvider
 * 
 * Provides global online status tracking for all users in the application.
 * Listens to Socket.io events to track when users come online or go offline.
 */
export const OnlineStatusProvider = ({ children, socket: externalSocket = null }) => {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [socket, setSocket] = useState(externalSocket);
  const [isConnected, setIsConnected] = useState(false);

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

  // Initialize socket connection if not provided externally
  useEffect(() => {
    // If external socket is provided, use it
    if (externalSocket) {
      setSocket(externalSocket);
      setIsConnected(externalSocket.connected || false);
      return;
    }

    // Otherwise, create our own socket connection
    const user = getUser();
    if (!user?.empId) {
      console.log('❌ No user empId found for online status socket connection');
      return;
    }

    console.log('🚀 Initializing online status socket connection for user:', user.empId);

    // Get socket URL - Socket.io needs base URL WITHOUT /api/v1
    // Priority: VITE_SOCKET_URL > API_CONFIG.BASE_URL > fallback
    const socketUrl = import.meta.env.VITE_SOCKET_URL || API_CONFIG.BASE_URL || 'https://vpl-liveproject-1.onrender.com';

    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socketInstance.on('connect', () => {
      console.log('✅ Online status socket connected:', socketInstance.id);
      setIsConnected(true);
      
      // Join with empId after connection
      socketInstance.emit('join', user.empId);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Online status socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Online status socket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`✅ Online status socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      // Re-join with empId after reconnection
      if (user.empId) {
        socketInstance.emit('join', user.empId);
      }
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up online status socket connection');
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance.removeAllListeners();
      }
    };
  }, [externalSocket, getUser]);

  // Listen for online/offline events
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (empId) => {
      if (!empId) return;
      
      const user = getUser();
      // Don't track ourselves
      if (empId === user?.empId) return;

      console.log('🟢 User came online:', empId);
      setOnlineUsers(prev => new Set([...prev, empId]));
    };

    const handleUserOffline = (empId) => {
      if (!empId) return;
      
      const user = getUser();
      // Don't track ourselves
      if (empId === user?.empId) return;

      console.log('🔴 User went offline:', empId);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(empId);
        return newSet;
      });
    };

    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [socket, getUser]);

  // Initialize online status from API
  const initializeOnlineStatus = useCallback(async (empIds) => {
    if (!empIds || empIds.length === 0) return;

    try {
      // Use batch API endpoint if available
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/chat/online-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ empIds })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.onlineStatus) {
          const onlineEmpIds = data.onlineStatus
            .filter(status => status.online)
            .map(status => status.empId);
          
          if (onlineEmpIds.length > 0) {
            setOnlineUsers(prev => new Set([...prev, ...onlineEmpIds]));
          }
        }
      }
    } catch (error) {
      console.error('Error initializing online status:', error);
    }
  }, []);

  // Check if a user is online
  const isUserOnline = useCallback((empId) => {
    if (!empId) return false;
    return onlineUsers.has(empId);
  }, [onlineUsers]);

  // Get all online users
  const getOnlineUsers = useCallback(() => {
    return Array.from(onlineUsers);
  }, [onlineUsers]);

  // Get online count
  const getOnlineCount = useCallback(() => {
    return onlineUsers.size;
  }, [onlineUsers]);

  const value = {
    onlineUsers,
    isUserOnline,
    getOnlineUsers,
    getOnlineCount,
    initializeOnlineStatus,
    isConnected,
    socket
  };

  return (
    <OnlineStatusContext.Provider value={value}>
      {children}
    </OnlineStatusContext.Provider>
  );
};

/**
 * useOnlineStatus Hook
 * 
 * Hook to access online status context
 * 
 * @returns {Object} Online status context value
 */
export const useOnlineStatus = () => {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error('useOnlineStatus must be used within OnlineStatusProvider');
  }
  return context;
};

