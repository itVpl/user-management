import { io } from 'socket.io-client';
import API_CONFIG from '../config/api.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.token = null;
  }

  connect(token, empId) {
    // If already connected with same token, don't reconnect
    if (this.socket?.connected && this.token === token) {
      return;
    }

    // Disconnect existing socket if token changed
    if (this.socket && this.token !== token) {
      this.disconnect();
    }

    this.token = token;
    const socketUrl = API_CONFIG.BASE_URL || 'https://vpl-liveproject-1.onrender.com';

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      withCredentials: true
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected to server');
      
      // Join with employee ID
      if (empId) {
        this.socket?.emit('join', empId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
      // Re-join with employee ID after reconnection
      if (empId) {
        this.socket?.emit('join', empId);
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.warn('⚠️ Socket reconnection failed, will keep trying');
    });
  }

  joinFinanceDepartment() {
    if (this.socket?.connected) {
      this.socket.emit('join_finance_department');
      console.log('✅ Joined Finance department room');
    } else {
      console.warn('⚠️ Cannot join Finance department: Socket not connected');
    }
  }

  leaveFinanceDepartment() {
    if (this.socket?.connected) {
      this.socket.emit('leave_finance_department');
      console.log('✅ Left Finance department room');
    }
  }

  onPaymentNotification(callback) {
    if (this.socket) {
      this.socket.on('payment_notification', callback);
    }
  }

  offPaymentNotification(callback) {
    if (this.socket) {
      this.socket.off('payment_notification', callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('✅ Socket disconnected');
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();

