import { io } from 'socket.io-client';
import API_CONFIG from '../config/api.js';

/**
 * Shared Socket Service
 * 
 * Singleton service that maintains a SINGLE socket connection for the entire app.
 * All components should use this service instead of creating their own sockets.
 * 
 * This reduces server load by ensuring only ONE socket connection per user.
 */
class SharedSocketService {
  constructor() {
    this.socket = null;
    this.empId = null;
    this.listeners = new Map(); // Store event listeners for cleanup
    this.isInitialized = false;
    this.connectionCallbacks = []; // Callbacks to call when connected
    this.keepAliveInterval = null; // Keep-alive interval
    this.connectionMonitorInterval = null; // Connection monitor interval
    this.reconnectTimeout = null; // Reconnect timeout
  }

  /**
   * Initialize the shared socket connection
   * Should be called ONCE when the app loads (in App.jsx)
   * 
   * @param {string} empId - Employee ID to join with
   * @returns {Socket} The socket instance
   */
  initialize(empId) {
    // If already initialized and connected with same empId, return existing socket
    if (this.isInitialized && this.socket?.connected && this.empId === empId) {
      console.log('✅ Shared socket already initialized and connected');
      return this.socket;
    }

    // If empId changed, disconnect old socket
    if (this.socket && this.empId !== empId) {
      console.log('🔄 Employee ID changed, reinitializing socket...');
      this.disconnect();
    }

    this.empId = empId;

    // Get socket URL from API config (uses VITE_API_BASE_URL from .env)
    const socketUrl = API_CONFIG.BASE_URL;

    console.log('🚀 Initializing SHARED socket connection for user:', empId);
    console.log('🌍 This socket will be used by ALL components (NotificationHandler, Chat, etc.)');

    // Create socket connection with persistent reconnection
    this.socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity, // Always try to reconnect - never give up
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000, // Max 10 seconds between attempts
      timeout: 20000,
      forceNew: false, // Allow sharing connection if possible
      autoConnect: true // Automatically connect
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅✅✅ SHARED Socket CONNECTED:', this.socket.id);
      console.log('🌍 This socket is used by ALL components!');
      
      // Join with empId after connection
      this.socket.emit('join', empId);
      console.log('📤 Emitted "join" event with empId:', empId);
      
      // Call all connection callbacks
      this.connectionCallbacks.forEach(callback => {
        try {
          callback(this.socket);
        } catch (error) {
          console.error('Error in connection callback:', error);
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Shared socket disconnected:', reason);
      console.log('🔄 Will attempt to reconnect automatically...');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Shared socket connection error:', error);
      console.log('🔄 Will attempt to reconnect...');
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Shared socket reconnected after ${attemptNumber} attempts`);
      console.log('🌍 Shared socket ACTIVE again!');
      
      // Re-join with empId after reconnection
      if (this.empId) {
        this.socket.emit('join', this.empId);
        console.log('📤 Re-emitted "join" event with empId:', this.empId);
      }
      
      // Call all connection callbacks again (for components to re-setup listeners)
      this.connectionCallbacks.forEach(callback => {
        try {
          callback(this.socket);
        } catch (error) {
          console.error('Error in reconnection callback:', error);
        }
      });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Shared socket reconnection attempt ${attemptNumber}...`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Shared socket reconnection failed - will keep trying...');
      // Force reconnection attempt after a delay
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          console.log('🔄 Forcing reconnection attempt...');
          this.socket.connect();
        }
      }, 5000);
    });

    // Start keep-alive mechanism
    this.startKeepAlive();
    
    // Start connection monitor
    this.startConnectionMonitor();

    this.isInitialized = true;
    return this.socket;
  }

  /**
   * Start keep-alive mechanism to keep connection alive
   * Note: Socket.io handles ping/pong internally, so we don't need custom pings
   * This just ensures the connection stays active
   */
  startKeepAlive() {
    // Clear existing interval if any
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    // Socket.io handles ping/pong internally, so we don't need to send custom pings
    // This interval is just a placeholder - actual keep-alive is handled by Socket.io
    // We'll check connection status less frequently to reduce load
    this.keepAliveInterval = null; // Disabled - Socket.io handles this internally
  }

  /**
   * Start connection monitor to ensure socket stays connected
   * DISABLED: Socket.io handles reconnection automatically, no need for manual monitoring
   * This was causing too many reconnection attempts and page freezes
   */
  startConnectionMonitor() {
    // DISABLED - Socket.io handles reconnection automatically
    // Manual monitoring was causing infinite reconnection loops
    console.log('ℹ️ Connection monitor disabled - Socket.io handles reconnection automatically');
  }

  /**
   * Stop keep-alive mechanism
   */
  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Stop connection monitor
   */
  stopConnectionMonitor() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Get the socket instance
   * @returns {Socket|null} The socket instance or null if not initialized
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Check if socket is connected
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   * @returns {string|null} Socket ID or null if not connected
   */
  getSocketId() {
    return this.socket?.id || null;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn('⚠️ Socket not initialized. Call initialize() first.');
      return;
    }

    this.socket.on(event, callback);
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function (optional)
   */
  off(event, callback) {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(event, callback);
      
      // Remove from stored listeners
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {any} data - Data to emit
   */
  emit(event, data) {
    if (!this.socket || !this.socket.connected) {
      console.warn('⚠️ Socket not connected. Cannot emit:', event);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Register a callback to be called when socket connects
   * Useful for components that need to do something on connection
   * @param {Function} callback - Callback function
   */
  onConnect(callback) {
    if (this.socket?.connected) {
      // Already connected, call immediately
      callback(this.socket);
    } else {
      // Store callback to call when connected
      this.connectionCallbacks.push(callback);
    }
  }

  /**
   * Re-join with empId (useful after reconnection)
   */
  rejoin() {
    if (this.socket && this.socket.connected && this.empId) {
      console.log('📤 Re-joining with empId:', this.empId);
      this.socket.emit('join', this.empId);
    }
  }

  /**
   * Ensure connection is active
   * Call this method to guarantee socket is connected
   * @returns {Promise<Socket>} Promise that resolves when socket is connected
   */
  async ensureConnected() {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (this.socket && this.socket.connected) {
        resolve(this.socket);
        return;
      }

      // If not initialized, initialize it
      if (!this.isInitialized && this.empId) {
        this.initialize(this.empId);
      }

      // Wait for connection
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000); // 10 second timeout

      this.onConnect((socket) => {
        clearTimeout(timeout);
        resolve(socket);
      });
    });
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    // Stop keep-alive and connection monitor
    this.stopKeepAlive();
    this.stopConnectionMonitor();

    if (this.socket) {
      // Remove all listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();
      this.connectionCallbacks = [];

      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
      this.empId = null;
      console.log('✅ Shared socket disconnected');
    }
  }
}

// Export singleton instance
export const sharedSocketService = new SharedSocketService();
export default sharedSocketService;

