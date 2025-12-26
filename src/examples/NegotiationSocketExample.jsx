import React, { useEffect, useState } from 'react';
import { useNegotiationSocket } from '../hooks/useNegotiationSocket';
import axios from 'axios';
import API_CONFIG from '../config/api';

const NegotiationSocketExample = ({ bidId }) => {
  const [negotiationData, setNegotiationData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get current user
  const getCurrentUser = () => {
    const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userString) return null;
    
    try {
      return JSON.parse(userString);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const user = getCurrentUser();

  // 🔥 Use the negotiation socket hook
  const { 
    isConnected, 
    newMessage, 
    notifications, 
    refreshNegotiation,
    clearNotifications 
  } = useNegotiationSocket(user, bidId);

  // Fetch negotiation thread from API
  const fetchNegotiationThread = async () => {
    try {
      const token = localStorage.getItem('authToken') || 
                    sessionStorage.getItem('authToken') || 
                    localStorage.getItem('token') || 
                    sessionStorage.getItem('token');

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/bid/${bidId}/internal-negotiation-thread`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setNegotiationData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching negotiation thread:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (bidId) {
      fetchNegotiationThread();
    }
  }, [bidId]);

  // 🔥 Refresh when new message arrives
  useEffect(() => {
    if (newMessage) {
      console.log('📨 New message received, refreshing thread...');
      fetchNegotiationThread(); // Refresh the thread
      refreshNegotiation();      // Clear the newMessage flag
    }
  }, [newMessage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading negotiation thread...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Connection Status */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">
              {isConnected ? '🟢 Connected to negotiation updates' : '🔴 Disconnected'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Bid ID: {bidId}
          </div>
        </div>
      </div>

      {/* Real-time Notifications */}
      {notifications.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Recent Notifications</h3>
            <button
              onClick={clearNotifications}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg border-l-4 ${
                  notif.isShipper ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    {notif.sender} {notif.isShipper ? '(Shipper)' : '(Internal)'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  {notif.message}
                </div>
                {notif.rate && (
                  <div className="text-sm font-medium text-green-600 mt-1">
                    Rate: ${notif.rate.toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negotiation Thread */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Negotiation Thread</h2>
        
        {negotiationData?.internalNegotiation?.history?.length > 0 ? (
          <div className="space-y-4">
            {negotiationData.internalNegotiation.history.map((entry, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  entry.by === 'shipper' 
                    ? 'bg-green-50 border-l-4 border-green-500' 
                    : 'bg-blue-50 border-l-4 border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">
                    {entry.by === 'shipper' ? '👤 Shipper' : '🏢 Sales Team'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(entry.at).toLocaleString()}
                  </div>
                </div>
                
                <div className="text-lg font-bold text-green-600 mb-2">
                  Rate: ${entry.rate?.toLocaleString()}
                </div>
                
                {entry.message && (
                  <div className="text-gray-700 bg-white p-3 rounded">
                    {entry.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">💬</div>
            <p>No negotiation messages yet</p>
          </div>
        )}
      </div>

      {/* Debug Info (Development only) */}
      {import.meta.env.DEV && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info</h3>
          <div className="text-sm space-y-1">
            <div>Socket Connected: {isConnected ? 'Yes' : 'No'}</div>
            <div>User: {user?.employeeName || user?.name || 'Unknown'}</div>
            <div>User Type: {user?.userType || 'Employee'}</div>
            <div>Emp ID: {user?.empId || 'N/A'}</div>
            <div>Notifications: {notifications.length}</div>
            <div>New Message: {newMessage ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NegotiationSocketExample;