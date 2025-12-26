import React, { useState, useEffect } from 'react';
import globalNegotiationSocketService from '../services/globalNegotiationSocketService';

const NegotiationSocketTester = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [joinedBids, setJoinedBids] = useState([]);
  const [testBidId, setTestBidId] = useState('');
  const [receivedMessages, setReceivedMessages] = useState([]);

  useEffect(() => {
    // Check connection status
    const checkConnection = () => {
      setIsConnected(globalNegotiationSocketService.isSocketConnected());
    };

    // Listen for negotiation messages
    const handleNegotiationMessage = (event) => {
      const message = event.detail;
      setReceivedMessages(prev => [message, ...prev.slice(0, 9)]); // Keep last 10
    };

    // Set up listeners
    window.addEventListener('NEGOTIATION_MESSAGE_RECEIVED', handleNegotiationMessage);
    
    // Check connection every second
    const interval = setInterval(checkConnection, 1000);

    return () => {
      window.removeEventListener('NEGOTIATION_MESSAGE_RECEIVED', handleNegotiationMessage);
      clearInterval(interval);
    };
  }, []);

  const handleJoinBid = () => {
    if (testBidId.trim()) {
      globalNegotiationSocketService.joinBidNegotiation(testBidId.trim());
      setJoinedBids(prev => [...new Set([...prev, testBidId.trim()])]);
      setTestBidId('');
    }
  };

  const handleLeaveBid = (bidId) => {
    globalNegotiationSocketService.leaveBidNegotiation(bidId);
    setJoinedBids(prev => prev.filter(id => id !== bidId));
  };

  const handleInitialize = () => {
    globalNegotiationSocketService.initialize();
  };

  const handleDisconnect = () => {
    globalNegotiationSocketService.disconnect();
    setJoinedBids([]);
  };

  const handleAutoJoin = () => {
    globalNegotiationSocketService.autoJoinAssignedBids();
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-md z-50 border">
      <div className="mb-4">
        <h3 className="font-bold text-lg mb-2">🔌 Negotiation Socket Tester</h3>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Controls */}
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <button
              onClick={handleInitialize}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Initialize
            </button>
            <button
              onClick={handleDisconnect}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Disconnect
            </button>
            <button
              onClick={handleAutoJoin}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Auto Join
            </button>
          </div>
        </div>

        {/* Join Bid */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={testBidId}
              onChange={(e) => setTestBidId(e.target.value)}
              placeholder="Enter Bid ID"
              className="flex-1 px-2 py-1 border rounded text-sm"
            />
            <button
              onClick={handleJoinBid}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
            >
              Join
            </button>
          </div>
        </div>

        {/* Joined Bids */}
        {joinedBids.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Joined Bids:</div>
            <div className="space-y-1">
              {joinedBids.map(bidId => (
                <div key={bidId} className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded text-sm">
                  <span>{bidId}</span>
                  <button
                    onClick={() => handleLeaveBid(bidId)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Leave
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Received Messages */}
        {receivedMessages.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Recent Messages:</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {receivedMessages.map((msg, index) => (
                <div key={index} className="bg-green-50 p-2 rounded text-xs">
                  <div className="font-medium">Bid: {msg.bidId}</div>
                  <div>From: {msg.senderName}</div>
                  {msg.rate && <div>Rate: ${msg.rate.toLocaleString()}</div>}
                  {msg.message && <div className="text-gray-600">{msg.message.substring(0, 50)}...</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NegotiationSocketTester;