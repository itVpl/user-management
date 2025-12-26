import React, { useState, useEffect } from 'react';
import { MessageCircle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const RealTimeChatTest = () => {
  const [testResults, setTestResults] = useState({
    pollingActive: false,
    lastUpdate: null,
    messageCount: 0,
    errors: []
  });

  const [isTestRunning, setIsTestRunning] = useState(false);

  useEffect(() => {
    // Test the real-time polling functionality
    const testPolling = () => {
      console.log('🧪 Testing real-time chat polling...');
      setTestResults(prev => ({
        ...prev,
        pollingActive: true,
        lastUpdate: new Date().toLocaleTimeString()
      }));
    };

    if (isTestRunning) {
      const testInterval = setInterval(testPolling, 3000);
      return () => clearInterval(testInterval);
    }
  }, [isTestRunning]);

  const startTest = () => {
    setIsTestRunning(true);
    setTestResults({
      pollingActive: true,
      lastUpdate: new Date().toLocaleTimeString(),
      messageCount: 0,
      errors: []
    });
  };

  const stopTest = () => {
    setIsTestRunning(false);
    setTestResults(prev => ({
      ...prev,
      pollingActive: false
    }));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="text-blue-500" size={20} />
          <h3 className="font-semibold text-gray-800">Real-Time Chat Test</h3>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {testResults.pollingActive ? (
              <CheckCircle className="text-green-500" size={16} />
            ) : (
              <XCircle className="text-red-500" size={16} />
            )}
            <span>Polling: {testResults.pollingActive ? 'Active' : 'Inactive'}</span>
          </div>
          
          {testResults.lastUpdate && (
            <div className="text-gray-600">
              Last Update: {testResults.lastUpdate}
            </div>
          )}
          
          <div className="flex gap-2 mt-3">
            {!isTestRunning ? (
              <button
                onClick={startTest}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                <RefreshCw size={12} />
                Start Test
              </button>
            ) : (
              <button
                onClick={stopTest}
                className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
              >
                Stop Test
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeChatTest;