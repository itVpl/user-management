import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { X, Send, MessageCircle, RefreshCw, User, Paperclip, Image, Mic, ChevronDown, Reply } from 'lucide-react';
import API_CONFIG from '../../config/api.js';

const LoadChatModalCMT = ({ isOpen, onClose, loadId, receiverEmpId, receiverName }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // Message being replied to
  const [hoveredMessageId, setHoveredMessageId] = useState(null); // Track hovered message
  const [openMenuId, setOpenMenuId] = useState(null); // Track which message menu is open
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesTopRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const menuRefs = useRef({}); // Store refs for each message menu
  const currentUserEmpId = sessionStorage.getItem('empId') || localStorage.getItem('empId');
  const itemsPerPage = 50;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchChatMessages = useCallback(async (isSilent = false, page = 1, append = false) => {
    if (!loadId) return;

    if (!isSilent && !append) setLoading(true);
    if (append) setLoadingMore(true);
    
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        alert('Authentication required.');
        if (!isSilent && !append) setLoading(false);
        if (append) setLoadingMore(false);
        return;
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/public/load/${loadId}`,
        { 
          params: {
            page,
            limit: itemsPerPage
          },
          headers: { Authorization: `Bearer ${token}` } 
        }
      );

      if (response.data && response.data.success) {
        const msgs = response.data.messages || response.data.data?.messages || [];
        // Sort messages by timestamp
        msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // Add isMyMessage flag to each message for easier rendering
        const processedMessages = msgs.map(msg => ({
          ...msg,
          isMyMessage: String(msg.senderEmpId).trim() === String(currentUserEmpId).trim()
        }));
        
        if (append) {
          // Append older messages at the beginning
          setMessages(prev => [...processedMessages, ...prev]);
        } else {
          // Replace all messages
          setMessages(processedMessages);
        }
        
        // Update pagination info
        if (response.data.pagination) {
          setCurrentPage(response.data.pagination.currentPage || page);
          setTotalPages(response.data.pagination.totalPages || 1);
          setHasMore((response.data.pagination.currentPage || page) < (response.data.pagination.totalPages || 1));
        } else if (response.data.data?.pagination) {
          setCurrentPage(response.data.data.pagination.currentPage || page);
          setTotalPages(response.data.data.pagination.totalPages || 1);
          setHasMore((response.data.data.pagination.currentPage || page) < (response.data.data.pagination.totalPages || 1));
        } else {
          // Fallback: check if we got less than itemsPerPage, then no more pages
          setHasMore(msgs.length >= itemsPerPage);
          setCurrentPage(page);
        }
      } else {
        if (!append) setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (!append) setMessages([]);
    } finally {
      if (!isSilent && !append) setLoading(false);
      if (append) setLoadingMore(false);
    }
  }, [loadId, currentUserEmpId, itemsPerPage]);

  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    // Store current scroll position
    const messagesContainer = messagesContainerRef.current;
    const previousScrollHeight = messagesContainer?.scrollHeight || 0;
    const previousScrollTop = messagesContainer?.scrollTop || 0;
    
    const nextPage = currentPage + 1;
    await fetchChatMessages(true, nextPage, true);
    
    // Restore scroll position after loading older messages
    setTimeout(() => {
      if (messagesContainer) {
        const newScrollHeight = messagesContainer.scrollHeight;
        const scrollDifference = newScrollHeight - previousScrollHeight;
        messagesContainer.scrollTop = previousScrollTop + scrollDifference;
      }
    }, 50);
  }, [currentPage, hasMore, loadingMore, fetchChatMessages]);

  useEffect(() => {
    if (isOpen && loadId) {
      setCurrentPage(1);
      fetchChatMessages();
      
      // Set up polling for new messages every 5 seconds (reduced from 3s to prevent 429 errors)
      const interval = setInterval(() => fetchChatMessages(true, currentPage, false), 5000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
      setCurrentPage(1);
      setTotalPages(1);
      setHasMore(false);
    }
  }, [isOpen, loadId, fetchChatMessages, currentPage]);

  // Handle reply to a message
  const handleReplyToMessage = (msg) => {
    console.log('=== handleReplyToMessage called ===');
    console.log('Message:', msg);
    console.log('Message ID:', msg._id || msg.id);
    console.log('Message text:', msg.message || msg.text || msg.content);
    if (!msg) {
      console.error('No message provided to handleReplyToMessage!');
      return;
    }
    setReplyingTo(msg);
    setOpenMenuId(null);
    console.log('Reply state set, replyingTo:', msg);
    // Focus on input field
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]');
      if (input) {
        input.focus();
        console.log('Input focused');
      } else {
        console.log('Input field not found!');
      }
    }, 100);
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId) {
        const menuElement = menuRefs.current[openMenuId];
        if (menuElement && !menuElement.contains(event.target)) {
          setOpenMenuId(null);
        }
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending || !receiverEmpId || !loadId) return;

    setSending(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        alert('Authentication required.');
        setSending(false);
        return;
      }

      const payload = { 
        receiverEmpId, 
        message: message.trim(), 
        loadId,
        ...(replyingTo ? { replyTo: replyingTo._id || replyingTo.id } : {})
      };
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/load/send`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && (response.data.success || response.status === 200)) {
        // Create optimistic message with proper structure
        const optimisticMessage = {
          _id: `temp-${Date.now()}`,
          senderEmpId: currentUserEmpId,
          receiverEmpId,
          message: message.trim(),
          timestamp: new Date().toISOString(),
          isMyMessage: true,
          isOptimistic: true,
          senderName: 'You',
          replyTo: replyingTo ? (replyingTo._id || replyingTo.id) : undefined,
          sender: { 
            empId: currentUserEmpId, 
            employeeName: 'You' 
          },
          receiver: { 
            empId: receiverEmpId, 
            employeeName: receiverName 
          }
        };

        // Add optimistic message to the list
        setMessages(prev => [...prev, optimisticMessage]);
        setMessage('');
        setReplyingTo(null); // Clear reply after sending
        
        // Scroll to bottom after a small delay
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        // Refresh messages after a short delay to get the actual message from server
        setTimeout(fetchChatMessages, 500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.isOptimistic));
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMessageFromCurrentUser = (msg) => {
    return String(msg.senderEmpId).trim() === String(currentUserEmpId).trim();
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
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        alert('Authentication required.');
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

      if (response.data && (response.data.success || response.status === 200)) {
        // Refresh messages to show the uploaded file
        setTimeout(() => {
          fetchChatMessages(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
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
        {/* Premium Header */}
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
                  Active now
                  {totalPages > 1 && (
                    <span className="ml-2 text-xs opacity-75">
                      • Page {currentPage} of {totalPages}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCurrentPage(1);
                  fetchChatMessages();
                }}
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

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-8 py-6" 
          style={{
            background: 'linear-gradient(to bottom, #0f172a 0%, #1e293b 100%)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(139, 92, 246, 0.5) transparent'
          }}
        >
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
              <p className="text-gray-500">Start a conversation...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Load More Button */}
              {hasMore && (
                <div ref={messagesTopRef} className="flex justify-center py-4">
                  <button
                    onClick={loadMoreMessages}
                    disabled={loadingMore}
                    className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                    style={{
                      background: loadingMore 
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)',
                      border: '1px solid rgba(139, 92, 246, 0.5)',
                      color: '#e0e7ff'
                    }}
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        Loading older messages...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Load Older Messages ({currentPage}/{totalPages})
                      </span>
                    )}
                  </button>
                </div>
              )}
              
              {messages.map((msg, index) => {
                const isCurrentUser = isMessageFromCurrentUser(msg);
                const displayName = isCurrentUser ? 'You' : (msg.senderName || msg.sender?.employeeName || 'User');
                const msgId = msg._id || `msg-${index}`;
                const isHovered = hoveredMessageId === msgId;
                const isMenuOpen = openMenuId === msgId;
                
                // Find replied message if exists
                // Handle both replyTo as ID or as object
                let repliedMessage = null;
                if (msg.replyTo) {
                  if (typeof msg.replyTo === 'object' && msg.replyTo.message) {
                    // replyTo is already a populated object
                    repliedMessage = msg.replyTo;
                  } else {
                    // replyTo is an ID, find the message
                    const replyToId = msg.replyTo._id || msg.replyTo.id || msg.replyTo;
                    repliedMessage = messages.find(m => {
                      const msgId = m._id || m.id;
                      return String(msgId) === String(replyToId);
                    });
                  }
                }
                
                return (
                  <div
                    key={msgId}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group relative`}
                    onMouseEnter={() => setHoveredMessageId(msgId)}
                    onMouseLeave={() => {
                      if (!isMenuOpen) setHoveredMessageId(null);
                    }}
                  >
                    <div className={`max-w-lg ${isCurrentUser ? '' : 'flex items-start gap-3'}`}>
                      {!isCurrentUser && (
                        <button
                          type="button"
                          onClick={(e) => {
                            alert('Profile clicked! Replying to: ' + (msg.message || msg.text || 'message'));
                            console.log('=== Profile avatar clicked! ===');
                            console.log('Event:', e);
                            console.log('Message:', msg);
                            console.log('Message ID:', msg._id || msg.id);
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.nativeEvent) {
                              e.nativeEvent.stopImmediatePropagation();
                            }
                            handleReplyToMessage(msg);
                          }}
                          onMouseDown={(e) => {
                            console.log('Mouse down on avatar');
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onMouseUp={(e) => {
                            console.log('Mouse up on avatar');
                            e.stopPropagation();
                          }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 cursor-pointer hover:opacity-80 hover:scale-110 transition-all z-50 relative border-2 border-transparent hover:border-white/50 outline-none focus:outline-none" 
                          style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                            pointerEvents: 'auto',
                            WebkitTapHighlightColor: 'transparent'
                          }}
                          title="Click to reply"
                        >
                          <User className="text-white pointer-events-none" size={20} />
                        </button>
                      )}
                      
                      <div className="relative flex-1">
                        <div 
                          className={`px-6 py-4 rounded-2xl cursor-pointer ${
                            isCurrentUser ? 'rounded-br-md' : 'rounded-bl-md'
                          }`} 
                          onClick={(e) => {
                            // Don't open menu if clicking on profile avatar
                            if (e.target.closest('button[title="Click to reply"]')) {
                              return;
                            }
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : msgId);
                          }}
                          style={{
                            background: isCurrentUser 
                              ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                              : 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            border: isCurrentUser ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: isCurrentUser 
                              ? '0 8px 24px rgba(139, 92, 246, 0.4)' 
                              : '0 4px 12px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          {!isCurrentUser && (
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-purple-300">
                                {displayName}
                              </div>
                              {/* Down arrow - shows on hover */}
                              {isHovered && (
                                <ChevronDown size={14} className="text-gray-400" />
                              )}
                            </div>
                          )}
                          
                          {/* Show replied message if exists - WhatsApp style */}
                          {repliedMessage && (repliedMessage.message || repliedMessage.text || repliedMessage.content) && (
                            <div className={`mb-2 pl-3 pr-2 py-1.5 rounded ${
                              isCurrentUser 
                                ? 'bg-white/15' 
                                : 'bg-gray-700/40'
                            }`} style={{
                              borderLeft: '3px solid #3b82f6'
                            }}>
                              <div className={`text-xs font-semibold mb-0.5 flex items-center gap-1.5 ${
                                isCurrentUser ? 'text-white/90' : 'text-gray-200'
                              }`}>
                                {repliedMessage.senderEmpId === currentUserEmpId ? 'You' : (repliedMessage.senderName || repliedMessage.sender?.employeeName || repliedMessage.senderName || 'User')}
                                {isCurrentUser && (
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-white/70">
                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                                  </svg>
                                )}
                              </div>
                              <div className={`text-xs truncate ${
                                isCurrentUser ? 'text-white/70' : 'text-gray-300'
                              }`}>
                                {repliedMessage.message || repliedMessage.text || repliedMessage.content}
                              </div>
                            </div>
                          )}
                          
                          <p className={`text-base leading-relaxed whitespace-pre-wrap break-words ${
                            isCurrentUser ? 'text-white' : 'text-gray-200'
                          }`}>
                            {msg.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <p className={`text-xs ${
                                isCurrentUser ? 'text-purple-200' : 'text-gray-500'
                              }`}>
                                {formatTime(msg.timestamp)}
                                {msg.isOptimistic && (
                                  <span className="ml-2 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                    Sending...
                                  </span>
                                )}
                              </p>
                              
                              {/* Down arrow - always visible for current user messages, shows on hover for others */}
                              {isCurrentUser ? (
                                <ChevronDown size={14} className="text-white/70" />
                              ) : (
                                isHovered && <ChevronDown size={14} className="text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Context Menu - WhatsApp style, appears when message is clicked */}
                        {isMenuOpen && (
                          <div 
                            ref={(el) => {
                              if (el) menuRefs.current[msgId] = el;
                              else delete menuRefs.current[msgId];
                            }}
                            className={`absolute ${isCurrentUser ? 'right-0' : 'left-0'} ${isCurrentUser ? 'top-0' : 'top-0'} z-50 w-52 bg-white rounded-2xl shadow-2xl overflow-hidden`}
                            style={{
                              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                              transform: isCurrentUser ? 'translateX(0)' : 'translateX(0)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReplyToMessage(msg);
                              }}
                              className="w-full px-4 py-3.5 text-left text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100 first:rounded-t-2xl"
                            >
                              <div className="flex items-center justify-center w-6 h-6">
                                <Reply size={18} className="text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-800">Reply</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(msg.message);
                                setOpenMenuId(null);
                                // Show feedback
                                const btn = e.target.closest('button');
                                if (btn) {
                                  const originalText = btn.querySelector('span').textContent;
                                  btn.querySelector('span').textContent = 'Copied!';
                                  setTimeout(() => {
                                    btn.querySelector('span').textContent = originalText;
                                  }, 1000);
                                }
                              }}
                              className="w-full px-4 py-3.5 text-left text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-3 transition-colors last:rounded-b-2xl"
                            >
                              <div className="flex items-center justify-center w-6 h-6">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </div>
                              <span className="font-medium text-gray-800">Copy</span>
                            </button>
                          </div>
                        )}
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
          {/* Reply Preview - WhatsApp style */}
          {replyingTo && (
            <div className="mb-3 pl-3 pr-2 py-2 rounded-lg flex items-start justify-between bg-gray-800/50" style={{
              borderLeft: '3px solid #3b82f6'
            }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-gray-200">
                    {replyingTo.senderEmpId === currentUserEmpId ? 'You' : (replyingTo.senderName || replyingTo.sender?.employeeName || 'User')}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {replyingTo.message || replyingTo.text || replyingTo.content}
                </p>
              </div>
              <button
                onClick={handleCancelReply}
                className="ml-3 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
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
                placeholder={uploadingFile ? "Uploading..." : "Type a message..."}
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

export default LoadChatModalCMT;