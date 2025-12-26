// components/ChatComponent.js
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Send, Paperclip } from 'lucide-react';

const ChatComponent = ({ receiverId, loadId }) => {
  const { socket, sendMessage } = useSocket();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Load existing messages (API call)
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/chats?receiverId=${receiverId}&loadId=${loadId}`);
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [receiverId, loadId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      if (data.senderId === receiverId) {
        setMessages(prev => [...prev, {
          _id: data.chatId,
          sender: data.senderId,
          message: data.message,
          createdAt: data.timestamp,
          isRead: true
        }]);
      }
    };

    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [socket, receiverId]);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessage(receiverId, message, loadId);
    setMessages(prev => [...prev, {
      _id: Date.now(),
      sender: 'me',
      message,
      createdAt: new Date(),
      isRead: true
    }]);
    setMessage('');
  };

  return (
    <div className="flex flex-col h-96 border rounded-lg">
      {/* Chat header */}
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold">Chat</h3>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`mb-3 ${msg.sender === 'me' ? 'text-right' : ''}`}
          >
            <div
              className={`inline-block max-w-xs px-4 py-2 rounded-lg ${
                msg.sender === 'me'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p>{msg.message}</p>
              <p className={`text-xs mt-1 ${
                msg.sender === 'me' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <button type="button" className="p-2 text-gray-500 hover:text-gray-700">
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;