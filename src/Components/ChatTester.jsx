import React, { useState } from 'react';

const ChatTester = () => {
  const [testResults, setTestResults] = useState([]);

  const addResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { message, type, timestamp }]);
  };

  const testChatAPI = async () => {
    addResult('🧪 Testing Chat API...', 'info');
    
    try {
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      if (!token) {
        addResult('❌ No auth token found', 'error');
        return;
      }

      // Test load ID (you can change this)
      const testLoadId = 'L-12345';
      
      const response = await fetch(`https://vpl-liveproject-1.onrender.com/api/v1/chat/public/load/${testLoadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        addResult(`✅ API Response: ${JSON.stringify(data).substring(0, 100)}...`, 'success');
      } else {
        addResult(`❌ API Error: ${data.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      addResult(`❌ Network Error: ${error.message}`, 'error');
    }
  };

  const testSendMessage = async () => {
    addResult('📤 Testing Send Message...', 'info');
    
    try {
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      if (!token) {
        addResult('❌ No auth token found', 'error');
        return;
      }

      const testData = {
        receiverEmpId: 'test-receiver',
        message: `Test message at ${new Date().toLocaleTimeString()}`,
        loadId: 'L-12345'
      };

      const response = await fetch('https://vpl-liveproject-1.onrender.com/api/v1/chat/load/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      
      if (response.ok) {
        addResult(`✅ Message Sent: ${JSON.stringify(data).substring(0, 100)}...`, 'success');
      } else {
        addResult(`❌ Send Error: ${data.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      addResult(`❌ Send Network Error: ${error.message}`, 'error');
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-bold text-sm mb-3">Chat API Tester</h3>
      
      <div className="flex gap-2 mb-3">
        <button
          onClick={testChatAPI}
          className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
        >
          Test Get Messages
        </button>
        <button
          onClick={testSendMessage}
          className="bg-green-500 text-white px-3 py-1 rounded text-xs"
        >
          Test Send Message
        </button>
        <button
          onClick={() => setTestResults([])}
          className="bg-gray-500 text-white px-3 py-1 rounded text-xs"
        >
          Clear
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto">
        <div className="text-xs font-semibold mb-2">Results ({testResults.length}):</div>
        {testResults.map((result, index) => (
          <div 
            key={index} 
            className={`text-xs p-2 rounded mb-1 ${
              result.type === 'success' ? 'bg-green-100 text-green-800' :
              result.type === 'error' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}
          >
            <div className="font-semibold">{result.timestamp}</div>
            <div>{result.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatTester;