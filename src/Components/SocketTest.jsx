import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import API_CONFIG from '../config/api';

const SocketTest = () => {
  const [status, setStatus] = useState('Not connected');

  useEffect(() => {
    try {
      console.log('Testing socket.io-client import...');
      
      // Test if io is available
      if (typeof io === 'function') {
        setStatus('✅ socket.io-client imported successfully');
        console.log('✅ socket.io-client is working');
        
        // Test connection (but don't actually connect)
        // Get socket URL - Socket.io needs base URL WITHOUT /api/v1
        const socketUrl = import.meta.env.VITE_SOCKET_URL || API_CONFIG.BASE_URL || 'https://vpl-liveproject-1.onrender.com';
        const testSocket = io(socketUrl, {
          autoConnect: false // Don't auto-connect for test
        });
        
        if (testSocket) {
          setStatus('✅ Socket instance created successfully');
          testSocket.disconnect();
        }
      } else {
        setStatus('❌ socket.io-client import failed');
      }
    } catch (error) {
      console.error('Socket test error:', error);
      setStatus(`❌ Error: ${error.message}`);
    }
  }, []);

  return (
    <div>
      
    </div>
  );
};

export default SocketTest;