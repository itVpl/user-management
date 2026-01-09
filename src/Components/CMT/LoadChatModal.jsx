import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { X, Send, MessageCircle, RefreshCw, User, Paperclip, Image, Mic } from 'lucide-react';
import API_CONFIG from '../../config/api.js';

const LoadChatModal = ({ isOpen, onClose, loadId, receiverEmpId, receiverName }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const pollingIntervalRef = useRef(null);
  const lastFetchTimeRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  
  const currentUserEmpId = sessionStorage.getItem('empId') || localStorage.getItem('empId');
  
  useEffect(() => {
    if (isOpen && loadId) {

    }
  }, [isOpen, loadId, currentUserEmpId, receiverEmpId, receiverName]);

  const prevMessagesLengthRef = useRef(0);
  
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && messages.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  // Start polling when modal opens
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Poll every 5 seconds for real-time updates (reduced from 2s to prevent 429 errors)
    pollingIntervalRef.current = setInterval(() => {
      if (isOpen && loadId) {
        fetchChatMessages(false, true); // Silent background fetch
      }
    }, 5000);
  }, [isOpen, loadId]);

  // Stop polling when modal closes
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const fetchChatMessages = useCallback(async (isFirstLoad = false, isBackgroundFetch = false) => {
    if (!loadId) {
      return;
    }
    
    const currentInitialLoad = isFirstLoad || isInitialLoadRef.current;
    
    try {
      if (currentInitialLoad && !isBackgroundFetch) {
        setLoading(true);
        isInitialLoadRef.current = false;
      }
      
      const token = sessionStorage.getItem('authToken') || 
                    localStorage.getItem('authToken') || 
                    sessionStorage.getItem('token') || 
                    localStorage.getItem('token');
      
      if (!token) {
        if (currentInitialLoad && !isBackgroundFetch) {
          setLoading(false);
        }
        return;
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/public/load/${loadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: isBackgroundFetch ? {
            lastUpdate: lastFetchTimeRef.current
          } : {}
        }
      );

      let messagesData = [];
      
      if (response.data) {
        if (response.data.success) {
          messagesData = response.data.data || response.data.messages || [];
        } else {
          if (Array.isArray(response.data)) {
            messagesData = response.data;
          } else if (Array.isArray(response.data.data)) {
            messagesData = response.data.data;
          } else if (Array.isArray(response.data.messages)) {
            messagesData = response.data.messages;
          }
        }
      }
      
      if (!Array.isArray(messagesData)) {
        messagesData = [];
      }
      
      messagesData = messagesData.filter(msg => msg && (msg.message || msg.text || msg.content));
      
      // Update last fetch time
      lastFetchTimeRef.current = Date.now();
      
      messagesData.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || b.created_at || 0).getTime();
        return timeA - timeB;
      });
      
      setMessages(prevMessages => {
        // If no new messages and this is background fetch, don't update
        if (isBackgroundFetch && prevMessages.length === messagesData.length && prevMessages.length > 0) {
          const prevLast = prevMessages[prevMessages.length - 1];
          const newLast = messagesData[messagesData.length - 1];
          
          const prevHash = `${prevLast._id || prevLast.id || ''}-${prevLast.message || ''}-${prevLast.createdAt || prevLast.timestamp || ''}`;
          const newHash = `${newLast._id || newLast.id || ''}-${newLast.message || ''}-${newLast.createdAt || newLast.timestamp || ''}`;
          
          if (prevHash === newHash) {
            return prevMessages;
          }
        }
        
        return messagesData;
      });
      
    } catch (error) {
      console.error('LoadChatModal: Error fetching chat messages:', error);
      if (currentInitialLoad && !isBackgroundFetch) {
        setMessages([]);
      }
    } finally {
      if (currentInitialLoad && !isBackgroundFetch) {
        setLoading(false);
      }
    }
  }, [loadId, currentUserEmpId, receiverEmpId]);

  useEffect(() => {
    if (isOpen && loadId) {
      setMessages([]);
      isInitialLoadRef.current = true;
      lastFetchTimeRef.current = null;
      fetchChatMessages(true);
      startPolling();
    } else {
      setMessages([]);
      isInitialLoadRef.current = true;
      lastFetchTimeRef.current = null;
      stopPolling();
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [isOpen, loadId, fetchChatMessages, startPolling]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || !receiverEmpId || !loadId || sending) {
      return;
    }

    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage = {
      _id: tempMessageId,
      senderEmpId: currentUserEmpId,
      receiverEmpId: receiverEmpId,
      message: message.trim(),
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      isOptimistic: true,
      sender: { 
        empId: currentUserEmpId, 
        employeeName: 'You' 
      }
    };

    try {
      setSending(true);
      
      // Immediately add optimistic message
      setMessages(prev => {
        const alreadyExists = prev.some(m => 
          m._id === tempMessageId || 
          (m.message === message.trim() && 
           m.senderEmpId === currentUserEmpId &&
           Math.abs(new Date(m.createdAt || m.timestamp).getTime() - Date.now()) < 5000)
        );
        if (alreadyExists) return prev;
        return [...prev, optimisticMessage];
      });
      
      setMessage('');
      setTimeout(() => scrollToBottom(), 50);

      const token = sessionStorage.getItem('authToken') || 
                    localStorage.getItem('authToken') || 
                    sessionStorage.getItem('token') || 
                    localStorage.getItem('token');
      
      if (!token) {
        console.error('LoadChatModal: No auth token found');
        // Remove optimistic message if no token
        setMessages(prev => prev.filter(msg => msg._id !== tempMessageId));
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

      if (response.data && (response.data.success || response.status === 200 || response.status === 201)) {
        // Replace optimistic message with real one
        const realMessage = response.data.message || response.data.data || {
          _id: response.data.messageId || tempMessageId.replace('temp-', 'real-'),
          senderEmpId: currentUserEmpId,
          receiverEmpId: receiverEmpId,
          message: message.trim(),
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          sender: { 
            empId: currentUserEmpId, 
            employeeName: 'You' 
          }
        };

        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempMessageId 
              ? { ...realMessage, isOptimistic: false }
              : msg
          )
        );

        // Force immediate refresh to sync with server
        setTimeout(() => {
          fetchChatMessages(false, false);
        }, 100);
        
      } else {
        console.error('LoadChatModal: Failed to send message:', response.data?.message);
        // Mark optimistic message as failed
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempMessageId 
              ? { ...msg, isOptimistic: false, failed: true }
              : msg
          )
        );
        alert(response.data?.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Mark optimistic message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempMessageId 
            ? { ...msg, isOptimistic: false, failed: true }
            : msg
        )
      );
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

  const isMessageFromCurrentUser = (msg) => {
    if (!msg || !currentUserEmpId) return false;
    
    const senderId = msg.senderEmpId || 
                   msg.sender?.empId || 
                   msg.sender?._id ||
                   msg.sender_id ||
                   (typeof msg.sender === 'string' ? msg.sender : null);
    
    const nestedSenderId = msg.sender && typeof msg.sender === 'object' && (
      msg.sender.empId || 
      msg.sender._id || 
      msg.sender.id ||
      msg.sender.employeeId
    );
    
    const finalSenderId = String(senderId || nestedSenderId || '').trim();
    const currentUserId = String(currentUserEmpId || '').trim();
    
    return finalSenderId === currentUserId;
  };

  // Helper function to detect audio files
  const isAudioFile = (file) => {
    const audioFormats = ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'webm', 'flac'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    return audioFormats.includes(fileExt || '') || file.type.startsWith('audio/');
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file || !receiverEmpId || !loadId || uploadingFile) return;

    // Validate file types
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = {
      images: ['jpg', 'jpeg', 'png'],
      documents: ['pdf', 'xlsx', 'xls', 'xlsm', 'xlsb'],
      audio: ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'webm', 'flac']
    };
    
    const allAllowed = [...allowedExtensions.images, ...allowedExtensions.documents, ...allowedExtensions.audio];
    if (!allAllowed.includes(fileExtension)) {
      alert('Please select a valid file type:\n- Images: JPG, JPEG, PNG\n- Documents: PDF, XLSX, XLS, XLSM, XLSB\n- Audio: MP3, WAV, M4A, OGG, AAC, WEBM, FLAC');
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB.');
      return;
    }

    setUploadingFile(true);
    try {
      const token = sessionStorage.getItem('authToken') || 
                    localStorage.getItem('authToken') || 
                    sessionStorage.getItem('token') || 
                    localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please login again.');
        setUploadingFile(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('receiverEmpId', receiverEmpId);
      formData.append('loadId', loadId);

      // Set appropriate message based on file type
      const isAudio = isAudioFile(file);
      const isImage = ['jpg', 'jpeg', 'png'].includes(fileExtension);
      const messageText = isAudio 
        ? `Sent an audio: ${file.name}` 
        : isImage 
        ? `Sent an image: ${file.name}` 
        : `Sent a file: ${file.name}`;
      
      formData.append('message', messageText);

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/load/send`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data && (response.data.success || response.status === 200 || response.status === 201)) {
        // Refresh messages to show the uploaded file
        setTimeout(() => {
          fetchChatMessages(false, false);
        }, 500);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const getSenderName = (msg) => {
    if (!msg) return 'Unknown';
    
    if (isMessageFromCurrentUser(msg)) {
      return 'You';
    }
    
    return msg.senderName || 
           msg.sender?.employeeName || 
           msg.sender?.empName ||
           msg.sender?.name ||
           msg.senderEmpId || 
           'User';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)'
    }}>
      <div className="w-full max-w-3xl h-[700px] flex flex-col rounded-2xl overflow-hidden shadow-2xl" style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Premium Header with Gradient */}
        <div className="relative px-8 py-6" style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)'
        }}>
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)'
          }}></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)'
              }}>
                <User className="text-purple-600" size={28} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight" style={{
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                }}>
                  {receiverName || 'User'}
                </h2>
                <p className="text-purple-100 text-sm mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 shadow-lg animate-pulse"></span>
                  Real-time chat active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchChatMessages(false)}
                className="text-white rounded-xl p-3 transition-all duration-200 hover:scale-110" style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)'
                }}
                title="Refresh messages"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={onClose}
                className="text-white rounded-xl p-3 transition-all duration-200 hover:scale-110" style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <X size={22} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area with Premium Styling */}
        <div className="flex-1 overflow-y-auto px-8 py-6" style={{
          background: 'linear-gradient(to bottom, #0f172a 0%, #1e293b 100%)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 92, 246, 0.5) transparent'
        }}>
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  animation: 'pulse 2s ease-in-out infinite'
                }}>
                  <MessageCircle className="text-white" size={32} />
                </div>
                <p className="text-gray-400 text-lg">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-24 h-24 mb-6 rounded-3xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                border: '2px solid rgba(139, 92, 246, 0.3)'
              }}>
                <MessageCircle size={48} className="text-purple-400" />
              </div>
              <p className="text-gray-300 text-xl font-semibold mb-2">No messages yet</p>
              <p className="text-gray-500">Start a conversation with {receiverName}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => {
                const isCurrentUser = isMessageFromCurrentUser(msg);
                const messageText = msg.message || msg.text || msg.content || '';
                const senderName = getSenderName(msg);
                
                const msgKey = msg._id || msg.id || `msg-${msg.createdAt || msg.timestamp || index}-${isCurrentUser ? 'me' : 'other'}`;
                
                if (!messageText) return null;
                
                return (
                  <div
                    key={msgKey}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-lg ${isCurrentUser ? '' : 'flex items-start gap-3'}`}>
                      {!isCurrentUser && (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1" style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
                        }}>
                          <User className="text-white" size={20} />
                        </div>
                      )}
                      
                      <div className={`px-6 py-4 rounded-2xl ${
                        isCurrentUser ? 'rounded-br-md' : 'rounded-bl-md'
                      } ${msg.failed ? 'border-2 border-red-500 opacity-80' : ''}`} style={{
                        background: isCurrentUser 
                          ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: isCurrentUser ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: isCurrentUser 
                          ? '0 8px 24px rgba(139, 92, 246, 0.4)' 
                          : '0 4px 12px rgba(0, 0, 0, 0.3)'
                      }}>
                        {!isCurrentUser && (
                          <div className="text-xs font-semibold mb-2 text-purple-300">
                            {senderName}
                          </div>
                        )}
                        <p className={`text-base leading-relaxed whitespace-pre-wrap break-words ${
                          isCurrentUser ? 'text-white' : 'text-gray-200'
                        }`}>
                          {messageText}
                          {msg.failed && (
                            <span className="block text-xs text-red-300 mt-1">
                              ❌ Failed to send - Click to retry
                            </span>
                          )}
                        </p>
                        <p className={`text-xs mt-2 ${
                          isCurrentUser ? 'text-purple-200' : 'text-gray-500'
                        }`}>
                          {formatTime(msg.createdAt || msg.timestamp || msg.created_at || msg.date)}
                          {msg.isOptimistic && (
                            <span className="ml-2 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                              Sending
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Premium Input Area */}
        <div className="px-8 py-6" style={{
          background: 'linear-gradient(to top, #0f172a 0%, #1e293b 100%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <form onSubmit={handleSendMessage} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {/* File Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title="Attach file (PDF, Excel)"
                disabled={uploadingFile || sending || !receiverEmpId}
              >
                <Paperclip size={20} />
              </button>
              {/* Image Upload Button */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title="Attach image (JPG, PNG)"
                disabled={uploadingFile || sending || !receiverEmpId}
              >
                <Image size={20} />
              </button>
              {/* Audio Upload Button */}
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title="Attach audio"
                disabled={uploadingFile || sending || !receiverEmpId}
              >
                <Mic size={20} />
              </button>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={uploadingFile ? "Uploading..." : "Type your message..."}
                className="w-full px-6 py-4 rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
                disabled={sending || uploadingFile || !receiverEmpId}
              />
            </div>
            <button
              type="submit"
              disabled={!message.trim() || sending || uploadingFile || !receiverEmpId}
              className={`px-8 py-4 rounded-2xl transition-all duration-300 flex items-center gap-3 font-semibold ${
                message.trim() && !sending && !uploadingFile && receiverEmpId
                  ? 'hover:scale-105 shadow-lg'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                background: message.trim() && !sending && !uploadingFile && receiverEmpId
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                boxShadow: message.trim() && !sending && !uploadingFile && receiverEmpId
                  ? '0 8px 24px rgba(139, 92, 246, 0.4)'
                  : 'none'
              }}
            >
              {sending || uploadingFile ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-white">{uploadingFile ? 'Uploading' : 'Sending'}</span>
                </>
              ) : (
                <>
                  <Send size={20} className="text-white" />
                  <span className="text-white">Send</span>
                </>
              )}
            </button>
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.xlsx,.xls,.xlsm,.xlsb"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleFileUpload(file);
                }
                e.target.value = '';
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,image/jpeg,image/jpg,image/png"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleFileUpload(file);
                }
                e.target.value = '';
              }}
            />
            <input
              ref={audioInputRef}
              type="file"
              className="hidden"
              accept=".mp3,.wav,.m4a,.ogg,.aac,.webm,.flac,audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/aac,audio/webm,audio/flac"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleFileUpload(file);
                }
                e.target.value = '';
              }}
            />
          </form>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        div::-webkit-scrollbar {
          width: 8px;
        }
        
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        
        div::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 10px;
        }
        
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>
    </div>
  );
};

export default LoadChatModal;