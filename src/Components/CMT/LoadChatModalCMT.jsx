import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { X, Send, MessageCircle, RefreshCw } from 'lucide-react';
import API_CONFIG from '../../config/api.js';

const LoadChatModalCMT = ({ isOpen, onClose, loadId, receiverEmpId, receiverName }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const currentUserEmpId = sessionStorage.getItem('empId') || localStorage.getItem('empId');
  
  // Debug: Log current user and receiver info when modal opens
  useEffect(() => {
    if (isOpen && loadId) {
      console.log('LoadChatModal: Modal opened with context:', {
        currentUserEmpId,
        receiverEmpId,
        receiverName,
        loadId
      });
    }
  }, [isOpen, loadId, currentUserEmpId, receiverEmpId, receiverName]);

  // Scroll to bottom only when new message is added (prevent blinking)
  const prevMessagesLengthRef = useRef(0);
  
  useEffect(() => {
    // Only scroll if a new message was actually added (length increased)
    if (messages.length > prevMessagesLengthRef.current && messages.length > 0) {
      // Use requestAnimationFrame for smoother scroll
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]); // Only depend on length to prevent unnecessary scrolls

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  // Fetch all chat messages for this load - NO POLLING, only called explicitly
  const fetchChatMessages = useCallback(async (isFirstLoad = false) => {
    if (!loadId) {
      return;
    }
    
    const currentInitialLoad = isFirstLoad || isInitialLoadRef.current;
    
    try {
      if (currentInitialLoad) {
        setLoading(true);
        isInitialLoadRef.current = false;
      }
      
      const token = sessionStorage.getItem('authToken') || 
                    localStorage.getItem('authToken') || 
                    sessionStorage.getItem('token') || 
                    localStorage.getItem('token');
      
      if (!token) {
        if (currentInitialLoad) {
          setLoading(false);
        }
        return;
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/load/${loadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('LoadChatModalCMT: Full API response:', response.data);
      console.log('LoadChatModalCMT: Current user:', currentUserEmpId, 'Receiver:', receiverEmpId);
      
      let messagesData = [];
      
      if (response.data && response.data.success) {
        // API response structure: { success: true, messages: [...], total, page, limit }
        messagesData = response.data.messages || [];
        
        console.log('LoadChatModalCMT: Parsed messagesData (before filter):', messagesData);
        console.log('LoadChatModalCMT: Total messages from API:', messagesData.length);
        
        // Filter out any null/undefined messages
        messagesData = messagesData.filter(msg => msg && msg.message);
        
        // IMPORTANT: Filter messages to show only conversation between current user and receiver
        if (currentUserEmpId && receiverEmpId) {
          const currentUserId = String(currentUserEmpId).trim();
          const receiverUserId = String(receiverEmpId).trim();
          
          console.log('LoadChatModalCMT: Filtering with IDs - Current:', currentUserId, 'Receiver:', receiverUserId);
          
          const filteredMessages = messagesData.filter(msg => {
            // Get sender ID from message - check multiple possible fields based on API response
            const msgSenderId = String(
              msg.senderEmpId ||           // Direct field from API
              msg.sender?.empId ||         // From sender object
              msg.sender?._id ||           // Fallback to _id
              (typeof msg.sender === 'string' ? msg.sender : '') || 
              ''
            ).trim();
            
            // Get receiver ID from message
            const msgReceiverId = String(
              msg.receiverEmpId ||         // Direct field from API
              msg.receiver?.empId ||       // From receiver object
              msg.receiver?._id ||         // Fallback to _id
              (typeof msg.receiver === 'string' ? msg.receiver : '') || 
              ''
            ).trim();
            
            // Show message if:
            // 1. Sender is current user (current user's sent messages)
            // 2. Sender is receiver (receiver's sent messages to current user)
            const isSenderCurrentUser = msgSenderId === currentUserId;
            const isSenderReceiver = msgSenderId === receiverUserId;
            
            // Also check direct conversation (both sender and receiver match)
            const isCurrentUserToReceiver = msgSenderId === currentUserId && msgReceiverId === receiverUserId;
            const isReceiverToCurrentUser = msgSenderId === receiverUserId && msgReceiverId === currentUserId;
            
            // Show message if sender is either current user OR receiver
            const shouldShow = isSenderCurrentUser || 
                             isSenderReceiver ||
                             isCurrentUserToReceiver ||
                             isReceiverToCurrentUser;
            
            // Debug log for filtered messages
            if (shouldShow) {
              console.log('LoadChatModalCMT: Message included:', {
                msgSenderId,
                msgReceiverId,
                currentUserId,
                receiverUserId,
                isMyMessage: msg.isMyMessage,
                message: msg.message?.substring(0, 30)
              });
            }
            
            return shouldShow;
          });
          
          console.log('LoadChatModalCMT: Filtered messages count:', filteredMessages.length, 'out of', messagesData.length);
          
          // Use filtered messages if we have any, otherwise show all (fallback)
          if (filteredMessages.length > 0) {
            messagesData = filteredMessages;
            console.log('LoadChatModalCMT: Successfully filtered to conversation messages');
          } else if (messagesData.length > 0) {
            console.warn('LoadChatModalCMT: Filtering removed all messages, showing all messages as fallback');
            // Keep all messages as fallback
          }
        } else {
          console.warn('LoadChatModalCMT: Missing currentUserEmpId or receiverEmpId, showing all messages', {
            currentUserEmpId,
            receiverEmpId
          });
        }
        
        // Sort messages by timestamp (oldest first) to ensure proper chronological order
        messagesData.sort((a, b) => {
          const timeA = new Date(a.timestamp || a.createdAt || a.created_at || 0).getTime();
          const timeB = new Date(b.timestamp || b.createdAt || b.created_at || 0).getTime();
          return timeA - timeB;
        });
        
        console.log('LoadChatModalCMT: Final sorted messages count:', messagesData.length);
        console.log('LoadChatModalCMT: Messages breakdown:', {
          total: messagesData.length,
          myMessages: messagesData.filter(m => m.isMyMessage || String(m.senderEmpId || m.sender?.empId || '').trim() === String(currentUserEmpId || '').trim()).length,
          otherMessages: messagesData.filter(m => !m.isMyMessage && String(m.senderEmpId || m.sender?.empId || '').trim() !== String(currentUserEmpId || '').trim()).length
        });
      }
      
      // Smart update - only update if messages actually changed (prevents blinking)
      setMessages(prevMessages => {
        // Quick check: same length and same IDs means no change
        if (prevMessages.length === messagesData.length && prevMessages.length > 0) {
          // Create simple hash from last message for quick comparison
          const prevLast = prevMessages[prevMessages.length - 1];
          const newLast = messagesData[messagesData.length - 1];
          
          const prevHash = `${prevLast._id || ''}-${prevLast.message || ''}-${prevLast.timestamp || ''}`;
          const newHash = `${newLast._id || ''}-${newLast.message || ''}-${newLast.timestamp || ''}`;
          
          if (prevHash === newHash) {
            // No change detected - return previous to prevent re-render
            return prevMessages;
          }
        }
        
        // Messages changed or first load - update them
        return messagesData;
      });
      
    } catch (error) {
      console.error('LoadChatModalCMT: Error fetching chat messages:', error);
      console.error('LoadChatModalCMT: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        loadId: loadId
      });
      if (currentInitialLoad) {
        setMessages([]);
      }
    } finally {
      if (currentInitialLoad) {
        setLoading(false);
      }
    }
  }, [loadId, currentUserEmpId, receiverEmpId]);

  // Fetch messages ONLY when modal opens or loadId/receiver changes - NO POLLING
  useEffect(() => {
    if (isOpen && loadId && receiverEmpId) {
      // Reset messages and initial load flag when modal opens
      setMessages([]);
      isInitialLoadRef.current = true;
      
      // Initial fetch ONLY when modal opens - no automatic polling
      fetchChatMessages(true);
    } else {
      // Clear messages when modal closes
      setMessages([]);
      isInitialLoadRef.current = true;
    }
  }, [isOpen, loadId, receiverEmpId, fetchChatMessages]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || !receiverEmpId || !loadId || sending) {
      // Cannot send - missing data
      return;
    }

    try {
      setSending(true);
      const token = sessionStorage.getItem('authToken') || 
                    localStorage.getItem('authToken') || 
                    sessionStorage.getItem('token') || 
                    localStorage.getItem('token');
      
      if (!token) {
        console.error('LoadChatModal: No auth token found');
        alert('Authentication required. Please login again.');
        setSending(false);
        return;
      }

      const payload = {
        receiverEmpId: receiverEmpId,
        message: message.trim(),
        loadId: loadId
      };

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/load/send`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('LoadChatModal: Send message response:', response.data);

      // Check if message was sent successfully (handle both success flag and status codes)
      if (response.data && (response.data.success || response.status === 200 || response.status === 201)) {
        const sentMessageText = message.trim();
        setMessage('');
        
        // Optimistically add message to UI immediately (smooth UX, no blinking)
        const optimisticMessage = {
          _id: `temp-${Date.now()}-${Math.random()}`,
          senderEmpId: currentUserEmpId,
          receiverEmpId: receiverEmpId,
          message: sentMessageText,
          timestamp: new Date().toISOString(),
          isOptimistic: true, // Mark as temporary
          isMyMessage: true, // Since current user is sending
          sender: {
            empId: currentUserEmpId,
            employeeName: 'You' // Will be replaced with actual name from server
          }
        };
        
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const alreadyExists = prev.some(m => 
            m.message === sentMessageText && 
            m.senderEmpId === currentUserEmpId &&
            Math.abs(new Date(m.timestamp).getTime() - Date.now()) < 5000
          );
          if (alreadyExists) return prev;
          return [...prev, optimisticMessage];
        });
        
        // Scroll to bottom after adding message
        setTimeout(() => scrollToBottom(), 50);
        
        // Fetch updated messages after sending (to get server-confirmed message and any new ones)
        // Only called after sending message - NO automatic polling
        setTimeout(async () => {
          await fetchChatMessages(false);
        }, 300);
      } else {
        console.error('LoadChatModal: Failed to send message:', response.data?.message);
        alert(response.data?.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Improved function to determine if message is from current user
  const isMessageFromCurrentUser = (msg) => {
    if (!msg) return false;
    
    // First, check if API already provides isMyMessage field (preferred - from API response)
    if (typeof msg.isMyMessage === 'boolean') {
      return msg.isMyMessage;
    }
    
    // Fallback: Check by comparing sender ID with current user
    if (!currentUserEmpId) return false;
    
    // Check multiple possible fields for sender ID based on API response structure
    const senderId = msg.senderEmpId ||           // Direct field from API
                   msg.sender?.empId ||           // From sender object (API response)
                   msg.sender?._id ||             // Fallback to _id
                   msg.sender?.id ||
                   (typeof msg.sender === 'string' ? msg.sender : null);
    
    const finalSenderId = String(senderId || '').trim();
    const currentUserId = String(currentUserEmpId || '').trim();
    
    const isMatch = finalSenderId === currentUserId;
    
    return isMatch;
  };

  // Get sender name for display - using API response structure
  const getSenderName = (msg) => {
    if (!msg) return 'Unknown';
    
    // If message is from current user, show "You"
    if (isMessageFromCurrentUser(msg)) {
      return 'You';
    }
    
    // Otherwise, get sender name from message data using API response structure
    // API provides: senderName, sender.employeeName, receiverName, receiver.employeeName
    return msg.senderName ||                    // Direct field from API
           msg.sender?.employeeName ||          // From sender object
           msg.receiverName ||                  // Fallback to receiver name
           msg.receiver?.employeeName ||
           'User';
  };

  // Get message text - using your API structure
  const getMessageText = (msg) => {
    return msg.message || ''; // Your API always has 'message' field
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <MessageCircle className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Chat</h2>
              <p className="text-sm text-blue-100">{receiverName || 'User'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Manual refresh - only called when user clicks refresh button
                fetchChatMessages(false);
              }}
              className="text-white hover:bg-blue-700 rounded-full p-2 transition-colors"
              title="Refresh messages"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-700 rounded-full p-2 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle size={48} className="text-gray-300 mb-4" />
              <p>No messages yet</p>
              <p className="text-sm">Start a conversation...</p>
            </div>
          ) : (
            <div className="space-y-4" style={{ willChange: 'auto' }}>
              {messages.map((msg, index) => {
                const isCurrentUser = isMessageFromCurrentUser(msg);
                const messageText = getMessageText(msg);
                const senderName = getSenderName(msg);
                
                // Use unique key for messages - use stable key to prevent re-renders
                const msgKey = msg._id || `msg-${msg.timestamp || index}-${isCurrentUser ? 'me' : 'other'}`;
                
                // Skip if no message text (shouldn't happen with your API)
                if (!messageText) return null;
                
                return (
                  <div
                    key={msgKey}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    style={{ animation: 'none' }}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                      style={{ 
                        animation: 'none',
                        transition: 'none'
                      }}
                    >
                      {!isCurrentUser && (
                        <div className="text-xs font-semibold mb-1 text-gray-600">
                          {senderName}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{messageText}</p>
                      <p className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatTime(msg.timestamp || msg.createdAt)}
                        {msg.isOptimistic && ' • Sending...'}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending || !receiverEmpId}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending || !receiverEmpId}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                message.trim() && !sending && receiverEmpId
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send size={18} />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoadChatModalCMT;