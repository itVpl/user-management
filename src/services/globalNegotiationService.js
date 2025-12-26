import axios from 'axios';
import API_CONFIG from '../config/api.js';

class GlobalNegotiationService {
  constructor() {
    this.isPolling = false;
    this.pollInterval = null;
    this.processedMessageIds = new Set();
    this.lastPollTime = Date.now();
    this.eventListeners = [];
  }

  // Get current user info
  getCurrentUser() {
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
  }

  // Get user's assigned loads/bids
  async getUserItems() {
    try {
      const userInfo = this.getCurrentUser();
      if (!userInfo) return [];

      const { token, empId, userData } = userInfo;
      let items = [];

      // Determine user department and fetch appropriate data
      const userDepartment = userData?.department?.name?.toLowerCase() || userData?.department?.toLowerCase() || '';
      
      if (userDepartment.includes('sales')) {
        // Fetch Sales Loads
        try {
          const salesResponse = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/load/filter-by-customer-added-by`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (salesResponse.data && (salesResponse.data.loads || salesResponse.data.data)) {
            const loads = salesResponse.data.loads || salesResponse.data.data || [];
            items = loads.map(l => ({ 
              loadId: l._id || l.loadId, 
              bidId: null
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

      return items;
    } catch (error) {
      console.error('Error fetching user items:', error);
      return [];
    }
  }

  // Check for new negotiation messages
  async checkForNewNegotiationMessages() {
    try {
      const userInfo = this.getCurrentUser();
      if (!userInfo) return;

      const { token } = userInfo;
      const items = await this.getUserItems();
      
      if (items.length === 0) return;

      console.log('🔍 Global polling: Checking for new negotiation messages...');

      // Check internal negotiation threads for each bid
      await Promise.all(items.map(async (item) => {
        if (!item.bidId) return; // Skip if no bidId

        try {
          const negotiationResponse = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/bid/${item.bidId}/internal-negotiation-thread`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (negotiationResponse.data?.success && negotiationResponse.data?.data?.internalNegotiation?.history) {
            const history = negotiationResponse.data.data.internalNegotiation.history;
            
            // Filter incoming negotiation messages (from shipper to inhouse/CMT)
            const incomingNegotiations = history.filter(msg => msg.by === 'shipper');

            incomingNegotiations.forEach(msg => {
              // Only process messages that are newer than our last poll and not already processed
              const messageTime = new Date(msg.at).getTime();
              
              if (!this.processedMessageIds.has(msg._id) && messageTime > this.lastPollTime - 60000) { // 1 minute buffer
                console.log('🆕 New negotiation message detected:', {
                  bidId: item.bidId,
                  loadId: item.loadId,
                  messageId: msg._id,
                  rate: msg.rate,
                  message: msg.message
                });

                // Dispatch global event for the new message
                this.dispatchNegotiationEvent({
                  bidId: item.bidId,
                  loadId: item.loadId,
                  rate: msg.rate,
                  message: msg.message,
                  senderName: 'Shipper',
                  timestamp: msg.at,
                  messageId: msg._id,
                  // Add origin and destination addresses from load data
                  originAddress: item.load?.origin?.address,
                  destinationAddress: item.load?.destination?.address,
                  pickupLocation: item.load?.origin?.address,
                  dropLocation: item.load?.destination?.address
                });

                // Mark as processed
                this.processedMessageIds.add(msg._id);
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching negotiation for bid ${item.bidId}:`, error);
        }
      }));

      // Update last poll time
      this.lastPollTime = Date.now();

    } catch (error) {
      console.error('Error in global negotiation polling:', error);
    }
  }

  // Dispatch negotiation event
  dispatchNegotiationEvent(data) {
    const event = new CustomEvent('NEGOTIATION_MESSAGE_RECEIVED', {
      detail: data
    });
    
    window.dispatchEvent(event);
    
    // Also notify any registered listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in negotiation event listener:', error);
      }
    });
  }

  // Start global polling - increased default interval to prevent 429 errors
  startPolling(intervalMs = 60000) { // 60 seconds default (was 20s)
    if (this.isPolling) {
      console.log('🔄 Global negotiation polling already running');
      return;
    }

    console.log('🚀 Starting global negotiation polling...');
    this.isPolling = true;
    this.lastPollTime = Date.now();

    // Initial check
    this.checkForNewNegotiationMessages();

    // Set up interval
    this.pollInterval = setInterval(() => {
      this.checkForNewNegotiationMessages();
    }, intervalMs);
  }

  // Stop global polling
  stopPolling() {
    if (!this.isPolling) return;

    console.log('🛑 Stopping global negotiation polling');
    this.isPolling = false;
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Add event listener
  addEventListener(listener) {
    this.eventListeners.push(listener);
  }

  // Remove event listener
  removeEventListener(listener) {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  // Clear processed messages (useful for testing or reset)
  clearProcessedMessages() {
    this.processedMessageIds.clear();
    console.log('🧹 Cleared processed message IDs');
  }

  // Get status
  getStatus() {
    return {
      isPolling: this.isPolling,
      processedCount: this.processedMessageIds.size,
      lastPollTime: this.lastPollTime
    };
  }
}

// Create singleton instance
const globalNegotiationService = new GlobalNegotiationService();

export default globalNegotiationService;