import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useChatMessages } from '../contexts/ChatMessageContext';
import { useChatIntegration } from '../hooks/useChatIntegration';
import socketService from '../services/socketService';

/**
 * Example of how to integrate the chat message popup system with your existing Chat component
 * This shows the patterns you should follow in your actual Chat.jsx component
 */
function ChatIntegrationExample() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use the chat integration hook
  const { openChat, closeChat, extractChatParams } = useChatIntegration();
  
  // Use the chat messages context
  const { 
    isSocketConnected, 
    setCurrentChat: setGlobalCurrentChat 
  } = useChatMessages();

  // Initialize socket connection when component mounts
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const socket = socketService.connectWithAuth();
        if (socket) {
          console.log('Chat component: Socket connected');
          
          // Listen for real-time messages in this chat
          socketService.on('new_message', handleRealTimeMessage);
          socketService.on('private_message', handleRealTimeMessage);
          socketService.on('message_received', handleRealTimeMessage);
        }
      } catch (error) {
        console.error('Failed to initialize socket in chat component:', error);
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      socketService.off('new_message', handleRealTimeMessage);
      socketService.off('private_message', handleRealTimeMessage);
      socketService.off('message_received', handleRealTimeMessage);
    };
  }, []);

  // Handle real-time messages received in this chat
  const handleRealTimeMessage = (messageData) => {
    const { chatId, userId } = extractChatParams();
    const messageChatId = messageData.chatId || messageData.conversationId;
    const messageSenderId = messageData.senderId || messageData.sender?.id;

    // If message belongs to current chat, add it to local messages
    if (
      (chatId && messageChatId === chatId) ||
      (userId && messageSenderId === userId)
    ) {
      setMessages(prevMessages => {
        // Prevent duplicates
        const messageExists = prevMessages.some(msg => 
          msg.id === messageData.id || msg._id === messageData._id
        );
        if (messageExists) return prevMessages;

        return [...prevMessages, messageData];
      });
    }
  };

  // Load chat when URL parameters change
  useEffect(() => {
    const loadChat = async () => {
      const { chatId, userId, chatType } = extractChatParams();
      
      if (!chatId && !userId) {
        setCurrentChat(null);
        setMessages([]);
        closeChat();
        return;
      }

      setIsLoading(true);
      
      try {
        // Set the current chat in global context (prevents popups for this chat)
        setGlobalCurrentChat(chatId, userId);
        
        // Load chat messages from your API
        const chatData = await loadChatMessages(chatId, userId, chatType);
        setCurrentChat(chatData);
        setMessages(chatData.messages || []);
        
        // Join socket room for real-time updates
        if (socketService.isSocketConnected()) {
          const roomId = chatId || `private_${userId}`;
          socketService.joinRoom(roomId, { chatType });
        }
        
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChat();
  }, [location.search, extractChatParams, setGlobalCurrentChat, closeChat]);

  // Mock function - replace with your actual API call
  const loadChatMessages = async (chatId, userId, chatType) => {
    // This is where you'd make your actual API call
    // Example:
    // const response = await fetch(`/api/chats/${chatId || userId}`);
    // return response.json();
    
    return {
      id: chatId || userId,
      type: chatType,
      messages: [
        {
          id: '1',
          senderId: userId,
          senderName: 'John Doe',
          message: 'Hello! This is a sample message.',
          timestamp: new Date().toISOString()
        }
      ]
    };
  };

  // Send message function
  const sendMessage = async (messageText) => {
    const { chatId, userId, chatType } = extractChatParams();
    
    if (!messageText.trim()) return;

    const messageData = {
      id: `temp_${Date.now()}`,
      message: messageText,
      chatId: chatId,
      recipientId: userId,
      chatType: chatType,
      timestamp: new Date().toISOString()
    };

    try {
      // Add message to local state immediately (optimistic update)
      setMessages(prev => [...prev, messageData]);

      // Send via socket
      if (socketService.isSocketConnected()) {
        if (chatType === 'private' && userId) {
          socketService.sendPrivateMessage(userId, messageText, {
            chatId: chatId,
            chatType: chatType
          });
        } else {
          socketService.sendMessage(messageData);
        }
      }

      // Also send via HTTP API as backup
      // await fetch('/api/messages', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(messageData)
      // });

    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove message from local state if sending failed
      setMessages(prev => prev.filter(msg => msg.id !== messageData.id));
    }
  };

  // Handle clicking on a message popup (when user clicks popup from another chat)
  useEffect(() => {
    // Listen for navigation from message popups
    const handlePopupNavigation = () => {
      // This will be handled automatically by the URL change
      // The useEffect above will load the new chat
    };

    // You can add additional logic here if needed
    return () => {
      // Cleanup
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading chat...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold">
              {currentChat?.name || 'Chat'}
            </h2>
            {isSocketConnected && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Online
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id || message._id}
            className={`flex ${
              message.isOwn ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.isOwn
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p className="text-sm">{message.message}</p>
              <p className="text-xs mt-1 opacity-75">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendMessage(e.target.value);
                e.target.value = '';
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = e.target.previousElementSibling;
              sendMessage(input.value);
              input.value = '';
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatIntegrationExample;