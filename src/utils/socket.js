import { io } from 'socket.io-client';
import API_CONFIG from '../config/api.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.token = null;
  }

  connect(token, empId) {
    if (this.socket?.connected) {
      return; // Already connected
    }

    this.token = token;
    const socketUrl = API_CONFIG.BASE_URL || 'https://vpl-liveproject-1.onrender.com';

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      withCredentials: true
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected to server');
      
      // Join with employee ID
      if (empId) {
        this.socket?.emit('join', empId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
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

