import io from 'socket.io-client';
import API_CONFIG from '../config/api';

class GlobalNegotiationSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentUser = null;
    this.joinedBids = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Initialize the global socket connection
  initialize() {
    if (this.socket && this.socket.connected) {
      console.log('Global negotiation socket already connected');
      return;
    }

    const user = this.getCurrentUser();
    if (!user) {
      console.warn('No user data found for global negotiation socket');
      return;
    }

    this.currentUser = user;

    // Get socket URL - Socket.io needs base URL WITHOUT /api/v1
    // Priority: VITE_SOCKET_URL > API_CONFIG.BASE_URL > fallback
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_CONFIG.BASE_URL || 'https://vpl-liveproject-1.onrender.com';

    try {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventListeners();
      console.log('🚀 Global negotiation socket initialized');
    } catch (error) {
      console.error('Failed to initialize global negotiation socket:', error);
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Global negotiation socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Identify user based on type
      if (this.currentUser.userType === 'shipper') {
        this.socket.emit('join_shipper', this.currentUser._id || this.currentUser.userId);
      } else if (this.currentUser.empId) {
        this.socket.emit('join', this.currentUser.empId);
      }

      // Re-join all previously joined bid rooms
      this.joinedBids.forEach(bidId => {
        this.socket.emit('join_bid_negotiation', bidId);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Global negotiation socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Global negotiation socket connection error:', error);
      this.reconnectAttempts++;
    });

    // 🔥 MAIN EVENT: Listen for new negotiation messages globally
    this.socket.on('new_negotiation_message', (data) => {
      console.log('📨 Global negotiation message received:', data);

      // Dispatch global event for all components to listen
      window.dispatchEvent(new CustomEvent('NEGOTIATION_MESSAGE_RECEIVED', {
        detail: {
          bidId: data.bidId,
          loadId: data.loadId || data.bidId,
          rate: data.rate,
          message: data.message,
          senderName: data.senderName,
          timestamp: data.timestamp,
          sender: data.sender,
          isShipper: data.sender === 'shipper',
          type: data.type,
          senderEmpId: data.senderEmpId
        }
      }));

      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Negotiation Message', {
          body: `${data.senderName}: ${data.message || `Rate: $${data.rate}`}`,
          icon: '/logo_vpower.png'
        });
      }
    });
  }

  // Join a bid negotiation room
  joinBidNegotiation(bidId) {
    if (!this.socket || !bidId) return;

    this.socket.emit('join_bid_negotiation', bidId);
    this.joinedBids.add(bidId);
    console.log(`🔗 Joined bid negotiation room: ${bidId}`);
  }

  // Leave a bid negotiation room
  leaveBidNegotiation(bidId) {
    if (!this.socket || !bidId) return;

    this.socket.emit('leave_bid_negotiation', bidId);
    this.joinedBids.delete(bidId);
    console.log(`🔌 Left bid negotiation room: ${bidId}`);
  }

  // Join multiple bid rooms (useful for CMT users with multiple assigned loads)
  joinMultipleBids(bidIds) {
    if (!Array.isArray(bidIds)) return;

    bidIds.forEach(bidId => {
      if (bidId) {
        this.joinBidNegotiation(bidId);
      }
    });
  }

  // Get current user data
  getCurrentUser() {
    const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userString) return null;
    
    try {
      return JSON.parse(userString);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  // Check if socket is connected
  isSocketConnected() {
    return this.socket && this.socket.connected && this.isConnected;
  }

  // Disconnect the socket
  disconnect() {
    if (this.socket) {
      this.joinedBids.clear();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentUser = null;
      console.log('🔌 Global negotiation socket disconnected');
    }
  }

  // Reconnect the socket
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.initialize();
    }
  }

  // Auto-join user's assigned bids (for CMT users)
  async autoJoinAssignedBids() {
    try {
      const user = this.getCurrentUser();
      if (!user || !user.empId) return;

      const token = localStorage.getItem('authToken') || 
                    sessionStorage.getItem('authToken') || 
                    localStorage.getItem('token') || 
                    sessionStorage.getItem('token');

      if (!token) return;

      // Fetch assigned loads for CMT users
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/v1/bid/cmt-assigned-loads/${user.empId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.assignedLoads) {
          const bidIds = data.data.assignedLoads
            .map(load => load._id)
            .filter(id => id);

          if (bidIds.length > 0) {
            console.log(`🎯 Auto-joining ${bidIds.length} assigned bid negotiations`);
            this.joinMultipleBids(bidIds);
          }
        }
      }
    } catch (error) {
      console.error('Error auto-joining assigned bids:', error);
    }
  }

  // Request browser notification permission
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }
}

// Create singleton instance
const globalNegotiationSocketService = new GlobalNegotiationSocketService();

export default globalNegotiationSocketService;