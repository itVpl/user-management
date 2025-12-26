import React, { useState, useEffect } from 'react';
import globalNegotiationService from '../services/globalNegotiationService';

const GlobalNegotiationStatus = () => {
  const [status, setStatus] = useState(globalNegotiationService.getStatus());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(globalNegotiationService.getStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
          status.isPolling 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
      >
        🌐 Global Negotiation {status.isPolling ? 'ON' : 'OFF'}
      </button>
      
      {isVisible && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={status.isPolling ? 'text-green-600' : 'text-red-600'}>
                {status.isPolling ? 'Polling' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Processed:</span>
              <span>{status.processedCount} messages</span>
            </div>
            <div className="flex justify-between">
              <span>Last Poll:</span>
              <span>{new Date(status.lastPollTime).toLocaleTimeString()}</span>
            </div>
          </div>
          
          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
            <button
              onClick={() => {
                if (status.isPolling) {
                  globalNegotiationService.stopPolling();
                } else {
                  globalNegotiationService.startPolling();
                }
              }}
              className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
            >
              {status.isPolling ? 'Stop' : 'Start'} Polling
            </button>
            
            <button
              onClick={() => globalNegotiationService.clearProcessedMessages()}
              className="w-full px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs"
            >
              Clear Processed
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalNegotiationStatus;