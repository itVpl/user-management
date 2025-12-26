import { useState } from 'react';
import { useChatMessages } from '../contexts/ChatMessageContext';

/**
 * Test component to simulate incoming chat messages
 * This is for testing purposes only - remove in production
 */
function TestChatPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const { messages, isSocketConnected } = useChatMessages();

  // Simulate receiving a message (for testing)
  const simulateMessage = () => {
    // Create a custom event to simulate socket message
    const mockMessage = {
      id: `test_${Date.now()}`,
      senderId: 'test_user_123',
      senderName: 'Test User',
      senderAvatar: null,
      message: 'This is a test message to verify the popup system works!',
      chatId: 'test_chat_456',
      chatType: 'private',
      timestamp: new Date().toISOString()
    };

    // Dispatch custom event that the context will pick up
    window.dispatchEvent(new CustomEvent('test_message', { 
      detail: mockMessage 
    }));
  };

  const simulateGroupMessage = () => {
    const mockMessage = {
      id: `test_group_${Date.now()}`,
      senderId: 'test_user_789',
      senderName: 'Jane Doe',
      senderAvatar: null,
      message: 'Hey everyone! This is a group message test.',
      chatId: 'test_group_123',
      chatType: 'group',
      groupName: 'Test Group Chat',
      timestamp: new Date().toISOString()
    };

    window.dispatchEvent(new CustomEvent('test_message', { 
      detail: mockMessage 
    }));
  };

  const simulateMultipleMessages = () => {
    const messages = [
      {
        id: `test_multi_1_${Date.now()}`,
        senderId: 'user_1',
        senderName: 'Alice',
        message: 'First message in the queue',
        chatType: 'private',
        timestamp: new Date().toISOString()
      },
      {
        id: `test_multi_2_${Date.now()}`,
        senderId: 'user_2',
        senderName: 'Bob',
        message: 'Second message - testing queue',
        chatType: 'private',
        timestamp: new Date().toISOString()
      },
      {
        id: `test_multi_3_${Date.now()}`,
        senderId: 'user_3',
        senderName: 'Charlie',
        message: 'Third message with a much longer text to test how the popup handles longer messages that might wrap to multiple lines',
        chatType: 'group',
        groupName: 'Dev Team',
        timestamp: new Date().toISOString()
      }
    ];

    messages.forEach((msg, index) => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('test_message', { 
          detail: msg 
        }));
      }, index * 1000); // Stagger messages by 1 second
    });
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors z-50"
      >
        🧪 Test Chat Popups
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 min-w-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Chat Popup Tester</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <span>Socket Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              isSocketConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isSocketConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="mt-1">
            Active Popups: {messages.length}
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={simulateMessage}
            className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Test Private Message
          </button>

          <button
            onClick={simulateGroupMessage}
            className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 transition-colors"
          >
            Test Group Message
          </button>

          <button
            onClick={simulateMultipleMessages}
            className="w-full bg-orange-500 text-white px-3 py-2 rounded text-sm hover:bg-orange-600 transition-colors"
          >
            Test Multiple Messages
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded">
          <strong>Note:</strong> This is a test component. Remove in production.
          Click buttons to simulate incoming messages and test the popup system.
        </div>
      </div>
    </div>
  );
}

export default TestChatPopup;