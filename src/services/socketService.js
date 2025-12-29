import io from 'socket.io-client';
import API_CONFIG from '../config/api.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  // Initialize socket connection
  connect(options = {}) {
    const {
      url = import.meta.env.VITE_SOCKET_URL || 
           import.meta.env.REACT_APP_SOCKET_URL || 
           API_CONFIG.BASE_URL || 
           'https://vpl-liveproject-1.onrender.com',
      auth = {},
      transports = ['websocket', 'polling']
    } = options;

    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    try {
      this.socket = io(url, {
        auth,
        transports,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 20000,
        forceNew: true
      });

      this.setupEventListeners();
      return this.socket;
    } catch (error) {
      console.error('Failed to initialize socket connection:', error);
      return null;
    }
  }

  // Setup default event listeners
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('socket_connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('socket_disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      this.emit('socket_error', { error, attempts: this.reconnectAttempts });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('socket_reconnected', { attempts: attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      this.emit('socket_reconnect_error', { error });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after maximum attempts');
      this.emit('socket_reconnect_failed');
    });
  }

  // Add event listener
  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket not initialized. Call connect() first.');
      return;
    }

    this.socket.on(event, callback);
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  off(event, callback) {
    if (!this.socket) return;

    this.socket.off(event, callback);
    
    // Remove from stored listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit event
  emit(event, data) {
    if (!this.socket) {
      console.warn('Socket not initialized. Call connect() first.');
      return;
    }

    this.socket.emit(event, data);
  }

  // Join room
  joinRoom(roomId, userData = {}) {
    if (!this.socket) {
      console.warn('Socket not initialized. Call connect() first.');
      return;
    }

    this.emit('join_room', { roomId, ...userData });
  }

  // Leave room
  leaveRoom(roomId) {
    if (!this.socket) return;
    this.emit('leave_room', { roomId });
  }

  // Send message
  sendMessage(messageData) {
    if (!this.socket) {
      console.warn('Socket not initialized. Call connect() first.');
      return;
    }

    this.emit('send_message', messageData);
  }

  // Send private message
  sendPrivateMessage(recipientId, message, additionalData = {}) {
    if (!this.socket) {
      console.warn('Socket not initialized. Call connect() first.');
      return;
    }

    this.emit('private_message', {
      recipientId,
      message,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  }

  // Get connection status
  isSocketConnected() {
    return this.socket && this.socket.connected && this.isConnected;
  }

  // Get socket ID
  getSocketId() {
    return this.socket ? this.socket.id : null;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      // Remove all listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();

      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket disconnected manually');
    }
  }

  // Reconnect socket
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  // Get authentication token
  getAuthToken() {
    return (
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  }

  // Get user data
  getUserData() {
    const userString = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!userString) return null;
    
    try {
      return JSON.parse(userString);
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  }

  // Initialize with authentication
  connectWithAuth() {
    const token = this.getAuthToken();
    const userData = this.getUserData();
    
    if (!token || !userData) {
      console.warn('No authentication data found');
      return null;
    }

    return this.connect({
      auth: {
        token: token,
        userId: userData.id || userData._id,
        username: userData.username || userData.name,
        role: userData.role
      }
    });
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;