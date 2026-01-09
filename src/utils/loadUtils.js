// Utility functions for fetching load details
import API_CONFIG from '../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api/v1`;

// Get authentication token
const getAuthToken = () => {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
};

// Fetch load details by load ID
export const fetchLoadDetails = async (loadId) => {
  if (!loadId) return null;

  const token = getAuthToken();
  if (!token) return null;

  try {
    // Try multiple API endpoints to get load details
    const endpoints = [
      `${API_BASE_URL}/load/${loadId}`,
      `${API_BASE_URL}/bid/${loadId}`,
      `${API_BASE_URL}/loads/${loadId}`,
      `${API_BASE_URL}/load/details/${loadId}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (response.ok) {
          const data = await response.json();
          
          // Extract load data from different response structures
          let loadData = null;
          if (data.success && data.data) {
            loadData = data.data;
          } else if (data.load) {
            loadData = data.load;
          } else if (data.loads && data.loads[0]) {
            loadData = data.loads[0];
          } else if (data._id) {
            loadData = data;
          }

          if (loadData) {
            return {
              originAddress: loadData.origin?.address || loadData.pickupLocation || loadData.from,
              destinationAddress: loadData.destination?.address || loadData.dropLocation || loadData.to,
              originCity: loadData.origin?.city,
              destinationCity: loadData.destination?.city,
              originState: loadData.origin?.state,
              destinationState: loadData.destination?.state,
              rate: loadData.rate,
              loadId: loadData._id || loadData.loadId
            };
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${endpoint}:`, error);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching load details:', error);
    return null;
  }
};

// Fetch load details with bid information
export const fetchBidLoadDetails = async (bidId) => {
  if (!bidId) return null;

  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/bid/${bidId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.data) {
        const bid = data.data;
        const load = bid.load || bid.loadId;
        
        if (load) {
          return {
            originAddress: load.origin?.address || load.pickupLocation || load.from,
            destinationAddress: load.destination?.address || load.dropLocation || load.to,
            originCity: load.origin?.city,
            destinationCity: load.destination?.city,
            originState: load.origin?.state,
            destinationState: load.destination?.state,
            rate: bid.rate || load.rate,
            loadId: load._id || load.loadId,
            bidId: bid._id
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching bid load details:', error);
    return null;
  }
};

// Enhanced function that tries both load and bid APIs
export const fetchLoadAddresses = async (loadId, bidId = null) => {
  // Try bid API first if bidId is provided
  if (bidId) {
    const bidDetails = await fetchBidLoadDetails(bidId);
    if (bidDetails) return bidDetails;
  }

  // Try load API
  const loadDetails = await fetchLoadDetails(loadId);
  if (loadDetails) return loadDetails;

  // If both fail, try using bidId as loadId
  if (bidId && bidId !== loadId) {
    const fallbackDetails = await fetchLoadDetails(bidId);
    if (fallbackDetails) return fallbackDetails;
  }

  return null;
};