import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  Send, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Image, 
  Paperclip, 
  Smile, 
  Mic,
  Check,
  CheckCheck,
  Clock,
  User,
  MessageCircle,
  Circle,
  MinusCircle,
  AlertCircle,
  Reply,
  X,
  Camera,
  PhoneCall,
  Info,
  Archive,
  Trash2,
  Volume2,
  VolumeX,
  Bell,
  Users,
  Plus,
  Settings,
  UserPlus,
  UserMinus,
  LogOut,
  Eye,
  Play,
  Pause,
  Download
} from "lucide-react";
import API_CONFIG from '../../config/api.js';
import sharedSocketService from '../../services/sharedSocketService';
import LogoFinal from '../../assets/LogoFinal.png';

// Helper function to format employee name with alias
const formatEmployeeName = (user) => {
  if (!user) return '';
  if (user.aliasName && user.employeeName) {
    return `${user.employeeName}/${user.aliasName}`;
  }
  return user.employeeName || user.aliasName || '';
};

// Audio Player Component
const AudioPlayer = ({ src, isMyMessage, fileName, messageId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioRef = useRef(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error('Audio play failed:', err);
          // iOS Safari requires user interaction
          alert('Please click play again to listen to the audio.');
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audioRef.current.currentTime = percent * duration;
    }
  };

  const handleDownload = async () => {
    if (!messageId && !src) return;
    
    setIsDownloading(true);
    try {
      // Determine download URL
      // If src is an S3 URL (starts with http/https), use it directly
      // Otherwise, use the download endpoint
      let downloadUrl = src;
      
      if (!src || (!src.startsWith('http://') && !src.startsWith('https://'))) {
        // Use download endpoint for local files
        downloadUrl = `${API_CONFIG.BASE_URL}/api/v1/chat/download/${messageId}`;
      }
      
      // Fetch the audio file
      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the blob
      const blob = await response.blob();
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract file extension from fileName or use default
      const fileExtension = fileName?.split('.').pop()?.toLowerCase() || 'mp3';
      const downloadFileName = fileName || `audio-${messageId || Date.now()}.${fileExtension}`;
      
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading audio:', error);
      alert('Failed to download audio. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine the correct audio URL for playback
  // If src is an S3 URL (starts with http/https), use it directly
  // Otherwise, use the download endpoint for local files
  const getAudioSrc = () => {
    if (!src) {
      return messageId ? `${API_CONFIG.BASE_URL}/api/v1/chat/download/${messageId}` : '';
    }
    
    // If src is already a full URL (S3 or download endpoint), use it
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    
    // If src is a local path, use download endpoint
    if (messageId) {
      return `${API_CONFIG.BASE_URL}/api/v1/chat/download/${messageId}`;
    }
    
    return src;
  };

  return (
    <div className={`audio-message-container p-3 rounded-lg ${
      isMyMessage 
        ? 'bg-blue-500 text-white' 
        : 'bg-gray-100 text-gray-800'
    }`}>
      <audio
        ref={audioRef}
        src={getAudioSrc()}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />
      
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          className={`p-2 rounded-full transition-colors flex-shrink-0 ${
            isMyMessage 
              ? 'bg-white/20 hover:bg-white/30 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div 
            className={`h-2 rounded-full cursor-pointer mb-1 ${
              isMyMessage ? 'bg-white/30' : 'bg-gray-300'
            }`}
            onClick={handleSeek}
          >
            <div
              className={`h-full rounded-full transition-all ${
                isMyMessage ? 'bg-white' : 'bg-blue-500'
              }`}
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className={`flex justify-between text-xs ${
            isMyMessage ? 'text-white/80' : 'text-gray-600'
          }`}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          {fileName && (
            <div className={`text-xs mt-1 truncate flex items-center gap-1 ${
              isMyMessage ? 'text-white/90' : 'text-gray-500'
            }`}>
              <span>🎵</span>
              <span className="truncate">{fileName}</span>
            </div>
          )}
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
            isMyMessage
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          title={isDownloading ? 'Downloading...' : 'Download audio'}
        >
          {isDownloading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download size={16} />
          )}
        </button>
      </div>
    </div>
  );
};

const ChatPage = () => {
  const [chatList, setChatList] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [storedUser, setStoredUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingChatList, setLoadingChatList] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingGroupMessages, setLoadingGroupMessages] = useState(false);
  const [newMessagesMap, setNewMessagesMap] = useState({});
  const [newGroupMessagesMap, setNewGroupMessagesMap] = useState({}); // Track unread group messages
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastMessageTime, setLastMessageTime] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showInAppNotification, setShowInAppNotification] = useState(false);
  const [inAppNotificationData, setInAppNotificationData] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  // Reply functionality states
  const [replyingTo, setReplyingTo] = useState(null); // Message being replied to
  const [highlightedMessageId, setHighlightedMessageId] = useState(null); // Message ID to highlight
  // Group chat states
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupMessages, setGroupMessages] = useState([]);
  const [chatType, setChatType] = useState('individual'); // 'individual' or 'group'
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showSeenByModal, setShowSeenByModal] = useState(false);
  const [seenByData, setSeenByData] = useState(null);
  const [loadingSeenBy, setLoadingSeenBy] = useState(false);
  // Image viewer modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState(null);
  // File preview and caption state (WhatsApp-style)
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]); // Array of { file, preview, type, caption }
  const [previewCaption, setPreviewCaption] = useState('');
  // Mention/Tag states
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [taggedUsers, setTaggedUsers] = useState([]); // Array of { empId, employeeName, aliasName }
  // Online status tracking
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Set of empIds that are online
  // Pagination states for lazy loading
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [hasMoreGroupMessages, setHasMoreGroupMessages] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [loadingOlderGroupMessages, setLoadingOlderGroupMessages] = useState(false);
  const [messagesPage, setMessagesPage] = useState(0);
  const [groupMessagesPage, setGroupMessagesPage] = useState(0);
  const INITIAL_MESSAGES_COUNT = 10; // Load 10 messages initially when opening individual chat
  const INITIAL_GROUP_MESSAGES_COUNT = 100; // Load 100 messages initially for group chats
  const MESSAGES_PER_PAGE = 30; // Load 30 messages at a time when scrolling up
  
  const mentionDropdownRef = useRef(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null); // Ref for individual messages container
  const groupMessagesContainerRef = useRef(null); // Ref for group messages container
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const allFilesInputRef = useRef(null); // For "add more files" in preview modal
  const audioRef = useRef(null);
  const groupTextareaRef = useRef(null);
  const individualTextareaRef = useRef(null);
  const groupMessageRefs = useRef({});
  const markedAsSeenRef = useRef(new Set()); // Track which messages have been marked as seen

  const scrollToBottom = (force = false) => {
    // If force is true (when user sends message), always scroll
    if (force) {
      isNearBottomRef.current = true;
      userScrolledRef.current = false;
    }
    
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  // Track last message IDs to detect new messages
  const lastGroupMessageIdRef = useRef(null);
  const lastIndividualMessageIdRef = useRef(null);
  
  // Track if user is near bottom (within 150px) - only auto-scroll if true
  const isNearBottomRef = useRef(true);
  const userScrolledRef = useRef(false);

  // Check if user is near the bottom of the chat
  const checkIfNearBottom = (container) => {
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    // Consider "near bottom" if within 300px - gives more room for viewing older messages
    return distanceFromBottom < 300;
  };

  // Auto-scroll to bottom when NEW messages arrive (only if user is near bottom)
  useEffect(() => {
    if (chatType === 'group' && groupMessages.length > 0 && !loadingOlderGroupMessages) {
      const lastMessage = groupMessages[groupMessages.length - 1];
      const lastMessageId = lastMessage?._id || lastMessage?.id;
      
      // Only scroll if this is a new message (different ID than last one)
      if (lastMessageId && lastMessageId !== lastGroupMessageIdRef.current) {
        lastGroupMessageIdRef.current = lastMessageId;
        
        // Check current scroll position before auto-scrolling
        const container = groupMessagesContainerRef.current;
        if (!container) return;
        
        const isNearBottom = checkIfNearBottom(container);
        
        // Only auto-scroll if user is near bottom (don't scroll if they're viewing older messages)
        if (isNearBottom) {
          const timer = setTimeout(() => {
            // Double-check before scrolling (user might have scrolled in the meantime)
            const stillNearBottom = checkIfNearBottom(container);
            if (stillNearBottom) {
              scrollToBottom();
              isNearBottomRef.current = true;
            }
          }, 150);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [groupMessages.length, chatType, loadingOlderGroupMessages]);

  useEffect(() => {
    if (chatType === 'individual' && messages.length > 0 && !loadingOlderMessages) {
      const lastMessage = messages[messages.length - 1];
      const lastMessageId = lastMessage?._id || lastMessage?.id;
      
      // Only scroll if this is a new message (different ID than last one)
      if (lastMessageId && lastMessageId !== lastIndividualMessageIdRef.current) {
        lastIndividualMessageIdRef.current = lastMessageId;
        
        // Check current scroll position before auto-scrolling
        const container = messagesContainerRef.current;
        if (!container) return;
        
        const isNearBottom = checkIfNearBottom(container);
        
        // Only auto-scroll if user is near bottom (don't scroll if they're viewing older messages)
        if (isNearBottom) {
          const timer = setTimeout(() => {
            // Double-check before scrolling (user might have scrolled in the meantime)
            const stillNearBottom = checkIfNearBottom(container);
            if (stillNearBottom) {
              scrollToBottom();
              isNearBottomRef.current = true;
            }
          }, 150);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [messages.length, chatType, loadingOlderMessages]);

  // Track scroll position for group messages - update immediately on scroll
  useEffect(() => {
    const container = groupMessagesContainerRef.current;
    if (!container || chatType !== 'group') return;

    let lastScrollTop = container.scrollTop;
    let scrollToBottomTimer = null;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom < 300;
      
      // Detect if user is scrolling down (towards bottom)
      const isScrollingDown = currentScrollTop > lastScrollTop;
      
      // If user scrolls down and is very close to bottom (within 100px), scroll to newest messages
      if (isScrollingDown && distanceFromBottom < 100) {
        // Clear any existing timer
        if (scrollToBottomTimer) {
          clearTimeout(scrollToBottomTimer);
        }
        
        // User is scrolling down and very close to bottom - scroll to newest messages
        scrollToBottomTimer = setTimeout(() => {
          scrollToBottom(true);
          isNearBottomRef.current = true;
        }, 150);
      }
      
      // Update tracking
      isNearBottomRef.current = isNearBottom;
      userScrolledRef.current = true;
      lastScrollTop = currentScrollTop;
    };

    // Use passive listener for better performance
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollToBottomTimer) {
        clearTimeout(scrollToBottomTimer);
      }
    };
  }, [chatType, groupMessages.length]);

  // Track scroll position for individual messages - update immediately on scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || chatType !== 'individual') return;

    let lastScrollTop = container.scrollTop;
    let scrollToBottomTimer = null;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom < 300;
      
      // Detect if user is scrolling down (towards bottom)
      const isScrollingDown = currentScrollTop > lastScrollTop;
      
      // If user scrolls down and is very close to bottom (within 100px), scroll to newest messages
      if (isScrollingDown && distanceFromBottom < 100) {
        // Clear any existing timer
        if (scrollToBottomTimer) {
          clearTimeout(scrollToBottomTimer);
        }
        
        // User is scrolling down and very close to bottom - scroll to newest messages
        scrollToBottomTimer = setTimeout(() => {
          scrollToBottom(true);
          isNearBottomRef.current = true;
        }, 150);
      }
      
      // Update tracking
      isNearBottomRef.current = isNearBottom;
      userScrolledRef.current = true;
      lastScrollTop = currentScrollTop;
    };

    // Use passive listener for better performance
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollToBottomTimer) {
        clearTimeout(scrollToBottomTimer);
      }
    };
  }, [chatType, messages.length]);

  // Reset scroll tracking when switching chats
  useEffect(() => {
    isNearBottomRef.current = true;
    userScrolledRef.current = false;
    // Also check initial position
    setTimeout(() => {
      if (chatType === 'group') {
        const container = groupMessagesContainerRef.current;
        if (container) {
          isNearBottomRef.current = checkIfNearBottom(container);
        }
      } else if (chatType === 'individual') {
        const container = messagesContainerRef.current;
        if (container) {
          isNearBottomRef.current = checkIfNearBottom(container);
        }
      }
    }, 100);
  }, [selectedGroup?._id, selectedUser?.empId, chatType]);

  // Show notification
  const showNotification = (title, body, senderName) => {
    // Check if Notification API is supported
    if (typeof Notification === 'undefined') {
      console.error("❌ Notification API not supported in this browser");
      return;
    }
    
    if (Notification.permission === "granted") {
      try {
        const notification = new Notification(title, {
          body: body, // Body already contains the message, title has the sender name
          icon: LogoFinal,
          badge: LogoFinal,
          requireInteraction: true, // Keep notification until user interacts
          silent: false // Play sound
        });

        // Add click handler
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        
        // Add close handler
        notification.onclose = () => {
          // Notification closed
        };
        
        // Auto close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
        
      } catch (error) {
        console.error("❌ Failed to create notification:", error);
      }
    } else if (Notification.permission === "default") {
      // Try to request permission
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          showNotification(title, body, senderName); // Retry
        }
      });
    }
  };

  // Request notification permission
  const requestNotificationPermission = () => {

    if (Notification.permission === "default") {

      Notification.requestPermission().then(permission => {

        if (permission === "granted") {

        } else {

        }
      });
    } else if (Notification.permission === "granted") {

    } else {

    }
  };

  // Update unread count for a user
  const updateUnreadCount = (senderEmpId, increment = 1) => {

    setNewMessagesMap(prev => {
      const newCount = (prev[senderEmpId] || 0) + increment;

      return {
        ...prev,
        [senderEmpId]: newCount
      };
    });
  };

  // Clear unread count for a user
  const clearUnreadCount = (empId) => {
    setNewMessagesMap(prev => {
      const copy = { ...prev };
      delete copy[empId];
      return copy;
    });
    
    // Notify UnreadCountContext to update sidebar badge
    window.dispatchEvent(new CustomEvent('clearUnreadCount', {
      detail: {
        type: 'individual',
        empId: empId
      }
    }));
  };

  // Mark individual chat messages as seen on server
  // CRITICAL: Must call this when user opens/views a chat (per guide)
  const markMessagesAsSeen = async (senderEmpId) => {
    try {
      // Per guide: POST /api/v1/chat/mark-seen/:empId
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/mark-seen/${senderEmpId}`,
        {},
        { withCredentials: true }
      );

      if (res.data && res.data.success) {
        console.log(`✅ Marked messages as seen for empId: ${senderEmpId}`);
        // Backend will automatically emit chatListUpdated with unreadCount: 0
        // No need to manually update - socket event will handle it (per guide)
      }
    } catch (err) {
      console.error("❌ Failed to mark messages as seen:", err);
      // Fallback to the existing endpoint if the new one doesn't work
      try {
        console.log('⚠️ POST /mark-seen failed, trying PATCH /seen endpoint...');
        await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/chat/seen/${senderEmpId}`,
          {},
          { withCredentials: true }
        );
      } catch (fallbackErr) {
        console.error("❌ Fallback endpoint also failed:", fallbackErr);
      }
    }
  };

  // Show in-app notification
  const displayInAppNotification = (title, body, senderName) => {
    console.log("🔔 Showing in-app notification:", { title, body, senderName });
    setInAppNotificationData({ title, body, senderName });
    setShowInAppNotification(true);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      setShowInAppNotification(false);
      setInAppNotificationData(null);
    }, 5000);
  };

  const fetchMessages = async (selectedEmpId, loadOlder = false) => {
    if (!storedUser?.empId || !selectedEmpId) return;
    try {
      if (loadOlder) {
        setLoadingOlderMessages(true);
      } else {
        setLoadingMessages(true);
        setMessagesPage(0);
        setHasMoreMessages(true);
      }

      // Calculate pagination parameters
      // For initial load, use INITIAL_MESSAGES_COUNT, for older messages use MESSAGES_PER_PAGE
      const skip = loadOlder ? messagesPage * MESSAGES_PER_PAGE : 0;
      const limit = loadOlder ? MESSAGES_PER_PAGE : INITIAL_MESSAGES_COUNT;
      
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/with/${selectedEmpId}?limit=${limit}&skip=${skip}`,
        { withCredentials: true }
      );

      // Handle new API response structure: { messages: [], otherUser: { ... } }
      let fetchedMessages = [];
      let otherUserData = null;
      
      if (res.data) {
        if (Array.isArray(res.data)) {
          // Legacy format: array of messages
          fetchedMessages = res.data;
        } else if (res.data.messages && Array.isArray(res.data.messages)) {
          // New format: object with messages and otherUser
          fetchedMessages = res.data.messages;
          otherUserData = res.data.otherUser;
          
          // Update online status from otherUser
          if (otherUserData && otherUserData.empId && otherUserData.online !== undefined) {
            if (otherUserData.online) {
              setOnlineUsers(prev => new Set([...prev, otherUserData.empId]));
            } else {
              setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(otherUserData.empId);
                return newSet;
              });
            }
          }
        } else {
          fetchedMessages = res.data;
        }
      }
      
      // Handle pagination - API may or may not support it
      let messagesToProcess = fetchedMessages;
      
      if (loadOlder) {
        // Loading older messages
        // If API returned all messages (doesn't support pagination), filter to get only older ones
        if (messages.length > 0 && fetchedMessages.length > messages.length) {
          // API returned all messages, find the oldest message we have and get messages before it
          const oldestMessageId = messages[0]._id;
          const oldestMessageIndex = fetchedMessages.findIndex(msg => msg._id === oldestMessageId);
          
          if (oldestMessageIndex > 0) {
            // Get messages before the oldest one we have
            const olderMessages = fetchedMessages.slice(0, oldestMessageIndex);
            // Take only the last MESSAGES_PER_PAGE older messages
            messagesToProcess = olderMessages.slice(-MESSAGES_PER_PAGE);
            setHasMoreMessages(olderMessages.length > MESSAGES_PER_PAGE);
          } else {
            // No older messages found
            messagesToProcess = [];
            setHasMoreMessages(false);
          }
        } else {
          // API supports pagination or returned exactly what we need
          if (fetchedMessages.length < MESSAGES_PER_PAGE) {
            setHasMoreMessages(false);
          } else {
            setHasMoreMessages(true);
          }
        }
      } else {
        // Initial load - take only the last INITIAL_MESSAGES_COUNT messages (10 messages)
        if (fetchedMessages.length > INITIAL_MESSAGES_COUNT) {
          messagesToProcess = fetchedMessages.slice(-INITIAL_MESSAGES_COUNT);
          setHasMoreMessages(true);
        } else {
          messagesToProcess = fetchedMessages;
          setHasMoreMessages(fetchedMessages.length >= INITIAL_MESSAGES_COUNT);
        }
      }

      // Process messages to add isMyMessage flag and ensure seenBy structure
      let processedMessages = messagesToProcess.map(msg => ({
        ...msg,
        isMyMessage: msg.senderEmpId === storedUser?.empId,
        seenBy: msg.seenBy || null,
        seenAt: msg.seenAt || null,
        isSeen: msg.isSeen !== undefined ? msg.isSeen : (msg.seenBy ? true : false),
        status: msg.status || (msg.isSeen ? 'seen' : (msg.seenBy ? 'seen' : 'sent'))
      }));

      // Sort messages by timestamp to ensure correct chronological order
      processedMessages.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return timeA - timeB; // Ascending order (oldest first)
      });

      if (loadOlder) {
        // Prepend older messages to the beginning and ensure entire array is sorted
        setMessages(prev => {
          // Remove optimistic messages when fetching real messages
          const prevWithoutOptimistic = prev.filter(msg => !msg.isOptimistic);
          const combined = [...processedMessages, ...prevWithoutOptimistic];
          // Deduplicate by _id to prevent duplicate messages
          const seen = new Set();
          const deduplicated = combined.filter(msg => {
            const msgId = String(msg._id || msg.id || '');
            if (!msgId || seen.has(msgId)) {
              return false;
            }
            seen.add(msgId);
            return true;
          });
          // Sort the entire array to ensure correct order
          deduplicated.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
            const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
            return timeA - timeB; // Ascending order (oldest first)
          });
          return deduplicated;
        });
        setMessagesPage(prev => prev + 1);
      } else {
        // Initial load - deduplicate and replace all messages (already sorted)
        // Remove optimistic messages when fetching real messages
        const seen = new Set();
        const deduplicated = processedMessages.filter(msg => {
          const msgId = String(msg._id || msg.id || '');
          if (!msgId || seen.has(msgId)) {
            return false;
          }
          seen.add(msgId);
          return true;
        });
        setMessages(deduplicated);
        setMessagesPage(1);
      }

      // Mark messages as seen when opening chat (only on initial load)
      if (!loadOlder) {
        markMessagesAsSeen(selectedEmpId);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error("❌ Failed to load messages:", err);
      if (!loadOlder) {
        setMessages([]);
      }
      setHasMoreMessages(false);
    } finally {
      if (loadOlder) {
        setLoadingOlderMessages(false);
      } else {
        setLoadingMessages(false);
      }
    }
  };

  const fetchChatList = async () => {
    try {
      setLoadingChatList(true);
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/list`,
        { withCredentials: true }
      );
      const list = res.data || [];
      
      // Initialize online status from API response
      const onlineEmpIds = list
        .filter(chat => chat.online === true)
        .map(chat => chat.empId)
        .filter(empId => empId && empId !== storedUser?.empId);
      
      if (onlineEmpIds.length > 0) {
        setOnlineUsers(new Set(onlineEmpIds));
      }
      
      // Initialize unread counts from API response (per guide)
      // Backend sends unreadCount in each chat item
      const unreadFromList = {};
      list.forEach(chat => {
        if (chat.empId && chat.unreadCount !== undefined && chat.unreadCount > 0) {
          unreadFromList[chat.empId] = chat.unreadCount;
        }
      });
      
      // Update state with unread counts from API
      setNewMessagesMap(unreadFromList);
      
      // Sort chat list with unread priority
      const sortedList = sortChatListWithUnreadPriority(list, unreadFromList);
      
      setChatList(sortedList);
    } catch (err) {
      console.error("❌ Failed to fetch chat list", err);
    } finally {
      setLoadingChatList(false);
    }
  };

  // Group Chat Functions
  // Calculate unread count for a group by checking which messages user has NOT read
  const calculateGroupUnreadCount = async (groupId) => {
    try {
      // Fetch all messages for this group
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/${groupId}/messages?limit=1000&skip=0`,
        { withCredentials: true }
      );
      
      if (res.data && res.data.success) {
        const messages = res.data.messages || [];
        let unreadCount = 0;
        
        // Count only messages where current user has NOT read (not in seenBy)
        messages.forEach(msg => {
          // Skip messages sent by current user
          if (msg.senderEmpId === storedUser?.empId) {
            return;
          }
          
          // Check if current user is in seenBy array
          const isSeenByMe = msg.seenBy?.some(seen => {
            const seenEmpId = seen.empId || seen.seenByEmpId;
            return seenEmpId === storedUser?.empId;
          });
          
          // If not seen by current user, count as unread
          if (!isSeenByMe) {
            unreadCount++;
          }
        });
        
        console.log(`📊 Calculated unread count for group ${groupId}: ${unreadCount}`);
        return unreadCount;
      }
    } catch (err) {
      console.error(`❌ Failed to calculate unread count for group ${groupId}:`, err);
      return 0;
    }
    return 0;
  };

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/list`,
        { withCredentials: true }
      );
      if (res.data && res.data.success) {
        const groupsList = res.data.groups || [];
        
        // Normalize _id to string for all groups
        const normalizedGroups = groupsList.map(g => ({
          ...g,
          _id: String(g._id),
          unreadCount: g.unreadCount || 0  // Backend provides unreadCount (per docs)
        }));
        
        setGroups(normalizedGroups);
        
        // Use unreadCount from backend response directly (per docs)
        // Build unread map for red dot display
        const groupUnreadMap = {};
        normalizedGroups.forEach(group => {
          const groupId = String(group._id);
          const unreadCount = group.unreadCount || 0;
          if (unreadCount > 0) {
            groupUnreadMap[groupId] = unreadCount;
          }
        });
        
        // Update state with unread counts from backend
        setNewGroupMessagesMap(groupUnreadMap);
        
        console.log('📊 Group unread counts from backend:', groupUnreadMap);
      }
    } catch (err) {
      console.error("❌ Failed to fetch groups", err);
    } finally {
      setLoadingGroups(false);
    }
  };


  const createGroup = async (groupName, description, memberEmpIds) => {
    try {
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/create`,
        {
          groupName,
          description: description || '',
          memberEmpIds: memberEmpIds || []
        },
        { withCredentials: true }
      );
      if (res.data && res.data.success) {
        await fetchGroups();
        setShowCreateGroupModal(false);
        return res.data.group;
      }
    } catch (err) {
      console.error("❌ Failed to create group", err);
      throw err;
    }
  };

  const fetchGroupMessages = async (groupId, loadOlder = false) => {
    if (!groupId) return;
    try {
      if (loadOlder) {
        setLoadingOlderGroupMessages(true);
      } else {
        setLoadingGroupMessages(true);
        setGroupMessagesPage(0);
        setHasMoreGroupMessages(true);
      }

      // Calculate pagination parameters
      // For initial load, use INITIAL_GROUP_MESSAGES_COUNT, for older messages use MESSAGES_PER_PAGE
      const skip = loadOlder ? groupMessagesPage * MESSAGES_PER_PAGE : 0;
      const limit = loadOlder ? MESSAGES_PER_PAGE : INITIAL_GROUP_MESSAGES_COUNT;
      
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/${groupId}/messages?limit=${limit}&skip=${skip}`,
        { withCredentials: true }
      );
      
      if (res.data && res.data.success) {
        const fetchedMessages = res.data.messages || [];
        
        // Handle pagination - API may or may not support it
        let messagesToProcess = fetchedMessages;
        
        if (loadOlder) {
          // Loading older messages
          // If API returned all messages (doesn't support pagination), filter to get only older ones
          if (groupMessages.length > 0 && fetchedMessages.length > groupMessages.length) {
            // API returned all messages, find the oldest message we have and get messages before it
            const oldestMessageId = groupMessages[0]._id;
            const oldestMessageIndex = fetchedMessages.findIndex(msg => msg._id === oldestMessageId);
            
            if (oldestMessageIndex > 0) {
              // Get messages before the oldest one we have
              const olderMessages = fetchedMessages.slice(0, oldestMessageIndex);
              // Take only the last MESSAGES_PER_PAGE older messages
              messagesToProcess = olderMessages.slice(-MESSAGES_PER_PAGE);
              setHasMoreGroupMessages(olderMessages.length > MESSAGES_PER_PAGE);
            } else {
              // No older messages found
              messagesToProcess = [];
              setHasMoreGroupMessages(false);
            }
          } else {
            // API supports pagination or returned exactly what we need
            if (fetchedMessages.length < MESSAGES_PER_PAGE) {
              setHasMoreGroupMessages(false);
            } else {
              setHasMoreGroupMessages(true);
            }
          }
        } else {
          // Initial load - take only the last INITIAL_GROUP_MESSAGES_COUNT messages (100 messages)
          if (fetchedMessages.length > INITIAL_GROUP_MESSAGES_COUNT) {
            messagesToProcess = fetchedMessages.slice(-INITIAL_GROUP_MESSAGES_COUNT);
            setHasMoreGroupMessages(true);
          } else {
            messagesToProcess = fetchedMessages;
            setHasMoreGroupMessages(fetchedMessages.length >= INITIAL_GROUP_MESSAGES_COUNT);
          }
        }

        // Process messages to add isMyMessage flag and ensure seenBy structure
        let processedMessages = messagesToProcess.map(msg => {
          const processed = {
            ...msg,
            isMyMessage: msg.senderEmpId === storedUser?.empId,
            seenBy: msg.seenBy || [],
            seenCount: msg.seenCount || (msg.seenBy?.length || 0)
          };
          
          // Debug: log seenBy data for messages sent by current user
          if (processed.isMyMessage && (processed.seenBy.length > 0 || processed.seenCount > 0)) {
            console.log('👁️ Group message with seen data:', {
              messageId: processed._id,
              message: processed.message?.substring(0, 20),
              seenBy: processed.seenBy,
              seenCount: processed.seenCount
            });
          }
          
          return processed;
        });

        // Sort messages by timestamp to ensure correct chronological order
        processedMessages.sort((a, b) => {
          const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
          const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
          return timeA - timeB; // Ascending order (oldest first)
        });

        if (loadOlder) {
          // Prepend older messages to the beginning and ensure entire array is sorted
          setGroupMessages(prev => {
            // Remove optimistic messages when fetching real messages
            const prevWithoutOptimistic = prev.filter(msg => !msg.isOptimistic);
            const combined = [...processedMessages, ...prevWithoutOptimistic];
            // Deduplicate by _id to prevent duplicate messages
            const seen = new Set();
            const deduplicated = combined.filter(msg => {
              const msgId = String(msg._id || msg.id || '');
              if (!msgId || seen.has(msgId)) {
                return false;
              }
              seen.add(msgId);
              return true;
            });
            // Sort the entire array to ensure correct order
            deduplicated.sort((a, b) => {
              const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
              const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
              return timeA - timeB; // Ascending order (oldest first)
            });
            return deduplicated;
          });
          setGroupMessagesPage(prev => prev + 1);
        } else {
          // Initial load - deduplicate and replace all messages (already sorted)
          // Remove optimistic messages when fetching real messages
          const seen = new Set();
          const deduplicated = processedMessages.filter(msg => {
            const msgId = String(msg._id || msg.id || '');
            if (!msgId || seen.has(msgId)) {
              return false;
            }
            seen.add(msgId);
            return true;
          });
          setGroupMessages(deduplicated);
          setGroupMessagesPage(1);
        }
        
        // Backend automatically marks all unread messages as read when fetching messages
        // No need to manually mark - backend handles it and emits groupListUpdated socket event
        if (!loadOlder) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
    } catch (err) {
      console.error("❌ Failed to fetch group messages", err);
      if (!loadOlder) {
        setGroupMessages([]);
      }
      setHasMoreGroupMessages(false);
    } finally {
      if (loadOlder) {
        setLoadingOlderGroupMessages(false);
      } else {
        setLoadingGroupMessages(false);
      }
    }
  };

  // Get group members for mentions
  const getGroupMembers = () => {
    if (!selectedGroup) {
      console.log('⚠️ No selected group');
      return [];
    }
    
    // Check if members exist
    if (!selectedGroup.members || !Array.isArray(selectedGroup.members)) {
      console.log('⚠️ Group members not available:', selectedGroup);
      return [];
    }
    
    // Filter out current user from mentions
    const members = selectedGroup.members.filter(member => {
      // Ensure member has required fields
      if (!member || !member.empId) return false;
      return member.empId !== storedUser?.empId;
    });
    
    console.log('✅ Group members for mentions:', members.length, members);
    return members;
  };

  // Filter members based on mention query
  const getFilteredMembers = () => {
    const members = getGroupMembers();
    if (!mentionQuery.trim()) return members;
    const query = mentionQuery.toLowerCase();
    return members.filter(member => {
      const name = (member.employeeName || '').toLowerCase();
      const alias = (member.aliasName || '').toLowerCase();
      const empId = (member.empId || '').toLowerCase();
      return name.includes(query) || alias.includes(query) || empId.includes(query);
    });
  };

  // Handle input change for mentions
  const handleGroupInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    
    // Auto-resize textarea
    autoResizeTextarea(e.target);
    
    // Check for @ symbol
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if there's a space after @ (meaning mention is complete)
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        // Show mention dropdown
        const query = textAfterAt.toLowerCase();
        setMentionQuery(query);
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0);
        
        // Calculate dropdown position - use setTimeout to ensure DOM is updated
        setTimeout(() => {
          const textarea = e.target;
          const container = textarea.closest('.flex-1.relative');
          
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const textareaRect = textarea.getBoundingClientRect();
            
            // Position relative to the input container (absolute positioning)
            setMentionPosition({
              top: textareaRect.bottom - containerRect.top + 5, // 5px below the input
              left: 10 // Align with left padding of container
            });
          } else {
            // Fallback: position below textarea
            const rect = textarea.getBoundingClientRect();
            setMentionPosition({
              top: rect.height + 5,
              left: 10
            });
          }
        }, 0);
        return;
      }
    }
    
    // Hide dropdown if @ is not active
    setShowMentionDropdown(false);
    setMentionQuery('');
  };

  // Insert mention into input
  const insertMention = (member) => {
    const textarea = groupTextareaRef.current;
    if (!textarea) return;
    
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = input.substring(0, cursorPosition);
    const textAfterCursor = input.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = input.substring(0, lastAtIndex);
      const afterAt = textAfterCursor;
      const mentionText = `@${member.employeeName || member.aliasName || member.empId} `;
      
      const newText = beforeAt + mentionText + afterAt;
      setInput(newText);
      
      // Add to tagged users if not already added
      if (!taggedUsers.find(u => u.empId === member.empId)) {
        setTaggedUsers(prev => [...prev, {
          empId: member.empId,
          employeeName: member.employeeName,
          aliasName: member.aliasName
        }]);
      }
      
      // Hide dropdown and reset
      setShowMentionDropdown(false);
      setMentionQuery('');
      
      // Set cursor position after mention
      setTimeout(() => {
        const newPosition = beforeAt.length + mentionText.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }
  };

  // Handle keyboard navigation in mention dropdown
  const handleGroupInputKeyDown = (e) => {
    if (showMentionDropdown) {
      const filteredMembers = getFilteredMembers();
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMembers[selectedMentionIndex]) {
          insertMention(filteredMembers[selectedMentionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        setMentionQuery('');
      }
    }
    
    // Handle Enter to send message (only if not selecting mention)
    if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) {
      e.preventDefault();
      sendGroupMessage();
    }
  };

  const sendGroupMessage = async () => {
    if (!input.trim() || !selectedGroup || isSendingMessage) return;
    
    // Prevent multiple sends
    setIsSendingMessage(true);
    const messageToSend = input.trim();
    
    // Clear input and tagged users immediately to prevent duplicate sends
    setInput("");
    // Clear reply after sending
    const currentReplyingTo = replyingTo;
    setReplyingTo(null);
    const usersToTag = [...taggedUsers];
    setTaggedUsers([]);
    setShowMentionDropdown(false);

    // Create temporary ID for optimistic update
    const tempId = `temp-group-${Date.now()}-${Math.random()}`;
    
    // Optimistically add message to UI immediately
    const optimisticMessage = {
      _id: tempId,
      senderEmpId: storedUser.empId,
      senderName: storedUser.employeeName,
      senderAliasName: storedUser.aliasName,
      message: messageToSend,
      timestamp: new Date().toISOString(),
      isMyMessage: true,
      seenBy: [],
      seenCount: 0,
      taggedUsers: usersToTag,
      isOptimistic: true // Flag to identify optimistic messages
    };
    
    setGroupMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => scrollToBottom(true), 50);
    
    try {
      const formData = new FormData();
      formData.append('groupId', selectedGroup._id);
      formData.append('message', messageToSend);
      
      // Add replyTo if replying to a message
      if (currentReplyingTo) {
        formData.append('replyTo', currentReplyingTo._id || currentReplyingTo.id);
      }
      
      // Add tagged user IDs
      if (usersToTag.length > 0) {
        formData.append('taggedUserIds', JSON.stringify(usersToTag.map(u => u.empId)));
      }

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/send`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data && response.data.success) {
        // Update the optimistic message with real server data
        const realMessageId = response.data.message?._id || response.data.messageId;
        const realTimestamp = response.data.message?.timestamp || new Date().toISOString();
        
        setGroupMessages(prev => prev.map(msg => 
          msg._id === tempId 
            ? {
                ...msg,
                _id: realMessageId,
                timestamp: realTimestamp,
                isOptimistic: false
              }
            : msg
        ));
        
        // Refresh messages after a short delay to get proper server data with correct ID
        // This ensures the message ID matches what the backend sends in socket events
        setTimeout(async () => {
          await fetchGroupMessages(selectedGroup._id);
          // Scroll will happen automatically via useEffect when new messages arrive
        }, 500);
      } else {
        setTimeout(() => scrollToBottom(true), 100);
      }
    } catch (err) {
      console.error("❌ Send group message failed:", err);
      // Remove optimistic message on error
      setGroupMessages(prev => prev.filter(msg => msg._id !== tempId));
      // Restore input on error
      setInput(messageToSend);
      setTaggedUsers(usersToTag);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Upload group file with caption (for preview flow)
  const handleGroupFileUploadWithCaption = async (file, caption = '') => {
    if (!file || !selectedGroup) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('groupId', selectedGroup._id);
      
      // Determine file type and create message
      const isAudio = isAudioFile(file);
      const isImage = file.type.startsWith('image/');
      const fileTypePrefix = isAudio 
        ? `Sent an audio: ${file.name}` 
        : isImage 
        ? `Sent an image: ${file.name}` 
        : `Sent a file: ${file.name}`;
      
      // If caption is provided, combine it with file info, otherwise use default
      // Backend needs the file pattern to recognize it as a file message
      const messageText = caption.trim() 
        ? `${fileTypePrefix}\n${caption.trim()}` 
        : fileTypePrefix;
      
      formData.append('message', messageText);
      
      // Debug: Verify file is in FormData
      console.log('📤 Sending group file with caption:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        caption: caption.trim() || 'none',
        messageText: messageText,
        groupId: selectedGroup._id
      });
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/send`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data && response.data.success) {
        const messageText = caption.trim() || defaultMessage;
        
        // Add message to UI immediately with proper ID
        const newFileMessage = {
          _id: response.data?.message?._id || response.data?.messageId || Date.now().toString(),
          senderEmpId: storedUser.empId,
          senderName: storedUser.employeeName,
          senderAliasName: storedUser.aliasName,
          message: messageText,
          audio: response.data?.message?.audio || response.data?.audio || null,
          imageUrl: response.data?.message?.image || response.data?.image || null,
          fileUrl: response.data?.message?.file || response.data?.file || null,
          timestamp: new Date().toISOString(),
          isMyMessage: true,
          seenBy: [],
          seenCount: 0
        };
        
        setGroupMessages(prev => [...prev, newFileMessage]);
        setTimeout(() => scrollToBottom(true), 100);
        
        setTimeout(async () => {
          await fetchGroupMessages(selectedGroup._id);
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Group file upload failed:', error);
      throw error;
    }
  };

  const handleGroupFileUpload = async (file) => {
    if (!file || !selectedGroup) return;
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB.');
      return;
    }
    
    try {
      setUploadingFile(true);
      await handleGroupFileUploadWithCaption(file);
    } catch (error) {
      console.error('❌ Group file upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleGroupImageUpload = async (file) => {
    if (!file || !selectedGroup) return;
    
    // Validate image file types: JPG, JPEG, PNG only
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidImage = allowedImageTypes.includes(file.type) || 
                         ['jpg', 'jpeg', 'png'].includes(fileExtension);
    
    if (!isValidImage) {
      alert('Please select a valid image file (JPG, JPEG, or PNG).');
      return;
    }
    
    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB.');
      return;
    }
    
    try {
      setUploadingFile(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('groupId', selectedGroup._id);
      formData.append('message', `Sent an image: ${file.name}`);
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/send`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data && response.data.success) {
        await fetchGroupMessages(selectedGroup._id);
        // Scroll will happen automatically via useEffect when new messages arrive
      }
    } catch (error) {
      console.error('❌ Group image upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const addMembersToGroup = async (groupId, memberEmpIds) => {
    try {
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/${groupId}/add-members`,
        { memberEmpIds },
        { withCredentials: true }
      );
      if (res.data && res.data.success) {
        await fetchGroups();
        if (selectedGroup && selectedGroup._id === groupId) {
          // Refresh group details
          const groupRes = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/chat/group/${groupId}`,
            { withCredentials: true }
          );
          if (groupRes.data && groupRes.data.success) {
            setSelectedGroup(groupRes.data.group);
            // Notify NotificationHandler about chat selection change
            window.dispatchEvent(new CustomEvent('chatSelectionChanged', {
              detail: { selectedEmpId: null, selectedGroupId: groupRes.data.group._id }
            }));
          }
        }
        return true;
      }
    } catch (err) {
      console.error("❌ Failed to add members", err);
      throw err;
    }
  };

  const removeMembersFromGroup = async (groupId, memberEmpIds) => {
    try {
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/${groupId}/remove-members`,
        { memberEmpIds },
        { withCredentials: true }
      );
      if (res.data && res.data.success) {
        await fetchGroups();
        if (selectedGroup && selectedGroup._id === groupId) {
          const groupRes = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/chat/group/${groupId}`,
            { withCredentials: true }
          );
          if (groupRes.data && groupRes.data.success) {
            setSelectedGroup(groupRes.data.group);
            // Notify NotificationHandler about chat selection change
            window.dispatchEvent(new CustomEvent('chatSelectionChanged', {
              detail: { selectedEmpId: null, selectedGroupId: groupRes.data.group._id }
            }));
          }
        }
        return true;
      }
    } catch (err) {
      console.error("❌ Failed to remove members", err);
      throw err;
    }
  };

  const leaveGroup = async (groupId) => {
    try {
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/${groupId}/leave`,
        {},
        { withCredentials: true }
      );
      if (res.data && res.data.success) {
        await fetchGroups();
        if (selectedGroup && selectedGroup._id === groupId) {
          setSelectedGroup(null);
          setChatType('individual');
          setGroupMessages([]);
          // Notify NotificationHandler about chat selection change
          window.dispatchEvent(new CustomEvent('chatSelectionChanged', {
            detail: { selectedEmpId: null, selectedGroupId: null }
          }));
        }
        return true;
      }
    } catch (err) {
      console.error("❌ Failed to leave group", err);
      throw err;
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      const res = await axios.delete(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/${groupId}`,
        { withCredentials: true }
      );
      if (res.data && res.data.success) {
        await fetchGroups();
        if (selectedGroup && selectedGroup._id === groupId) {
          setSelectedGroup(null);
          setChatType('individual');
          setGroupMessages([]);
          // Notify NotificationHandler about chat selection change
          window.dispatchEvent(new CustomEvent('chatSelectionChanged', {
            detail: { selectedEmpId: null, selectedGroupId: null }
          }));
        }
        return true;
      }
    } catch (err) {
      console.error("❌ Failed to delete group", err);
      throw err;
    }
  };

  // Fetch unread counts from server
  const fetchUnreadCounts = async () => {
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/unread`,
        { withCredentials: true }
      );

      const unread = {};
      if (res.data && res.data.success && res.data.unreadBySender) {
        res.data.unreadBySender.forEach((item) => {
          if (item.unreadCount > 0 && item.sender && item.sender.empId) {
            unread[item.sender.empId] = item.unreadCount;
            
            // Notify UnreadCountContext to update sidebar badge
            window.dispatchEvent(new CustomEvent('setUnreadCount', {
              detail: {
                type: 'individual',
                empId: item.sender.empId,
                count: item.unreadCount
              }
            }));
          }
        });
      }

      console.log('📊 Fetched unread counts:', unread);
      console.log('📊 Unread counts by empId:', Object.keys(unread).map(empId => `${empId}: ${unread[empId]}`));
      console.log('📊 Current newMessagesMap before update:', newMessagesMap);
      setNewMessagesMap(unread);
      console.log('📊 Updated newMessagesMap:', unread);
      return unread; // Return the unread map for use in fetchChatList
    } catch (err) {
      console.error("❌ Failed to fetch unread counts", err);
      return {};
    }
  };

  const fetchFiles = async (empId) => {
    if (!empId) return;
    try {
      setLoadingFiles(true);
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/files/user/${empId}`,
        { withCredentials: true }
      );

      setFiles(res.data.files || []);
    } catch (err) {
      console.error("❌ Failed to fetch files:", err);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };


  // Handle reply to a message
  const handleReplyToMessage = (msg) => {
    console.log('=== Replying to message ===', msg);
    setReplyingTo(msg);
    // Focus on input field
    setTimeout(() => {
      if (chatType === 'group') {
        groupTextareaRef.current?.focus();
      } else {
        individualTextareaRef.current?.focus();
      }
    }, 100);
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Scroll to original message when clicking reply preview
  const scrollToRepliedMessage = () => {
    if (!replyingTo) return;
    
    const messageId = replyingTo._id || replyingTo.id;
    if (!messageId) return;

    // Find the message element - check both group and individual message refs
    const messageElement = groupMessageRefs.current[messageId] || 
                          document.querySelector(`[data-message-id="${messageId}"]`);
    
    if (messageElement) {
      // Highlight the message briefly
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
      
      // Scroll to the message
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    } else {
      // If message not found, try scrolling and searching after a delay
      setTimeout(() => {
        const retryElement = groupMessageRefs.current[messageId] || 
                            document.querySelector(`[data-message-id="${messageId}"]`);
        if (retryElement) {
          setHighlightedMessageId(messageId);
          setTimeout(() => setHighlightedMessageId(null), 2000);
          retryElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        } else {
          console.log('Message not found for scrolling:', messageId);
        }
      }, 300);
    }
  };

  // Scroll to replied message when clicking on the quoted message in a message bubble
  const scrollToRepliedMessageFromBubble = (replyToId) => {
    if (!replyToId) return;
    
    const messageId = replyToId._id || replyToId.id || replyToId;
    if (!messageId) return;

    // Find the message element
    const messageElement = groupMessageRefs.current[messageId] || 
                          document.querySelector(`[data-message-id="${messageId}"]`);
    
    if (messageElement) {
      // Highlight the message briefly
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
      
      // Scroll to the message
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    } else {
      // If message not found, try scrolling and searching after a delay
      setTimeout(() => {
        const retryElement = groupMessageRefs.current[messageId] || 
                            document.querySelector(`[data-message-id="${messageId}"]`);
        if (retryElement) {
          setHighlightedMessageId(messageId);
          setTimeout(() => setHighlightedMessageId(null), 2000);
          retryElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 300);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isSendingMessage) return;
    
    // Handle group message
    if (chatType === 'group' && selectedGroup) {
      await sendGroupMessage();
      return;
    }

    // Handle individual message
    if (!selectedUser) return;
    
    // Prevent multiple sends
    setIsSendingMessage(true);
    const messageToSend = input.trim();
    
    // Clear input immediately to prevent duplicate sends
    setInput("");
    // Clear reply after sending
    setReplyingTo(null);

    // Create temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    
    // Optimistically add message to UI immediately
    const optimisticMessage = {
      _id: tempId,
      senderEmpId: storedUser.empId,
      receiverEmpId: selectedUser.empId,
      message: messageToSend,
      timestamp: new Date().toISOString(),
      status: 'sent',
      isMyMessage: true,
      seenBy: null,
      seenAt: null,
      isSeen: false,
      isOptimistic: true // Flag to identify optimistic messages
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => scrollToBottom(true), 50);

    // Emit socket event immediately
    socketRef.current?.emit("newMessage", {
      senderEmpId: storedUser.empId,
      receiverEmpId: selectedUser.empId,
      message: messageToSend,
      senderName: storedUser.employeeName
    });

    try {
      const payload = {
        receiverEmpId: selectedUser.empId,
        message: messageToSend,
        ...(replyingTo ? { replyTo: replyingTo._id || replyingTo.id } : {})
      };
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/send`,
        payload,
        { withCredentials: true }
      );

      // Update the optimistic message with real server data
      if (response.data) {
        const realMessageId = response.data.message?._id || response.data.messageId;
        const realTimestamp = response.data.message?.timestamp || new Date().toISOString();
        
        setMessages(prev => prev.map(msg => 
          msg._id === tempId 
            ? {
                ...msg,
                _id: realMessageId,
                timestamp: realTimestamp,
                isOptimistic: false
              }
            : msg
        ));
        
        // Refresh messages after a short delay to get proper server data
        setTimeout(async () => {
          await fetchMessages(selectedUser.empId);
          // Scroll will happen automatically via useEffect when new messages arrive
        }, 500);
      }
    } catch (err) {
      console.error("❌ Send message failed:", err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      // Restore input on error
      setInput(messageToSend);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyPress = (e) => {
    // Use group-specific handler for group chats
    if (chatType === 'group' && selectedGroup) {
      handleGroupInputKeyDown(e);
      return;
    }
    
    // Original individual chat handler
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Only send if not already sending and input is not empty
      if (!isSendingMessage && input.trim()) {
        sendMessage();
      }
    }
  };

  const autoResizeTextarea = (textarea) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`;
    }
  };

  const handleInputChange = (e) => {
    // Use group-specific handler for group chats
    if (chatType === 'group' && selectedGroup) {
      handleGroupInputChange(e);
      return;
    }
    
    // Original individual chat handler
    setInput(e.target.value);
    // Auto-resize the active textarea
    const textarea = chatType === 'group' ? groupTextareaRef.current : individualTextareaRef.current;
    autoResizeTextarea(textarea);
  };

  const handlePaste = async (e) => {
    const clipboardData = e.clipboardData;
    
    // Check if clipboard contains image data
    const items = Array.from(clipboardData.items);
    const imageItem = items.find(item => item.type.indexOf('image') !== -1);
    
    if (imageItem) {
      // Handle image paste
      e.preventDefault();
      
      const file = imageItem.getAsFile();
      if (!file) return;
      
      // Validate image file types: JPG, JPEG, PNG only
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const isValidImage = allowedImageTypes.includes(file.type);
      
      if (!isValidImage) {
        alert('Please paste a valid image file (JPG, JPEG, or PNG).');
        return;
      }
      
      // File size limit: 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert('File size should be less than 10MB.');
        return;
      }
      
      // Generate a filename with timestamp if file doesn't have a name
      const timestamp = new Date().getTime();
      const fileExtension = file.type.split('/')[1] || 'png';
      const fileName = file.name || `pasted-image-${timestamp}.${fileExtension}`;
      
      // Create a new File object with the proper name
      const namedFile = new File([file], fileName, { type: file.type });
      
      // Show preview instead of immediate upload
      await handleImageSelect(namedFile);
      
      return;
    }
    
    // Handle text paste (existing behavior)
    const pastedText = clipboardData.getData('text');
    if (pastedText) {
      e.preventDefault();
      // Get the active textarea (group or individual)
      const textarea = chatType === 'group' ? groupTextareaRef.current : individualTextareaRef.current;
      
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = input;
        
        // Insert pasted text at cursor position
        const newValue = currentValue.substring(0, start) + pastedText + currentValue.substring(end);
        setInput(newValue);
        
        // Set cursor position after pasted text and auto-resize
        setTimeout(() => {
          const newCursorPos = start + pastedText.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
          autoResizeTextarea(textarea);
        }, 0);
      } else {
        // Fallback: append if textarea ref not available
        setInput(prev => prev + pastedText);
      }
    }
  };

  // Helper function to detect audio files
  const isAudioFile = (file) => {
    const audioFormats = ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'webm', 'flac'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    return audioFormats.includes(fileExt || '') || file.type.startsWith('audio/');
  };

  // Upload file with caption (for preview flow)
  const handleFileUploadWithCaption = async (file, caption = '') => {
    if (!file || !selectedUser) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('receiverEmpId', selectedUser.empId);
      
      // Determine file type and create message
      const isAudio = isAudioFile(file);
      const isImage = file.type.startsWith('image/');
      const fileTypePrefix = isAudio 
        ? `Sent an audio: ${file.name}` 
        : isImage 
        ? `Sent an image: ${file.name}` 
        : `Sent a file: ${file.name}`;
      
      // If caption is provided, combine it with file info, otherwise use default
      // Backend needs the file pattern to recognize it as a file message
      const messageText = caption.trim() 
        ? `${fileTypePrefix}\n${caption.trim()}` 
        : fileTypePrefix;
      
      formData.append('message', messageText);
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/send`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Add file message to UI immediately with proper ID
      const newFileMessage = {
        _id: response.data?.messageId || response.data?.id || response.data?.message?._id || Date.now().toString(),
        senderEmpId: storedUser.empId,
        receiverEmpId: selectedUser.empId,
        message: messageText,
        audio: response.data?.message?.audio || response.data?.audio || null,
        imageUrl: response.data?.message?.image || response.data?.image || null,
        fileUrl: response.data?.message?.file || response.data?.file || null,
        timestamp: new Date().toISOString(),
        status: 'sent',
        fileName: file.name,
        fileType: isAudio ? 'audio' : isImage ? 'image' : 'document'
      };
      
      setMessages(prev => [...prev, newFileMessage]);
      setTimeout(() => scrollToBottom(true), 100);
      
      setTimeout(async () => {
        await fetchMessages(selectedUser.empId);
      }, 1500);
      
      socketRef.current?.emit("newMessage", {
        senderEmpId: storedUser.empId,
        receiverEmpId: selectedUser.empId,
        message: messageText,
        audio: response.data?.message?.audio || response.data?.audio || null,
        image: response.data?.message?.image || response.data?.image || null,
        file: response.data?.message?.file || response.data?.file || null,
        senderName: storedUser.employeeName
      });
      
      setTimeout(() => scrollToBottom(true), 100);
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw error;
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !selectedUser) return;
    
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
    
    try {
      setUploadingFile(true);
      await handleFileUploadWithCaption(file);
    } catch (error) {
      console.error('❌ File upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file || !selectedUser) return;
    
    // Validate image file types: JPG, JPEG, PNG only
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidImage = allowedImageTypes.includes(file.type) || 
                         ['jpg', 'jpeg', 'png'].includes(fileExtension);
    
    if (!isValidImage) {
      alert('Please select a valid image file (JPG, JPEG, or PNG).');
      return;
    }
    
    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB.');
      return;
    }
    
    try {
      setUploadingFile(true);
      
      const formData = new FormData();
      formData.append('file', file); // Changed from 'image' to 'file'
      formData.append('receiverEmpId', selectedUser.empId);
      formData.append('message', `Sent an image: ${file.name}`);
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/send`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Add image message to UI immediately with proper ID
      const newImageMessage = {
        _id: response.data?.messageId || response.data?.id || response.data?.message?._id || Date.now().toString(),
        senderEmpId: storedUser.empId,
        receiverEmpId: selectedUser.empId,
        message: `Sent an image: ${file.name}`,
        timestamp: new Date().toISOString(),
        status: 'sent',
        fileName: file.name,
        fileType: 'image'
      };
      
      setMessages(prev => [...prev, newImageMessage]);
      // Scroll immediately after adding message
      setTimeout(() => scrollToBottom(true), 100);
      
      // Refresh messages to get proper server data
      setTimeout(async () => {
        await fetchMessages(selectedUser.empId);
        // Scroll will happen automatically via useEffect when new messages arrive
      }, 1500);
      
      socketRef.current?.emit("newMessage", {
        senderEmpId: storedUser.empId,
        receiverEmpId: selectedUser.empId,
        message: `Sent an image: ${file.name}`,
        senderName: storedUser.employeeName
      });
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Helper function to create preview for a file
  const createFilePreview = (file) => {
    return new Promise((resolve) => {
      const fileType = file.type;
      let preview = null;
      let type = 'document';

      if (fileType.startsWith('image/')) {
        type = 'image';
        preview = URL.createObjectURL(file);
        resolve({ file, preview, type });
      } else if (isAudioFile(file)) {
        type = 'audio';
        preview = URL.createObjectURL(file);
        resolve({ file, preview, type });
      } else {
        type = 'document';
        resolve({ file, preview: null, type });
      }
    });
  };

  // Handle file selection - show preview instead of immediate upload
  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file types - check both extension and MIME type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = {
      images: ['jpg', 'jpeg', 'png'],
      documents: ['pdf', 'xlsx', 'xls', 'xlsm', 'xlsb'],
      audio: ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'webm', 'flac']
    };
    
    const allAllowed = [...allowedExtensions.images, ...allowedExtensions.documents, ...allowedExtensions.audio];
    
    // Check extension
    const isValidExtension = allAllowed.includes(fileExtension);
    // Check MIME type (for audio files especially)
    const isValidMimeType = file.type.startsWith('audio/') || 
                           file.type.startsWith('image/') || 
                           file.type === 'application/pdf' ||
                           file.type.includes('spreadsheet') ||
                           file.type.includes('excel');
    
    if (!isValidExtension && !isValidMimeType) {
      alert('Please select a valid file type:\n- Images: JPG, JPEG, PNG\n- Documents: PDF, XLSX, XLS, XLSM, XLSB\n- Audio: MP3, WAV, M4A, OGG, AAC, WEBM, FLAC');
      return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB.');
      return;
    }

    // Create preview
    const previewData = await createFilePreview(file);
    setPreviewFiles([...previewFiles, { ...previewData, caption: '' }]);
    setShowFilePreview(true);
    setPreviewCaption('');
  };

  // Handle image selection - show preview instead of immediate upload
  const handleImageSelect = async (file) => {
    if (!file) return;

    // Validate image file types: JPG, JPEG, PNG only
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidImage = allowedImageTypes.includes(file.type) || 
                         ['jpg', 'jpeg', 'png'].includes(fileExtension);
    
    if (!isValidImage) {
      alert('Please select a valid image file (JPG, JPEG, or PNG).');
      return;
    }
    
    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB.');
      return;
    }

    // Create preview
    const previewData = await createFilePreview(file);
    setPreviewFiles([...previewFiles, { ...previewData, caption: '' }]);
    setShowFilePreview(true);
    setPreviewCaption('');
  };

  // Handle audio selection - show preview instead of immediate upload
  const handleAudioSelect = async (file) => {
    if (!file) return;

    // Validate audio file types
    if (!isAudioFile(file)) {
      alert('Please select a valid audio file (MP3, WAV, M4A, OGG, AAC, WEBM, FLAC).');
      return;
    }
    
    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB.');
      return;
    }

    // Create preview
    const previewData = await createFilePreview(file);
    setPreviewFiles([...previewFiles, { ...previewData, caption: '' }]);
    setShowFilePreview(true);
    setPreviewCaption('');
  };

  // Close preview and clear files
  const closeFilePreview = () => {
    // Clean up object URLs
    previewFiles.forEach(({ preview }) => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });
    setPreviewFiles([]);
    setPreviewCaption('');
    setShowFilePreview(false);
  };

  // Remove a file from preview
  const removePreviewFile = (index) => {
    const fileToRemove = previewFiles[index];
    // Clean up object URL
    if (fileToRemove.preview && fileToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    const newFiles = previewFiles.filter((_, i) => i !== index);
    setPreviewFiles(newFiles);
    if (newFiles.length === 0) {
      setShowFilePreview(false);
      setPreviewCaption('');
    }
  };

  // Send files with captions
  const sendPreviewFiles = async () => {
    if (previewFiles.length === 0) return;
    if (!selectedUser && !selectedGroup) return;

    try {
      setUploadingFile(true);
      setShowFilePreview(false);

      // Use the main caption for all files if provided, otherwise use individual captions
      const mainCaption = previewCaption.trim();
      
      // Send each file with its caption
      for (const previewFile of previewFiles) {
        const { file, caption } = previewFile;
        // Use main caption if provided, otherwise use individual caption, otherwise use default
        const messageText = mainCaption || caption.trim() || (previewFile.type === 'audio' 
          ? `Sent an audio: ${file.name}` 
          : previewFile.type === 'image' 
          ? `Sent an image: ${file.name}` 
          : `Sent a file: ${file.name}`);

        if (chatType === 'group' && selectedGroup) {
          await handleGroupFileUploadWithCaption(file, messageText);
        } else if (selectedUser) {
          await handleFileUploadWithCaption(file, messageText);
        }
      }

      // Clean up
      previewFiles.forEach(({ preview }) => {
        if (preview && preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
      setPreviewFiles([]);
      setPreviewCaption('');
    } catch (error) {
      console.error('❌ Failed to send files:', error);
      alert('Failed to send files. Please try again.');
      setShowFilePreview(true); // Re-show preview on error
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  };

  const handleImageInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageSelect(file);
    }
    e.target.value = '';
  };

  const searchUsers = async (query) => {
    if (!query) return setChatUsers([]);
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/search-users?q=${query}`,
        { withCredentials: true }
      );
      setChatUsers(res.data || []);
    } catch (err) {
      console.error("❌ Failed to search users:", err);
      setChatUsers([]);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchUsers(value);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': return <Circle size={12} className="text-green-500 fill-current" />;
      case 'offline': return <MinusCircle size={12} className="text-gray-400" />;
      case 'away': return <AlertCircle size={12} className="text-yellow-500" />;
      default: return <Circle size={12} className="text-green-500 fill-current" />;
    }
  };

  const getMessageStatus = (status, isSeen, seenBy) => {
    if (isSeen && seenBy) {
      return <CheckCheck size={14} className="text-blue-500" />;
    }
    switch (status) {
      case 'sent': return <Check size={14} className="text-gray-400" />; // Single tick for sent messages in individual chat
      case 'delivered': return <Check size={14} className="text-gray-400" />;
      case 'seen': return <CheckCheck size={14} className="text-blue-500" />;
      case 'read': return <CheckCheck size={14} className="text-blue-500" />;
      default: return <Check size={14} className="text-gray-400" />; // Single tick as default for individual chat
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Mark group message as seen
  // CRITICAL: Must call this when user views messages in group chat (per guide)
  const markGroupMessageAsSeen = async (groupId, messageId) => {
    if (!groupId || !messageId) return;
    
    // Check if already marked as seen to avoid duplicate calls
    const seenKey = `${groupId}-${messageId}`;
    if (markedAsSeenRef.current.has(seenKey)) {
      return;
    }
    
    // Check if message is sent by current user (don't mark own messages as seen)
    const message = groupMessages.find(msg => msg._id === messageId);
    if (message && (message.senderEmpId === storedUser?.empId || message.isMyMessage)) {
      return;
    }
    
    try {
      // Per docs: PATCH /api/v1/chat/group/:groupId/messages/:messageId/seen
      const res = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/${groupId}/messages/${messageId}/seen`,
        {},
        { withCredentials: true }
      );
      
      if (res.data && res.data.success) {
        markedAsSeenRef.current.add(seenKey);
        console.log(`✅ Marked group message as seen: groupId=${groupId}, messageId=${messageId}`);
        // Backend will automatically emit groupListUpdated with updated unreadCount
        // No need to manually update - socket event will handle it (per guide)
      }
    } catch (err) {
      console.error("❌ Failed to mark group message as seen:", err);
      // Don't add to set if failed, so it can retry
    }
  };

  // Check if message is seen by current user
  const isMessageSeenByMe = (message) => {
    if (!message || !storedUser?.empId) return false;
    return message.seenBy?.some(s => s.empId === storedUser.empId || s.seenByEmpId === storedUser.empId);
  };

  // Open image viewer modal
  const openImageModal = (imageUrl, imageName = null) => {
    setSelectedImageUrl(imageUrl);
    setSelectedImageName(imageName);
    setShowImageModal(true);
  };

  // Close image viewer modal
  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImageUrl(null);
    setSelectedImageName(null);
  };

  // Handle ESC key to close image modal and file preview
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showImageModal) {
          closeImageModal();
        } else if (showFilePreview) {
          closeFilePreview();
        }
      }
    };

    if (showImageModal || showFilePreview) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showImageModal, showFilePreview]);

  // Update individual message seen status when socket event is received
  const updateIndividualMessageSeenStatus = (messageIds, seenBy, seenAt) => {
    if (!messageIds || !Array.isArray(messageIds) || !seenBy) return;
    
    setMessages(prevMessages => {
      let updated = false;
      const updatedMessages = prevMessages.map(msg => {
        const msgId = String(msg._id || '');
        const isInList = messageIds.some(id => String(id) === msgId);
        
        if (isInList && msg.isMyMessage) {
          // Check if already seen
          const alreadySeen = msg.isSeen || msg.seenBy;
          
          if (!alreadySeen) {
            updated = true;
            return {
              ...msg,
              seenBy: seenBy,
              seenAt: seenAt || new Date().toISOString(),
              isSeen: true,
              status: 'seen'
            };
          }
        }
        return msg;
      });
      
      if (updated) {
        return updatedMessages;
      }
      return prevMessages;
    });
  };

  // Update message seen status when socket event is received
  const updateGroupMessageSeenStatus = (messageId, seenByData, isFullArray = false) => {
    if (!messageId || !seenByData) return;
    
    console.log('🔄 Updating group message seen status:', { messageId, seenByData, isFullArray });
    
    setGroupMessages(prevMessages => {
      let messageFound = false;
      let updated = false;
      
      const updatedMessages = prevMessages.map(msg => {
        // Match by _id (could be string or ObjectId)
        const msgId = String(msg._id || '');
        const targetId = String(messageId || '');
        
        if (msgId === targetId) {
          messageFound = true;
          
          if (isFullArray && Array.isArray(seenByData)) {
            // Backend sent full array - replace existing
            updated = true;
            return {
              ...msg,
              seenBy: seenByData,
              seenCount: seenByData.length
            };
          } else {
            // Single user addition
            const currentSeenBy = msg.seenBy || [];
            
            // Check if this user already in seenBy array
            const alreadySeen = currentSeenBy.some(
              s => {
                const sEmpId = s.empId || s.seenByEmpId || '';
                const newEmpId = seenByData.empId || seenByData.seenByEmpId || '';
                return sEmpId && newEmpId && String(sEmpId) === String(newEmpId);
              }
            );
            
            if (!alreadySeen) {
              updated = true;
              const newSeenBy = [...currentSeenBy, seenByData];
              return {
                ...msg,
                seenBy: newSeenBy,
                seenCount: newSeenBy.length
              };
            }
          }
        }
        return msg;
      });
      
      // If message not found, refresh messages to get latest data
      if (!messageFound && selectedGroup?._id) {
        console.log('⚠️ Message not found in current list, refreshing...');
        setTimeout(() => {
          fetchGroupMessages(selectedGroup._id);
        }, 100);
      }
      
      // If message was updated, return new array to trigger re-render
      if (updated) {
        console.log('✅ Group message seen status updated successfully');
        return updatedMessages;
      }
      // Even if not updated, ensure seenCount matches seenBy length
      const finalMessages = updatedMessages.map(msg => {
        if (msg.seenBy && Array.isArray(msg.seenBy)) {
          const calculatedCount = msg.seenBy.length;
          if (msg.seenCount !== calculatedCount) {
            return { ...msg, seenCount: calculatedCount };
          }
        }
        return msg;
      });
      return finalMessages;
    });
  };

  // Fetch seen-by data for a message
  const fetchSeenBy = async (messageId, isGroupMessage = false) => {
    if (!messageId) return;
    
    setLoadingSeenBy(true);
    try {
      let endpoint;
      if (isGroupMessage) {
        endpoint = `${API_CONFIG.BASE_URL}/api/v1/chat/group/message/${messageId}/seen-by`;
      } else {
        endpoint = `${API_CONFIG.BASE_URL}/api/v1/chat/message/${messageId}/seen-by`;
      }
      
      const res = await axios.get(endpoint, { withCredentials: true });
      
      if (res.data && res.data.success) {
        setSeenByData({
          messageId,
          seenBy: res.data.seenBy || [],
          message: res.data.message || ''
        });
        setShowSeenByModal(true);
      } else {
        // Fallback: use message data if API doesn't exist yet
        const message = isGroupMessage 
          ? groupMessages.find(m => m._id === messageId)
          : messages.find(m => m._id === messageId);
        
        setSeenByData({
          messageId,
          seenBy: message?.seenBy || [],
          message: message?.message || ''
        });
        setShowSeenByModal(true);
      }
    } catch (err) {
      console.error("❌ Failed to fetch seen-by data:", err);
      // Fallback: use message data if API doesn't exist
      const message = isGroupMessage 
        ? groupMessages.find(m => m._id === messageId)
        : messages.find(m => m._id === messageId);
      
      setSeenByData({
        messageId,
        seenBy: message?.seenBy || [],
        message: message?.message || ''
      });
      setShowSeenByModal(true);
    } finally {
      setLoadingSeenBy(false);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    // Add voice recording logic here
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Stop recording and send voice message
  };

  useEffect(() => {
    const localUser =
      JSON.parse(sessionStorage.getItem("user")) ||
      JSON.parse(localStorage.getItem("user"));

    if (!localUser?.empId) {
      return (window.location.href = "/login");
    }

    axios
      .get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/${localUser.empId}`,
        { withCredentials: true }
      )
      .then((res) => {
        setStoredUser(res.data.employee);
        // Fetch chat list and groups after user is loaded
        fetchChatList();
        fetchGroups();
        // DON'T fetch unread counts - only track NEW messages via socket events
        // This ensures red dots only appear for messages received AFTER user views the chat
      })
      .catch((err) => {
        console.error("❌ Failed to load full stored user profile", err);
      })
      .finally(() => setLoading(false));
      
    // Request notification permission
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (storedUser?.empId && selectedUser?.empId && chatType === 'individual') {
      fetchMessages(selectedUser.empId);
    }
  }, [selectedUser, storedUser, chatType]);

  useEffect(() => {
    if (storedUser?.empId && selectedGroup?._id && chatType === 'group') {
      fetchGroupMessages(selectedGroup._id);
    }
  }, [selectedGroup, storedUser, chatType]);

  // Fetch chat list when storedUser changes
  useEffect(() => {
    if (storedUser?.empId) {
      fetchChatList();
    }
  }, [storedUser]);

  // DON'T fetch unread counts on initial load - only track NEW messages via socket events
  // This ensures we only show red dots for messages received AFTER user views the chat
  // useEffect(() => {
  //   if (storedUser?.empId) {
  //     fetchUnreadCounts();
  //   }
  // }, [storedUser]);

  // Note: Group unread counts are now handled by groupListUpdated socket event (per guide)
  // No need for this listener - backend sends groupListUpdated with unreadCount

  // Auto-resize textarea when input changes or chat type switches
  useEffect(() => {
    const textarea = chatType === 'group' ? groupTextareaRef.current : individualTextareaRef.current;
    if (textarea) {
      autoResizeTextarea(textarea);
    }
  }, [input, chatType]);

  // Intersection Observer to mark group messages as seen when they come into view
  useEffect(() => {
    if (chatType !== 'group' || !selectedGroup?._id || groupMessages.length === 0) {
      return;
    }

    const observers = [];
    const groupId = selectedGroup._id;

    // Create intersection observer for each message
    groupMessages.forEach(message => {
      const element = groupMessageRefs.current[message._id];
      if (!element) return;

      // Skip if message is sent by current user or already marked as seen
      if (message.senderEmpId === storedUser?.empId || message.isMyMessage || isMessageSeenByMe(message)) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Message is visible, mark as seen
              markGroupMessageAsSeen(groupId, message._id);
              // Stop observing once seen
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.5 // Message is considered seen when 50% is visible
        }
      );

      observer.observe(element);
      observers.push({ observer, element });
    });

    // Cleanup
    return () => {
      observers.forEach(({ observer, element }) => {
        observer.unobserve(element);
      });
    };
  }, [groupMessages, selectedGroup, chatType, storedUser]);

  // Merge unread data with chat list
  const mergeUnreadData = (chatList, unreadData) => {
    return chatList.map(user => {
      const unreadCount = unreadData[user.empId] || 0;
      return {
        ...user,
        unreadCount,
        hasUnread: unreadCount > 0
      };
    });
  };

  // Sort chat list with unread priority
  const sortChatListWithUnreadPriority = (chatList, unreadMap) => {
    return chatList.sort((a, b) => {
      const aUnread = unreadMap[a.empId] || 0;
      const bUnread = unreadMap[b.empId] || 0;
      
      // First priority: unread messages (higher count first)
      if (aUnread > 0 && bUnread === 0) return -1;
      if (aUnread === 0 && bUnread > 0) return 1;
      if (aUnread > 0 && bUnread > 0) {
        // If both have unread, sort by unread count (higher first)
        if (aUnread !== bUnread) return bUnread - aUnread;
      }
      
      // Second priority: last message time (latest first)
      const timeA = lastMessageTime[a.empId] || new Date(0);
      const timeB = lastMessageTime[b.empId] || new Date(0);
      return timeB - timeA;
    });
  };

  // Fetch files when selectedUser changes
  useEffect(() => {
    if (selectedUser?.empId) {
      fetchFiles(selectedUser.empId);
    }
  }, [selectedUser]);

  // Close mention dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(event.target) &&
        groupTextareaRef.current &&
        !groupTextareaRef.current.contains(event.target)
      ) {
        setShowMentionDropdown(false);
        setMentionQuery('');
      }
    };

    if (showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMentionDropdown]);

  // Reset tagged users and mention state when group changes
  useEffect(() => {
    setTaggedUsers([]);
    setShowMentionDropdown(false);
    setMentionQuery('');
  }, [selectedGroup?._id]);

  useEffect(() => {
    if (!storedUser?.empId) return;

    console.log('🚀 Chat.jsx: Using SHARED socket service (reduces server load!)');
    
    // Get shared socket instance
    const socket = sharedSocketService.getSocket();
    
    if (!socket) {
      console.warn('⚠️ Chat.jsx: Shared socket not initialized yet. Waiting...');
      // Wait for socket to be initialized
      const checkSocket = setInterval(() => {
        const s = sharedSocketService.getSocket();
        if (s) {
          clearInterval(checkSocket);
          socketRef.current = s;
          setupSocketListeners(s);
        }
      }, 100);
      
      return () => clearInterval(checkSocket);
    }

    socketRef.current = socket;
    
    // Handle user online status - using correct event names from backend
    const handleUserOnline = (empId) => {
      if (empId && empId !== storedUser.empId) {
        setOnlineUsers(prev => new Set([...prev, empId]));
      }
    };

    const handleUserOffline = (empId) => {
      if (empId && empId !== storedUser.empId) {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(empId);
          return newSet;
        });
      }
    };

    const handleNewMessage = async ({ senderEmpId, receiverEmpId, message, senderName, audio, image, file }) => {
      // Mark sender as online when they send a message
      if (senderEmpId && senderEmpId !== storedUser.empId) {
        setOnlineUsers(prev => new Set([...prev, senderEmpId]));
      }

      // Check if this message is for current user (as receiver)
      const isForMe = receiverEmpId === storedUser.empId;
      // Check if this message is from current selected user
      const isFromSelectedUser = senderEmpId === selectedUser?.empId;
      // Check if this message is to current selected user
      const isToSelectedUser = receiverEmpId === selectedUser?.empId;

      // Determine notification message based on content type
      let notificationMessage = message || "Sent you a message";
      if (audio) {
        notificationMessage = "Sent you an audio message 🎵";
      } else if (image) {
        notificationMessage = "Sent you an image 📷";
      } else if (file) {
        notificationMessage = "Sent you a file 📎";
      }

      // Show notification if message is for current user and not from current selected user
      // Also show if no chat is currently selected (user is not viewing any chat)
      if (isForMe && (!selectedUser || !isFromSelectedUser)) {
        const senderDisplayName = senderName || "Someone";
        
        // Always show in-app notification
        displayInAppNotification(`New Message from ${senderDisplayName}`, notificationMessage, senderDisplayName);
        
        // Try browser notification (will only show if permission granted)
        showNotification(`New Message from ${senderDisplayName}`, notificationMessage, senderDisplayName);
      }

      // Update last message time for sorting
      setLastMessageTime(prev => ({
        ...prev,
        [senderEmpId]: new Date()
      }));

      // Update unread count for the sender
      if (isForMe && !isFromSelectedUser) {

        updateUnreadCount(senderEmpId, 1);
        
        // Re-sort chat list to move unread users to top (don't fetch unread counts from server)
        setTimeout(async () => {
          await fetchChatList();
        }, 500);
      }

      // If message is for current user OR involves current selected user, refresh messages
      if ((isForMe && isFromSelectedUser) || (isToSelectedUser && senderEmpId === storedUser.empId)) {

        await fetchMessages(selectedUser.empId);
        setTimeout(scrollToBottom, 100);
      }

      // Update chat list to show new message count
      await fetchChatList();
    };

    // Handle individual message seen status updates
    const handleMessageSeen = ({ senderEmpId, receiverEmpId, receiverName, receiverAliasName, messageIds, seenAt, seenCount }) => {
      // Only update if it's for the currently selected user and messages are from current user
      if (selectedUser?.empId === receiverEmpId && senderEmpId === storedUser?.empId && messageIds) {
        updateIndividualMessageSeenStatus(messageIds, {
          empId: receiverEmpId,
          employeeName: receiverName,
          aliasName: receiverAliasName
        }, seenAt);
      }
    };

    const handleNewGroupMessage = async ({ groupId, groupName, senderEmpId, senderName, senderAliasName, message, audio, image, file }) => {
      // Mark sender as online when they send a message
      if (senderEmpId && senderEmpId !== storedUser.empId) {
        setOnlineUsers(prev => new Set([...prev, senderEmpId]));
      }

      // Check if this message is for current selected group
      const isForSelectedGroup = selectedGroup?._id === groupId;
      const isFromMe = senderEmpId === storedUser.empId;

      // Determine notification message based on content type
      let notificationMessage = message || "Sent a message";
      if (audio) {
        notificationMessage = "Sent an audio message 🎵";
      } else if (image) {
        notificationMessage = "Sent an image 📷";
      } else if (file) {
        notificationMessage = "Sent a file 📎";
      }

      // Show notification if message is not from me and (not for selected group OR no group is selected)
      // This ensures notifications show even when user is not viewing the group or viewing a different group
      if (!isFromMe && (!selectedGroup || !isForSelectedGroup)) {
        const senderDisplayName = senderName || "Someone";
        const groupDisplayName = groupName || "Group";
        
        // Always show in-app notification
        displayInAppNotification(`${groupDisplayName}: ${senderDisplayName}`, notificationMessage, `${senderDisplayName} in ${groupDisplayName}`);
        
        // Try browser notification (will only show if permission granted)
        showNotification(`${groupDisplayName}: ${senderDisplayName}`, notificationMessage, `${senderDisplayName} in ${groupDisplayName}`);
      }
      
      // If message is for selected group, refresh messages
      if (isForSelectedGroup) {
        await fetchGroupMessages(groupId);
        setTimeout(scrollToBottom, 100);
        // Backend will automatically mark messages as read and emit groupListUpdated
        // No need to manually update unread count - socket event handles it
      } else {
        // If message is NOT for selected group, backend will emit groupListUpdated
        // with updated unreadCount - socket event handler will update the UI
        // No need to manually recalculate - rely on socket events
      }

      // Refresh groups list to update last message
      await fetchGroups();
    };

    // Handle group message seen status updates
    // Per docs: event structure is { groupId, messageId, seenBy: { empId, employeeName, aliasName, seenAt } }
    const handleGroupMessageSeen = ({ groupId, messageId, seenBy }) => {
      console.log('🔔 Group message seen event received:', { groupId, messageId, seenBy });
      
      // Only update if it's for the currently selected group
      if (selectedGroup?._id === groupId && messageId && seenBy) {
        // Update the message's seenBy list in real-time (per docs example)
        setGroupMessages(prevMessages => 
          prevMessages.map(msg => {
            if (String(msg._id) === String(messageId)) {
              // Ensure seenBy is an array
              const currentSeenBy = Array.isArray(msg.seenBy) ? msg.seenBy : [];
              
              // Check if user already in seenBy list (per docs)
              const alreadySeen = currentSeenBy.some(s => s.empId === seenBy.empId);
              
              if (!alreadySeen) {
                // Add new seenBy entry and increment count
                return {
                  ...msg,
                  seenBy: [...currentSeenBy, seenBy],
                  seenCount: (msg.seenCount || 0) + 1
                };
              }
            }
            return msg;
          })
        );
      }
    };

    // Handle chat list updates from backend (for unread count changes)
    const handleChatListUpdated = (updatedChatItem) => {
      console.log('📬📬📬 CHAT LIST UPDATED EVENT RECEIVED! 📬📬📬');
      console.log('📬 Chat list updated event received:', updatedChatItem);
      console.log('📍 Socket ID:', socket?.id);
      console.log('📍 Socket connected:', socket?.connected);
      
      if (!updatedChatItem || !updatedChatItem.empId) {
        console.warn('⚠️ Invalid chatListUpdated event data:', updatedChatItem);
        return;
      }

      const { empId, unreadCount, online, lastMessage, lastMessageTime, employeeName, aliasName } = updatedChatItem;

      // Update online status
      if (online !== undefined) {
        if (online && empId !== storedUser?.empId) {
          setOnlineUsers(prev => new Set([...prev, empId]));
        } else if (!online) {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(empId);
            return newSet;
          });
        }
      }

      // Update unread count and chat list item (using functional updates to get latest state)
      setNewMessagesMap(prevUnreadMap => {
        const updatedUnreadMap = { ...prevUnreadMap };
        if (unreadCount > 0) {
          updatedUnreadMap[empId] = unreadCount;
        } else {
          delete updatedUnreadMap[empId];
        }

        // Notify UnreadCountContext to update sidebar badge
        window.dispatchEvent(new CustomEvent('setUnreadCount', {
          detail: {
            type: 'individual',
            empId: empId,
            count: unreadCount
          }
        }));

        // Update chat list with the new unread map
        setChatList(prevList => {
          const existingIndex = prevList.findIndex(chat => chat.empId === empId);
          
          if (existingIndex !== -1) {
            // Update existing chat item
            const updatedList = [...prevList];
            updatedList[existingIndex] = {
              ...updatedList[existingIndex],
              ...(lastMessage !== undefined && { lastMessage }),
              ...(lastMessageTime !== undefined && { lastMessageTime }),
              ...(employeeName !== undefined && { employeeName }),
              ...(aliasName !== undefined && { aliasName }),
              ...(online !== undefined && { online })
            };
            
            return sortChatListWithUnreadPriority(updatedList, updatedUnreadMap);
          } else {
            // Chat item doesn't exist in list yet, add it
            const newChatItem = {
              empId,
              employeeName: employeeName || aliasName || 'Unknown',
              aliasName: aliasName || employeeName || 'Unknown',
              lastMessage: lastMessage || '',
              lastMessageTime: lastMessageTime || new Date().toISOString(),
              online: online || false,
              unreadCount: unreadCount || 0  // Store unreadCount in chat item (per guide)
            };

            const updatedList = [newChatItem, ...prevList];
            return sortChatListWithUnreadPriority(updatedList, updatedUnreadMap);
          }
        });

        return updatedUnreadMap;
      });
    };

    // Handle group list updates from backend (for unread count changes)
    // Backend sends unreadCount in the socket event - use it directly (per docs)
    const handleGroupListUpdated = (updatedGroupItem) => {
      console.log('📬 Group list updated event received:', updatedGroupItem);
      
      if (!updatedGroupItem || !updatedGroupItem._id) {
        console.warn('⚠️ Invalid groupListUpdated event data:', updatedGroupItem);
        return;
      }

      // Normalize groupId to string
      const groupId = String(updatedGroupItem._id);
      const { groupName, lastMessage, unreadCount } = updatedGroupItem;

      // Use unreadCount from socket event directly (backend calculates it)
      // unreadCount: 0 means no red dot, > 0 means show red dot with count
      const actualUnreadCount = unreadCount || 0;

      // Update unread count map for red dot display
      setNewGroupMessagesMap(prev => {
        const updated = { ...prev };
        if (actualUnreadCount > 0) {
          updated[groupId] = actualUnreadCount;
        } else {
          // Remove from map if unreadCount is 0 (no red dot)
          delete updated[groupId];
        }

        // Notify UnreadCountContext to update sidebar badge
        window.dispatchEvent(new CustomEvent('setUnreadCount', {
          detail: {
            type: 'group',
            groupId: groupId,
            count: actualUnreadCount
          }
        }));

        return updated;
      });

      // Update group in groups list
      setGroups(prevGroups => {
        const groupIndex = prevGroups.findIndex(g => String(g._id) === groupId);
        if (groupIndex !== -1) {
          // Update existing group
          const updated = [...prevGroups];
          updated[groupIndex] = {
            ...updated[groupIndex],
            ...(groupName !== undefined && { groupName }),
            ...(lastMessage !== undefined && { lastMessage }),
            unreadCount: actualUnreadCount  // Use unreadCount from socket event
          };
          return updated;
        } else {
          // Group doesn't exist in list yet, add it
          return [...prevGroups, {
            ...updatedGroupItem,
            _id: groupId,
            unreadCount: actualUnreadCount
          }];
        }
      });
    };

    // Set up all socket listeners
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("newMessage", handleNewMessage);
    socket.on("newGroupMessage", handleNewGroupMessage);
    socket.on("groupMessageSeen", handleGroupMessageSeen);
    // Also listen for alternative event names that backend might use
    socket.on("groupMessageSeenUpdated", handleGroupMessageSeen);
    socket.on("groupMessageRead", handleGroupMessageSeen);
    socket.on("messageSeen", handleMessageSeen);
    socket.on("chatListUpdated", handleChatListUpdated);
    socket.on("groupListUpdated", handleGroupListUpdated);  // 🔥 Added per guide
    
    // Debug: Listen for ALL events to see what's coming from backend
    socket.onAny((eventName, ...args) => {
      console.log('🔔🔔🔔 Chat.jsx - Socket event received:', eventName, args);
      // If it's a seen-related event, try to handle it
      if (eventName.includes('seen') || eventName.includes('read')) {
        console.log('👁️ Seen-related event detected:', eventName, args);
      }
    });
    
    console.log('✅ Chat.jsx - All socket listeners set up');
    console.log('📍 Listening for: user_online, user_offline, newMessage, newGroupMessage, groupMessageSeen, messageSeen, chatListUpdated, groupListUpdated');

    // Cleanup - Remove listeners but DON'T disconnect (shared socket stays connected)
    return () => {
      if (socketRef.current) {
        console.log('🧹 Chat.jsx: Removing socket listeners (socket stays connected)');
        socketRef.current.off("newMessage", handleNewMessage);
        socketRef.current.off("newGroupMessage", handleNewGroupMessage);
        socketRef.current.off("groupMessageSeen", handleGroupMessageSeen);
        socketRef.current.off("groupMessageSeenUpdated", handleGroupMessageSeen);
        socketRef.current.off("groupMessageRead", handleGroupMessageSeen);
        socketRef.current.off("messageSeen", handleMessageSeen);
        socketRef.current.off("user_online", handleUserOnline);
        socketRef.current.off("user_offline", handleUserOffline);
        socketRef.current.off("chatListUpdated", handleChatListUpdated);
        socketRef.current.off("groupListUpdated", handleGroupListUpdated);  // 🔥 Added per guide
      }
    };
  }, [storedUser, selectedUser, selectedGroup, groupMessages]);

  // Handle scroll to load older messages for individual chat
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !selectedUser?.empId || chatType !== 'individual') return;

    let isLoading = false; // Prevent multiple simultaneous loads

    const handleScroll = () => {
      // Check if user scrolled near the top (within 200px)
      if (container.scrollTop < 200 && hasMoreMessages && !loadingOlderMessages && !isLoading) {
        isLoading = true;
        // Store current scroll position and first message element
        const previousScrollHeight = container.scrollHeight;
        const firstMessage = container.querySelector('[data-message-id]');
        const firstMessageId = firstMessage?.getAttribute('data-message-id');
        
        // Load older messages
        fetchMessages(selectedUser.empId, true).then(() => {
          // Restore scroll position after new messages are loaded
          setTimeout(() => {
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - previousScrollHeight;
            container.scrollTop = scrollDiff;
            isLoading = false;
          }, 100);
        }).catch(() => {
          isLoading = false;
        });
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      isLoading = false;
    };
  }, [selectedUser?.empId, hasMoreMessages, loadingOlderMessages, chatType]);

  // Handle scroll to load older messages for group chat
  useEffect(() => {
    const container = groupMessagesContainerRef.current;
    if (!container || !selectedGroup?._id || chatType !== 'group') return;

    let isLoading = false; // Prevent multiple simultaneous loads

    const handleScroll = () => {
      // Check if user scrolled near the top (within 200px)
      if (container.scrollTop < 200 && hasMoreGroupMessages && !loadingOlderGroupMessages && !isLoading) {
        isLoading = true;
        // Store current scroll position
        const previousScrollHeight = container.scrollHeight;
        
        // Load older messages
        fetchGroupMessages(selectedGroup._id, true).then(() => {
          // Restore scroll position after new messages are loaded
          setTimeout(() => {
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - previousScrollHeight;
            container.scrollTop = scrollDiff;
            isLoading = false;
          }, 100);
        }).catch(() => {
          isLoading = false;
        });
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      isLoading = false;
    };
  }, [selectedGroup?._id, hasMoreGroupMessages, loadingOlderGroupMessages, chatType]);

  // Reset pagination when switching chats
  useEffect(() => {
    setMessagesPage(0);
    setHasMoreMessages(true);
  }, [selectedUser]);

  useEffect(() => {
    setGroupMessagesPage(0);
    setHasMoreGroupMessages(true);
  }, [selectedGroup]);

  // Show skeleton loaders during initial load
  if (loading) {
    return (
      <div className="h-[87vh] bg-gray-50 flex">
        {/* Left Sidebar Skeleton */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Header Skeleton */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                <div>
                  <div className="h-5 bg-gray-300 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Search Skeleton */}
          <div className="p-3 border-b border-gray-200">
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          
          {/* Chat List Skeleton */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse mb-2">
                <div className="relative">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-200 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-300 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Side Skeleton */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6 animate-pulse mx-auto">
                <MessageCircle size={48} className="text-gray-300" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[87vh] bg-gray-50 flex relative overflow-hidden">
      {/* In-App Notification */}
      {showInAppNotification && inAppNotificationData && (
        <div className="fixed top-4 right-4 z-[9999] bg-white border-2 border-blue-200 rounded-lg shadow-2xl p-4 max-w-sm transform transition-all duration-300 ease-in-out">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-800">{inAppNotificationData.title}</h4>
              <p className="text-sm text-gray-600 mt-1 break-words">{inAppNotificationData.body}</p>
            </div>
            <button 
              onClick={() => {
                setShowInAppNotification(false);
                setInAppNotificationData(null);
              }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
      
      {/* Left Sidebar - Chat List */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <div className="relative">
                <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  Inhouse Chat
                  {/* Red dot indicator for new messages */}
                  {(() => {
                    const totalUnreadIndividual = Object.values(newMessagesMap).reduce((sum, count) => sum + count, 0);
                    const totalUnreadGroup = Object.values(newGroupMessagesMap).reduce((sum, count) => sum + count, 0);
                    const totalUnread = totalUnreadIndividual + totalUnreadGroup;
                    return totalUnread > 0 ? (
                      <span className="relative flex items-center justify-center">
                        <span className="absolute w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                        <span className="relative w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                    ) : null;
                  })()}
                </h1>
                <p className="text-gray-500 text-sm">{chatList.length} chats, {groups.length} groups</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {storedUser?.canCreateGroups && (
                <button 
                  onClick={() => setShowCreateGroupModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md shadow-blue-500/30 font-medium text-sm"
                  title="Create Group"
                >
                  <Users size={18} className="text-white" />
                  <span>Add Group</span>
                  <Plus size={16} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {searchTerm && chatUsers.length > 0 ? (
            /* Search Results */
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Search Results</p>
              {chatUsers.map((user) => (
                <div
                  key={user.empId}
                  onClick={async () => {
                    try {
                      const res = await axios.get(
                        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/${user.empId}`,
                        { withCredentials: true }
                      );
                      const fullUser = res.data.employee;
                      setSelectedUser(fullUser);
                      setSelectedGroup(null);
                      setChatType('individual');
                      fetchMessages(fullUser.empId);
                      setSearchTerm("");
                      
                      // Notify NotificationHandler about chat selection change
                      window.dispatchEvent(new CustomEvent('chatSelectionChanged', {
                        detail: { selectedEmpId: fullUser.empId, selectedGroupId: null }
                      }));
                      
                      // Mark messages as seen and clear unread count
                      await markMessagesAsSeen(user.empId);
                      clearUnreadCount(user.empId);
                    } catch (err) {
                      console.error("❌ Failed to load full user profile", err);
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {user.employeeName?.charAt(0).toUpperCase()}
                    </div>
                    {onlineUsers.has(user.empId) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white z-0"></div>
                    )}
                    {/* Red dot indicator for unread messages - positioned at top-right */}
                    {newMessagesMap[user.empId] && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white z-20 shadow-lg"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold truncate ${newMessagesMap[user.empId] ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>
                        {formatEmployeeName(user)}
                      </p>
                      {newMessagesMap[user.empId] && (
                        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold min-w-[20px] text-center">
                          {newMessagesMap[user.empId]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Groups Section */}
              {loadingGroups ? (
                <div className="p-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Groups</p>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                      <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : groups.length > 0 ? (
                <div className="p-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Groups</p>
                  {groups.map((group) => (
                    <div
                      key={group._id}
                      onClick={async () => {
                        try {
                          const res = await axios.get(
                            `${API_CONFIG.BASE_URL}/api/v1/chat/group/${group._id}`,
                            { withCredentials: true }
                          );
                          if (res.data && res.data.success) {
                            const groupData = res.data.group;
                            setSelectedGroup(groupData);
                            setChatType('group');
                            setSelectedUser(null);
                            await fetchGroupMessages(group._id);
                            // Notify NotificationHandler about chat selection change
                            window.dispatchEvent(new CustomEvent('chatSelectionChanged', {
                              detail: { selectedEmpId: null, selectedGroupId: groupData._id }
                            }));
                            
                            // Backend automatically marks messages as read when fetchGroupMessages is called
                            // Backend emits groupListUpdated socket event with updated unreadCount
                            // No need to manually recalculate - socket event handler will update UI
                          }
                        } catch (err) {
                          console.error("❌ Failed to load group", err);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedGroup?._id === group._id && chatType === 'group'
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                          <Users size={20} />
                        </div>
                        {/* Red dot indicator for unread group messages */}
                        {newGroupMessagesMap[group._id] > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white z-20 shadow-lg"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-semibold truncate ${newGroupMessagesMap[group._id] > 0 ? 'text-gray-900 font-bold' : selectedGroup?._id === group._id && chatType === 'group' ? 'text-blue-600' : 'text-gray-800'}`}>
                            {group.groupName}
                          </p>
                          {newGroupMessagesMap[group._id] > 0 && (
                            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold min-w-[20px] text-center ml-2">
                              {newGroupMessagesMap[group._id]}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {group.lastMessage?.message || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Recent Chats Section */}
              {loadingChatList ? (
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Recent Chats</p>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-200 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-300 rounded w-2/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : chatList.length > 0 ? (
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Recent Chats</p>
                  {chatList.map((user) => {
                    // Debug: Log unread count for each user
                    const unreadCount = newMessagesMap[user.empId];
                    console.log(`🔍 Rendering chat: "${user.employeeName || user.aliasName}" (empId: ${user.empId}), unreadCount: ${unreadCount || 0}, newMessagesMap keys:`, Object.keys(newMessagesMap));
                    if (unreadCount) {
                      console.log(`🔴 Chat "${user.employeeName || user.aliasName}" (${user.empId}) has ${unreadCount} unread messages`);
                    }
                    return (
                    <div
                      key={user.empId}
                      onClick={async () => {
                        try {
                          const res = await axios.get(
                            `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/${user.empId}`,
                            { withCredentials: true }
                          );
                          const fullUser = res.data.employee;
                          setSelectedUser(fullUser);
                          setSelectedGroup(null);
                          setChatType('individual');
                          fetchMessages(fullUser.empId);
                          // Notify NotificationHandler about chat selection change
                          window.dispatchEvent(new CustomEvent('chatSelectionChanged', {
                            detail: { selectedEmpId: fullUser.empId, selectedGroupId: null }
                          }));
                          
                          // Mark messages as seen on server and clear unread count
                          await markMessagesAsSeen(user.empId);
                          // Clear unread count when selecting the user
                          clearUnreadCount(user.empId);
                        } catch (err) {
                          console.error("❌ Failed to load full user profile", err);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedUser?.empId === user.empId && chatType === 'individual'
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                          {user.employeeName?.charAt(0).toUpperCase()}
                        </div>
                        {onlineUsers.has(user.empId) && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white z-0"></div>
                        )}
                        {/* Red dot indicator for unread messages - positioned at top-right */}
                        {(() => {
                          const unreadCount = newMessagesMap[user.empId];
                          const hasUnread = unreadCount > 0;
                          if (hasUnread) {
                            console.log(`✅ Showing red dot for ${user.employeeName} (${user.empId}) - count: ${unreadCount}`);
                          }
                          return hasUnread ? (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white z-20 shadow-lg"></div>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-semibold truncate ${newMessagesMap[user.empId] ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>
                            {formatEmployeeName(user)}
                          </p>
                          {(() => {
                            const unreadCount = newMessagesMap[user.empId];
                            const hasUnread = unreadCount > 0;
                            if (hasUnread) {
                              console.log(`✅ Showing badge for ${user.employeeName} (${user.empId}) - count: ${unreadCount}`);
                            }
                            return hasUnread ? (
                              <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold min-w-[20px] text-center ml-2">
                                {unreadCount}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {user.lastMessage || "No messages yet"}
                        </p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Empty State - Only show if both groups and chats are empty and not loading */}
              {!loadingGroups && !loadingChatList && groups.length === 0 && chatList.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageCircle size={48} className="mb-4 text-gray-300" />
                  <p className="text-lg font-semibold">No conversations yet</p>
                  <p className="text-sm">Start a new chat to begin messaging</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
        {selectedGroup && chatType === 'group' ? (
          <>
            {/* Group Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white">
                    <Users size={24} />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{selectedGroup.groupName}</h2>
                  <p className="text-sm text-gray-500">{selectedGroup.members?.length || 0} members</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                  onClick={() => setShowGroupMenu(!showGroupMenu)}
                >
                  <MoreVertical size={20} className="text-gray-600" />
                  {showGroupMenu && (
                    <div className="absolute right-0 top-12 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {selectedGroup.adminEmpIds?.includes(storedUser?.empId) && (
                        <button 
                          onClick={() => {
                            setShowGroupMenu(false);
                            setShowAddMembersModal(true);
                          }}
                          className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <UserPlus size={16} />
                          Add Members
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setShowGroupMenu(false);
                          setShowGroupInfoModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Info size={16} />
                        Group Info
                      </button>
                      {selectedGroup.creatorEmpId !== storedUser?.empId && (
                        <button 
                          onClick={async () => {
                            setShowGroupMenu(false);
                            if (window.confirm('Are you sure you want to leave this group?')) {
                              try {
                                await leaveGroup(selectedGroup._id);
                              } catch (err) {
                                alert('Failed to leave group');
                              }
                            }
                          }}
                          className="w-full text-left px-4 py-2 text-orange-500 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <LogOut size={16} />
                          Leave Group
                        </button>
                      )}
                      {selectedGroup.creatorEmpId === storedUser?.empId && (
                        <button 
                          onClick={async () => {
                            setShowGroupMenu(false);
                            if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
                              try {
                                await deleteGroup(selectedGroup._id);
                              } catch (err) {
                                alert('Failed to delete group');
                              }
                            }
                          }}
                          className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Trash2 size={16} />
                          Delete Group
                        </button>
                      )}
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Group Messages Area */}
            <div ref={groupMessagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-100">
              <div className="space-y-2">
                {loadingOlderGroupMessages && (
                  <div className="flex justify-center py-2">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading older messages...</span>
                    </div>
                  </div>
                )}
                {loadingGroupMessages ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium">Loading messages...</p>
                    </div>
                  </div>
                ) : groupMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageCircle size={64} className="mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
                    <p className="text-sm">Start the conversation in {selectedGroup.groupName}</p>
                  </div>
                ) : (
                  groupMessages.map((msg, idx) => {
                    const isSentByMe = msg.senderEmpId === storedUser?.empId || msg.isMyMessage;
                    const showDate = idx === 0 || 
                      new Date(msg.timestamp).toDateString() !== 
                      new Date(groupMessages[idx - 1]?.timestamp).toDateString();
                    
                    return (
                      <div key={idx}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="bg-white px-4 py-2 rounded-full text-xs text-gray-500 shadow-sm">
                              {new Date(msg.timestamp).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        )}
                        <div 
                          ref={el => {
                            if (el) {
                              groupMessageRefs.current[msg._id] = el;
                              el.setAttribute('data-message-id', msg._id || msg.id || '');
                            }
                          }}
                          className={`flex ${isSentByMe ? "justify-end" : "justify-start"} mb-3 transition-all duration-300 ${
                            highlightedMessageId === (msg._id || msg.id) ? 'ring-2 ring-yellow-400 ring-offset-2 rounded-lg' : ''
                          }`}
                        >
                          <div className={`flex max-w-[75%] min-w-0 ${isSentByMe ? "flex-row-reverse" : "flex-row"} items-end gap-2`}>
                            {!isSentByMe && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Group profile avatar clicked!', msg);
                                  handleReplyToMessage(msg);
                                }}
                                className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0 cursor-pointer hover:scale-110 transition-transform z-10"
                                title="Click to reply"
                              >
                                {msg.senderName?.charAt(0).toUpperCase() || 'U'}
                              </button>
                            )}
                            <div className="flex flex-col min-w-0 flex-1">
                              {!isSentByMe && (
                                <span className="text-xs text-gray-600 font-medium mb-1 px-1">
                                  {msg.senderAliasName ? `${msg.senderName}/${msg.senderAliasName}` : (msg.senderName || 'Unknown')}
                                </span>
                              )}
                              <div
                                className={`px-4 py-3 rounded-2xl shadow-md min-w-0 max-w-full ${
                                  isSentByMe
                                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
                                    : "bg-white text-gray-800 rounded-bl-md border border-gray-200"
                                }`}
                              >
                                {/* Show replied message if exists - WhatsApp style */}
                                {msg.replyTo && (() => {
                                  const repliedMsg = typeof msg.replyTo === 'object' && msg.replyTo.message 
                                    ? msg.replyTo 
                                    : groupMessages.find(m => (m._id || m.id) === (msg.replyTo._id || msg.replyTo.id || msg.replyTo));
                                  const replyToId = msg.replyTo._id || msg.replyTo.id || msg.replyTo;
                                  return repliedMsg ? (
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        scrollToRepliedMessageFromBubble(replyToId);
                                      }}
                                      className={`mb-2 pl-3 pr-2 py-1.5 rounded cursor-pointer hover:opacity-80 transition-opacity min-w-0 max-w-full overflow-hidden ${
                                        isSentByMe 
                                          ? 'bg-white/15' 
                                          : 'bg-gray-100'
                                      }`} 
                                      style={{
                                        borderLeft: '3px solid #3b82f6'
                                      }}
                                      title="Click to jump to original message"
                                    >
                                      <div className={`text-xs font-semibold mb-0.5 truncate ${
                                        isSentByMe ? 'text-white/90' : 'text-gray-700'
                                      }`}>
                                        {repliedMsg.senderEmpId === storedUser?.empId ? 'You' : (repliedMsg.senderName || 'User')}
                                      </div>
                                      <div className={`text-xs break-words whitespace-pre-wrap line-clamp-2 ${
                                        isSentByMe ? 'text-white/70' : 'text-gray-600'
                                      }`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                        {repliedMsg.message || repliedMsg.text || repliedMsg.content}
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                                {/* Show audio messages FIRST */}
                                {(msg.audio || (msg.message && msg.message.includes('Sent an audio:'))) && msg._id && (
                                  <div className="mb-2">
                                    <AudioPlayer
                                      src={msg.audio || `${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`}
                                      isMyMessage={isSentByMe}
                                      fileName={(() => {
                                        if (!msg.message || !msg.message.includes('Sent an audio: ')) return 'Audio message';
                                        let fileName = msg.message.split('Sent an audio: ')[1];
                                        // Get just the filename (before newline if caption exists)
                                        return fileName.split('\n')[0].trim();
                                      })()}
                                      messageId={msg._id}
                                    />
                                  </div>
                                )}
                                
                                {/* Show images - exclude audio messages */}
                                {!msg.audio && msg.message && (msg.message.includes('Sent an image:') || msg.message.includes('Sent a file:')) && !msg.message.includes('Sent an audio:') && msg._id && (
                                  (() => {
                                    // Extract filename - handle case where caption is on new line
                                    let fileName = msg.message;
                                    if (fileName.includes('Sent an image: ')) {
                                      fileName = fileName.split('Sent an image: ')[1];
                                    } else if (fileName.includes('Sent a file: ')) {
                                      fileName = fileName.split('Sent a file: ')[1];
                                    }
                                    // Get just the filename (before newline if caption exists)
                                    fileName = fileName.split('\n')[0].trim();
                                    // Extract caption if it exists (after newline)
                                    const caption = msg.message.includes('\n') ? msg.message.split('\n').slice(1).join('\n').trim() : '';
                                    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
                                    if (isImage) {
                                      return (
                                        <div className="mb-2">
                                          <img 
                                            src={`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`}
                                            alt="Shared image" 
                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => openImageModal(`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`, fileName)}
                                          />
                                          {caption && (
                                            <p className={`text-sm mt-2 whitespace-pre-wrap ${isSentByMe ? 'text-white' : 'text-gray-800'}`}>{caption}</p>
                                          )}
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className={`mb-2 p-3 rounded-lg border ${isSentByMe ? 'bg-white/20 border-white/30' : 'bg-gray-100 border-gray-200'}`}>
                                          <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 ${isSentByMe ? 'bg-white/30' : 'bg-blue-500'} rounded-lg flex items-center justify-center`}>
                                              <Paperclip size={20} className="text-white" />
                                            </div>
                                            <div className="flex-1">
                                              <p className={`text-sm font-medium ${isSentByMe ? 'text-white' : 'text-gray-800'}`}>{fileName}</p>
                                              <a 
                                                href={`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`text-xs ${isSentByMe ? 'text-blue-100' : 'text-blue-600'} hover:underline`}
                                                download
                                              >
                                                Download
                                              </a>
                                            </div>
                                          </div>
                                          {caption && (
                                            <p className={`text-sm mt-2 whitespace-pre-wrap ${isSentByMe ? 'text-white' : 'text-gray-800'}`}>{caption}</p>
                                          )}
                                        </div>
                                      );
                                    }
                                  })()
                                )}
                                {!(msg.message && (msg.message.includes('Sent an image:') || msg.message.includes('Sent a file:') || msg.message.includes('Sent an audio:'))) && !msg.audio && (
                                  <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isSentByMe ? 'text-white' : 'text-gray-800'}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {(() => {
                                      // Highlight mentions in message
                                      const message = msg.message || '';
                                      const parts = [];
                                      const mentionRegex = /@(\w+[\w\s]*?)(?=\s|$|@|,|\.|!|\?)/g;
                                      let lastIndex = 0;
                                      let match;
                                      
                                      while ((match = mentionRegex.exec(message)) !== null) {
                                        // Add text before mention
                                        if (match.index > lastIndex) {
                                          parts.push(message.substring(lastIndex, match.index));
                                        }
                                        
                                        // Check if this mention matches a tagged user
                                        const mentionedName = match[1];
                                        const isTagged = msg.taggedUsers?.some(u => 
                                          u.employeeName === mentionedName || 
                                          u.aliasName === mentionedName ||
                                          u.empId === mentionedName
                                        ) || false;
                                        
                                        // Add highlighted mention
                                        parts.push(
                                          <span 
                                            key={match.index}
                                            className={`font-semibold ${isSentByMe ? 'text-yellow-200 bg-blue-700 px-1 rounded' : isTagged ? 'text-blue-600 bg-blue-100 px-1 rounded' : 'text-blue-500'}`}
                                          >
                                            @{mentionedName}
                                          </span>
                                        );
                                        
                                        lastIndex = match.index + match[0].length;
                                      }
                                      
                                      // Add remaining text
                                      if (lastIndex < message.length) {
                                        parts.push(message.substring(lastIndex));
                                      }
                                      
                                      return parts.length > 0 ? parts : message;
                                    })()}
                                  </div>
                                )}
                                
                                {/* Show tagged users indicator */}
                                {msg.taggedUsers && msg.taggedUsers.length > 0 && (
                                  <div className={`mt-2 flex flex-wrap gap-1 ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                                    {msg.taggedUsers.map((user, idx) => (
                                      <span 
                                        key={user.empId || idx}
                                        className={`text-xs px-2 py-1 rounded-full ${isSentByMe ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-700'}`}
                                      >
                                        @{user.aliasName || user.employeeName || user.empId}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className={`flex items-center gap-1 mt-1 ${isSentByMe ? "justify-end" : "justify-start"}`}>
                                  <span className={`text-xs ${isSentByMe ? 'text-blue-100' : 'text-gray-500'}`}>
                                    {formatTime(msg.timestamp)}
                                  </span>
                                  {isSentByMe && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => msg._id && fetchSeenBy(msg._id, true)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
                                        title={msg.seenCount > 0 || (msg.seenBy && msg.seenBy.length > 0) ? `Seen by ${msg.seenCount || msg.seenBy?.length || 0} ${(msg.seenCount || msg.seenBy?.length || 0) === 1 ? 'person' : 'people'}` : "Click to see who has seen this message"}
                                      >
                                        <span className="text-xs">
                                          {(() => {
                                            // Per docs: check seenBy array and seenCount
                                            const seenByArray = Array.isArray(msg.seenBy) ? msg.seenBy : [];
                                            const seenCount = msg.seenCount || seenByArray.length;
                                            const isSeen = seenCount > 0 || seenByArray.length > 0;
                                            
                                            return isSeen ? (
                                              <CheckCheck size={14} className="text-blue-100" />
                                            ) : (
                                              <Check size={14} className="text-blue-100 opacity-70" />
                                            );
                                          })()}
                                        </span>
                                      </button>
                                      {/* Show seen status text - per docs: seenBy array with { empId, employeeName, aliasName, seenAt } */}
                                      {/* Always show status for your messages (like individual chats) */}
                                      {(() => {
                                        // Per docs: check seenBy array and seenCount
                                        const seenByArray = Array.isArray(msg.seenBy) ? msg.seenBy : [];
                                        const seenCount = msg.seenCount || seenByArray.length;
                                        const hasSeenBy = seenByArray.length > 0;
                                        const isSeen = seenCount > 0 || hasSeenBy;
                                        
                                        // If message has been seen and we have seenBy array, show names
                                        if (isSeen && hasSeenBy) {
                                          return (
                                            <span className="text-xs italic text-white opacity-90">
                                              Seen by {seenByArray.slice(0, 2).map((user, idx) => (
                                                <span key={user.empId || idx}>
                                                  {user.aliasName || user.employeeName}
                                                  {idx < Math.min(seenByArray.length, 2) - 1 && ', '}
                                                </span>
                                              ))}
                                              {seenByArray.length > 2 && ` +${seenByArray.length - 2} more`}
                                            </span>
                                          );
                                        }
                                        
                                        // If message has been seen but no array, show count
                                        if (isSeen && seenCount > 0) {
                                          return (
                                            <span className="text-xs italic text-white opacity-90">
                                              Seen by {seenCount} {seenCount === 1 ? 'person' : 'people'}
                                            </span>
                                          );
                                        }
                                        
                                        // Always show "Sent" if not seen yet (like individual chats)
                                        return (
                                          <span className="text-xs italic text-white opacity-75">
                                            Sent
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Group Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white shadow-lg">
              {/* Reply Preview - WhatsApp style */}
              {replyingTo && (
                <div 
                  className="mb-2 mx-2 px-3 py-2 rounded-lg flex items-start justify-between bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors min-w-0 max-w-full overflow-hidden" 
                  style={{
                    borderLeft: '4px solid #25D366'
                  }}
                  onClick={(e) => {
                    // Don't scroll if clicking the X button
                    if (e.target.closest('button')) return;
                    scrollToRepliedMessage();
                  }}
                >
                  <div className="flex-1 min-w-0 pr-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 mb-1 min-w-0">
                      <span className="text-xs font-semibold truncate" style={{ color: '#075E54' }}>
                        {replyingTo.senderEmpId === storedUser?.empId ? 'You' : (replyingTo.senderName || replyingTo.senderAliasName || 'User')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed break-words whitespace-pre-wrap line-clamp-3" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {replyingTo.message || replyingTo.text || replyingTo.content}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelReply();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 rounded-full hover:bg-gray-200"
                    type="button"
                    title="Cancel reply"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-3 min-w-0">
                <div className="flex-1 relative min-w-0">
                  <div className="flex items-end gap-2 p-3 bg-gray-50 rounded-2xl border-2 border-gray-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition-all shadow-sm min-w-0 overflow-hidden">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile || isSendingMessage}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Attach file or audio"
                    >
                      <Paperclip size={20} className="text-gray-500" />
                    </button>
                    <textarea
                      ref={groupTextareaRef}
                      placeholder={uploadingFile || isSendingMessage ? (uploadingFile ? "Uploading..." : "Sending...") : "Type a message (use @ to tag someone)"}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      onPaste={handlePaste}
                      disabled={uploadingFile || isSendingMessage}
                      rows={1}
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder-gray-500 text-gray-800 disabled:opacity-50 overflow-y-auto overflow-x-hidden min-w-0"
                      style={{ minHeight: '20px', maxHeight: '400px' }}
                    />
                    
                    {/* Mention Dropdown */}
                    {showMentionDropdown && selectedGroup && (
                      <div
                        ref={mentionDropdownRef}
                        className="absolute z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto mt-1"
                        style={{
                          top: `${mentionPosition.top}px`,
                          left: `${mentionPosition.left}px`,
                          minWidth: '250px',
                          maxWidth: '300px'
                        }}
                      >
                        {(() => {
                          const filteredMembers = getFilteredMembers();
                          const allMembers = getGroupMembers();
                          
                          if (filteredMembers.length === 0) {
                            return (
                              <div className="px-4 py-3 text-sm text-gray-500">
                                {allMembers.length === 0 
                                  ? `No members available (Group has ${selectedGroup.members?.length || 0} members)` 
                                  : `No members match "${mentionQuery}"`}
                              </div>
                            );
                          }
                          
                          return filteredMembers.map((member, idx) => (
                            <button
                              key={member.empId}
                              onClick={() => insertMention(member)}
                              className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 transition-colors ${
                                idx === selectedMentionIndex ? 'bg-blue-100' : ''
                              }`}
                              onMouseEnter={() => setSelectedMentionIndex(idx)}
                            >
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                {member.employeeName?.charAt(0).toUpperCase() || member.empId?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-800 truncate">
                                  {member.employeeName || member.empId}
                                </div>
                                {member.aliasName && (
                                  <div className="text-xs text-gray-500 truncate">
                                    {member.aliasName}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 truncate">
                                  {member.empId}
                                </div>
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingFile || isSendingMessage}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send image"
                    >
                      <Image size={20} className="text-gray-500" />
                    </button>
                    <button 
                      onClick={() => audioInputRef.current?.click()}
                      disabled={uploadingFile || isSendingMessage}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send audio"
                    >
                      <Mic size={20} className="text-gray-500" />
                    </button>
                    {input.trim() ? (
                      <button
                        onClick={sendMessage}
                        disabled={uploadingFile || isSendingMessage}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send size={20} />
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.xlsm,.xlsb,.mp3,.wav,.m4a,.ogg,.aac,.webm,.flac,audio/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleFileSelect(file);
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
                        handleImageSelect(file);
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
                        handleAudioSelect(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {selectedUser.employeeName?.charAt(0).toUpperCase()}
                  </div>
                  {onlineUsers.has(selectedUser.empId) && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{formatEmployeeName(selectedUser)}</h2>
                  {onlineUsers.has(selectedUser.empId) ? (
                    <p className="text-sm text-gray-500">Online</p>
                  ) : (
                    <p className="text-sm text-gray-500">Offline</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <MoreVertical size={20} className="text-gray-600" />
                  {showUserMenu && (
                    <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Info size={16} />
                        Contact info
                      </button>
                      <button className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Archive size={16} />
                        Archive chat
                      </button>
                      <button className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-50 flex items-center gap-2">
                        <Trash2 size={16} />
                        Delete chat
                      </button>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-100">
              <div className="space-y-2">
                {loadingOlderMessages && (
                  <div className="flex justify-center py-2">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading older messages...</span>
                    </div>
                  </div>
                )}
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium">Loading messages...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageCircle size={64} className="mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
                    <p className="text-sm">Start the conversation with {selectedUser.employeeName}</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isSentByMe = msg.senderEmpId === storedUser?.empId;
                    const showDate = idx === 0 || 
                      new Date(msg.timestamp).toDateString() !== 
                      new Date(messages[idx - 1]?.timestamp).toDateString();
                    
                    // Debug message details

                    return (
                      <div key={idx}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="bg-white px-4 py-2 rounded-full text-xs text-gray-500 shadow-sm">
                              {new Date(msg.timestamp).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        )}
                        <div
                          ref={el => {
                            if (el) {
                              el.setAttribute('data-message-id', msg._id || msg.id || '');
                            }
                          }}
                          className={`flex ${isSentByMe ? "justify-end" : "justify-start"} mb-3 transition-all duration-300 ${
                            highlightedMessageId === (msg._id || msg.id) ? 'ring-2 ring-yellow-400 ring-offset-2 rounded-lg' : ''
                          }`}
                        >
                          <div className={`flex max-w-[75%] min-w-0 ${isSentByMe ? "flex-row-reverse" : "flex-row"} items-end gap-2`}>
                            {!isSentByMe && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Profile avatar clicked!', msg);
                                  handleReplyToMessage(msg);
                                }}
                                className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0 cursor-pointer hover:scale-110 transition-transform z-10"
                                title="Click to reply"
                              >
                                {selectedUser.employeeName?.charAt(0).toUpperCase()}
                              </button>
                            )}
                            <div className="flex flex-col">
                              {!isSentByMe && (
                                <span className="text-xs text-gray-600 font-medium mb-1 px-1">
                                  {formatEmployeeName(selectedUser)}
                                </span>
                              )}
                              <div
                                className={`px-4 py-3 rounded-2xl shadow-md min-w-0 max-w-full ${
                                  isSentByMe
                                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
                                    : "bg-white text-gray-800 rounded-bl-md border border-gray-200"
                                }`}
                              >
                                {/* Show replied message if exists - WhatsApp style */}
                                {msg.replyTo && (() => {
                                  const repliedMsg = typeof msg.replyTo === 'object' && msg.replyTo.message 
                                    ? msg.replyTo 
                                    : messages.find(m => (m._id || m.id) === (msg.replyTo._id || msg.replyTo.id || msg.replyTo));
                                  const replyToId = msg.replyTo._id || msg.replyTo.id || msg.replyTo;
                                  return repliedMsg ? (
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        scrollToRepliedMessageFromBubble(replyToId);
                                      }}
                                      className={`mb-2 pl-3 pr-2 py-1.5 rounded cursor-pointer hover:opacity-80 transition-opacity min-w-0 max-w-full overflow-hidden ${
                                        isSentByMe 
                                          ? 'bg-white/15' 
                                          : 'bg-gray-100'
                                      }`} 
                                      style={{
                                        borderLeft: '3px solid #3b82f6'
                                      }}
                                      title="Click to jump to original message"
                                    >
                                      <div className={`text-xs font-semibold mb-0.5 truncate ${
                                        isSentByMe ? 'text-white/90' : 'text-gray-700'
                                      }`}>
                                        {repliedMsg.senderEmpId === storedUser?.empId ? 'You' : (repliedMsg.senderName || 'User')}
                                      </div>
                                      <div className={`text-xs break-words whitespace-pre-wrap line-clamp-2 ${
                                        isSentByMe ? 'text-white/70' : 'text-gray-600'
                                      }`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                        {repliedMsg.message || repliedMsg.text || repliedMsg.content}
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                                {/* Show audio messages FIRST */}
                                {(msg.audio || (msg.message && msg.message.includes('Sent an audio:'))) && msg._id && (
                                  <div className="mb-2">
                                    <AudioPlayer
                                      src={msg.audio || `${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`}
                                      isMyMessage={isSentByMe}
                                      fileName={(() => {
                                        if (!msg.message || !msg.message.includes('Sent an audio: ')) return 'Audio message';
                                        let fileName = msg.message.split('Sent an audio: ')[1];
                                        // Get just the filename (before newline if caption exists)
                                        return fileName.split('\n')[0].trim();
                                      })()}
                                      messageId={msg._id}
                                    />
                                  </div>
                                )}
                                
                                {/* Show images - consolidated to prevent duplicates */}
                                {!msg.audio && msg._id && (
                                  (() => {
                                    // First priority: use imageUrl if available
                                    if (msg.imageUrl) {
                                      return (
                                        <div className="mb-2">
                                          <img 
                                            src={msg.imageUrl} 
                                            alt="Shared image" 
                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => openImageModal(msg.imageUrl, msg.fileName)}
                                          />
                                          <p className="text-xs text-gray-500 mt-1">{msg.fileName}</p>
                                        </div>
                                      );
                                    }
                                    
                                    // Second priority: check if message indicates an image/file
                                    if (msg.message && (msg.message.includes('Sent an image:') || msg.message.includes('Sent a file:')) && !msg.message.includes('Sent an audio:')) {
                                      // Extract filename - handle case where caption is on new line
                                      let fileName = msg.message;
                                      if (fileName.includes('Sent an image: ')) {
                                        fileName = fileName.split('Sent an image: ')[1];
                                      } else if (fileName.includes('Sent a file: ')) {
                                        fileName = fileName.split('Sent a file: ')[1];
                                      }
                                      // Get just the filename (before newline if caption exists)
                                      fileName = fileName.split('\n')[0].trim();
                                      // Extract caption if it exists (after newline)
                                      const caption = msg.message.includes('\n') ? msg.message.split('\n').slice(1).join('\n').trim() : '';
                                      
                                      // Check if it's an image by file extension
                                      const isImageByExtension = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
                                      
                                      // Also check files array if available
                                      const file = files?.find(f => (f.originalName === fileName || f.fileName === fileName) && f.fileType === 'image');

                                      if (isImageByExtension || file) {
                                        return (
                                          <div className="mb-2">
                                            <img
                                              src={`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`}
                                              alt="Shared image"
                                              className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                              onClick={() => openImageModal(`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`, fileName)}
                                            />
                                            {caption && (
                                              <p className="text-sm mt-2 whitespace-pre-wrap text-gray-800">{caption}</p>
                                            )}
                                          </div>
                                        );
                                      }
                                    }
                                    
                                    return null;
                                  })()
                                )}
                                {msg.fileUrl && !msg.imageUrl && (
                                  <div className="mb-2">
                                    <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                          <Paperclip size={20} className="text-white" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-800">{msg.fileName || 'Download file'}</p>
                                          <p className="text-xs text-gray-500">Click to download</p>
                                        </div>
                                        <a 
                                          href={msg.fileUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                          download
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="7,10 12,15 17,10"></polyline>
                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                          </svg>
                                        </a>
                                      </div>
                                    </div>
                                    {(() => {
                                      // Extract caption if it exists in the message
                                      if (msg.message && msg.message.includes('\n')) {
                                        const caption = msg.message.split('\n').slice(1).join('\n').trim();
                                        if (caption) {
                                          return <p className="text-sm mt-2 whitespace-pre-wrap text-gray-800">{caption}</p>;
                                        }
                                      }
                                      return null;
                                    })()}
                                  </div>
                                )}
                                
                                {/* Show files from API if no fileUrl in message */}
                                {!msg.fileUrl && !msg.imageUrl && !msg.audio && msg.message && msg.message.includes('Sent a file:') && !msg.message.includes('Sent an audio:') && (
                                  <div className="mb-2">
                                    <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                          <Paperclip size={20} className="text-white" />
                                        </div>
                                        <div className="flex-1">
                                          {(() => {
                                            // Extract filename - handle case where caption is on new line
                                            let fileName = msg.message;
                                            if (fileName.includes('Sent a file: ')) {
                                              fileName = fileName.split('Sent a file: ')[1];
                                            }
                                            // Get just the filename (before newline if caption exists)
                                            fileName = fileName.split('\n')[0].trim();
                                            return <p className="text-sm font-medium text-gray-800">{fileName}</p>;
                                          })()}
                                          <p className="text-xs text-gray-500">File available for download</p>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            // Download using message ID
                                            if (msg._id) {

                                              window.open(`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`, '_blank');
                                            } else {

                                          }
                                        }}
                                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                          <polyline points="7,10 12,15 17,10"></polyline>
                                          <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                      </button>
                                    </div>
                                    </div>
                                    {(() => {
                                      // Extract caption if it exists in the message
                                      if (msg.message && msg.message.includes('\n')) {
                                        const caption = msg.message.split('\n').slice(1).join('\n').trim();
                                        if (caption) {
                                          return <p className="text-sm mt-2 whitespace-pre-wrap text-gray-800">{caption}</p>;
                                        }
                                      }
                                      return null;
                                    })()}
                                  </div>
                                )}
                                {!(msg.message && (msg.message.includes('Sent an image:') || msg.message.includes('Sent a file:') || msg.message.includes('Sent an audio:'))) && !msg.audio && (
                                  <p className="text-sm whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{msg.message}</p>
                                )}
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${isSentByMe ? "justify-end" : "justify-start"}`}>
                                <span className="text-xs text-gray-400">
                                  {formatTime(msg.timestamp)}
                                </span>
                                {isSentByMe && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => msg._id && fetchSeenBy(msg._id, false)}
                                      className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
                                      title={msg.isSeen && msg.seenBy ? `Seen by ${msg.seenBy.aliasName || msg.seenBy.employeeName}${msg.seenAt ? ` at ${formatTime(msg.seenAt)}` : ''}` : "Click to see who has seen this message"}
                                    >
                                      <span className="text-xs">
                                        {getMessageStatus(msg.status, msg.isSeen, msg.seenBy)}
                                      </span>
                                    </button>
                                    {/* Show seen status text */}
                                    {msg.isSeen && msg.seenBy && (
                                      <span className="text-xs text-gray-500 italic">
                                        Seen by {msg.seenBy.aliasName || msg.seenBy.employeeName}
                                        {msg.seenAt && (
                                          <span className="text-gray-400 ml-1">
                                            {formatTime(msg.seenAt)}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white shadow-lg min-w-0 overflow-hidden">
              {/* Reply Preview - WhatsApp style */}
              {replyingTo && (
                <div 
                  className="mb-2 mx-2 px-3 py-2 rounded-lg flex items-start justify-between bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors min-w-0 max-w-full overflow-hidden" 
                  style={{
                    borderLeft: '4px solid #25D366'
                  }}
                  onClick={(e) => {
                    // Don't scroll if clicking the X button
                    if (e.target.closest('button')) return;
                    scrollToRepliedMessage();
                  }}
                >
                  <div className="flex-1 min-w-0 pr-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 mb-1 min-w-0">
                      <span className="text-xs font-semibold truncate" style={{ color: '#075E54' }}>
                        {replyingTo.senderEmpId === storedUser?.empId ? 'You' : (replyingTo.senderName || replyingTo.senderAliasName || 'User')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed break-words whitespace-pre-wrap line-clamp-3" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {replyingTo.message || replyingTo.text || replyingTo.content}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelReply();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 rounded-full hover:bg-gray-200"
                    type="button"
                    title="Cancel reply"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <div className="flex items-end gap-2 p-3 bg-gray-50 rounded-2xl border-2 border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile || isSendingMessage}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Attach file or audio"
                    >
                      <Paperclip size={20} className="text-gray-500" />
                    </button>
                    <textarea
                      ref={individualTextareaRef}
                      placeholder={uploadingFile || isSendingMessage ? (uploadingFile ? "Uploading..." : "Sending...") : "Type a message"}
                      value={input}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      onPaste={handlePaste}
                      disabled={uploadingFile || isSendingMessage}
                      rows={1}
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder-gray-500 text-gray-800 disabled:opacity-50 overflow-y-auto overflow-x-hidden min-w-0"
                      style={{ minHeight: '20px', maxHeight: '400px' }}
                    />
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingFile || isSendingMessage}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send image"
                    >
                      <Image size={20} className="text-gray-500" />
                    </button>
                    <button 
                      onClick={() => audioInputRef.current?.click()}
                      disabled={uploadingFile || isSendingMessage}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send audio"
                    >
                      <Mic size={20} className="text-gray-500" />
                    </button>
                    {input.trim() && (
                      <button
                        onClick={sendMessage}
                        disabled={uploadingFile || isSendingMessage}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send size={20} />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.xlsm,.xlsb,.mp3,.wav,.m4a,.ogg,.aac,.webm,.flac,audio/*"
                    onChange={handleFileInputChange}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/jpg,image/png"
                    onChange={handleImageInputChange}
                  />
                  <input
                    ref={audioInputRef}
                    type="file"
                    className="hidden"
                    accept=".mp3,.wav,.m4a,.ogg,.aac,.webm,.flac,audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/aac,audio/webm,audio/flac"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleAudioSelect(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mb-6">
                <MessageCircle size={48} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">Inhouse Web</h2>
              <p className="text-gray-500 mb-6">Select a conversation to start messaging</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online users available</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          onCreateGroup={createGroup}
          storedUser={storedUser}
        />
      )}

      {/* Add Members Modal */}
      {showAddMembersModal && selectedGroup && (
        <AddMembersModal
          isOpen={showAddMembersModal}
          onClose={() => setShowAddMembersModal(false)}
          group={selectedGroup}
          onAddMembers={addMembersToGroup}
          onRemoveMembers={removeMembersFromGroup}
          storedUser={storedUser}
        />
      )}

      {/* Group Info Modal */}
      {showGroupInfoModal && selectedGroup && (
        <GroupInfoModal
          isOpen={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          group={selectedGroup}
          storedUser={storedUser}
        />
      )}

      {/* Seen By Modal */}
      {showSeenByModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Seen By</h3>
              <button
                onClick={() => {
                  setShowSeenByModal(false);
                  setSeenByData(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingSeenBy ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : seenByData && seenByData.seenBy && seenByData.seenBy.length > 0 ? (
                <div className="space-y-3">
                  {seenByData.seenBy.map((user, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                        {user.employeeName?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {user.employeeName || user.name || 'Unknown User'}
                          {user.aliasName && `/${user.aliasName}`}
                        </p>
                        {user.seenAt && (
                          <p className="text-xs text-gray-500">
                            Seen {formatTime(user.seenAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Eye size={48} className="mx-auto mb-2 text-gray-400" />
                  <p>No one has seen this message yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageModal && selectedImageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={closeImageModal}
        >
          <div className="relative max-w-[90vw] w-full flex flex-col items-center justify-center min-h-0 my-auto">
            <button
              onClick={closeImageModal}
              className="absolute top-2 right-2 md:top-4 md:right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-70 rounded-full p-2"
              aria-label="Close image viewer"
            >
              <X size={24} />
            </button>
            <div className="flex flex-col items-center w-full max-h-[calc(100vh-120px)]">
              <img 
                src={selectedImageUrl} 
                alt={selectedImageName || "Shared image"} 
                className="max-w-full max-h-[calc(100vh-180px)] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              {selectedImageName && (
                <p className="text-white mt-3 text-sm bg-black bg-opacity-70 px-4 py-2 rounded-lg max-w-full truncate">
                  {selectedImageName}
                </p>
              )}
              <div className="mt-3 flex gap-4">
                <a
                  href={selectedImageUrl}
                  download={selectedImageName || "image"}
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Download size={18} />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal - WhatsApp Style */}
      {showFilePreview && previewFiles.length > 0 && (
        <div 
          className="fixed inset-0 bg-white z-50 flex flex-col"
          onClick={(e) => {
            // Don't close on clicking the modal itself, only on close button
            if (e.target === e.currentTarget) {
              closeFilePreview();
            }
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <button
              onClick={closeFilePreview}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close preview"
            >
              <X size={24} className="text-gray-600" />
            </button>
            <h3 className="text-lg font-semibold text-gray-800">Send Media</h3>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>

          {/* Preview Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
            {/* File Preview Container */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl">
                {previewFiles.map((previewFile, index) => (
                  <div key={index} className="mb-4">
                    {previewFile.type === 'image' && previewFile.preview && (
                      <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
                        <img
                          src={previewFile.preview}
                          alt={previewFile.file.name}
                          className="w-full h-auto max-h-[60vh] object-contain"
                        />
                        {previewFiles.length > 1 && (
                          <button
                            onClick={() => removePreviewFile(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                            aria-label="Remove file"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    )}
                    {previewFile.type === 'audio' && previewFile.preview && (
                      <div className="bg-gray-100 rounded-lg p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                            <Mic size={24} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{previewFile.file.name}</p>
                            <p className="text-sm text-gray-500">Audio file</p>
                          </div>
                          {previewFiles.length > 1 && (
                            <button
                              onClick={() => removePreviewFile(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label="Remove file"
                            >
                              <X size={20} />
                            </button>
                          )}
                        </div>
                        <audio src={previewFile.preview} controls className="w-full mt-4" />
                      </div>
                    )}
                    {previewFile.type === 'document' && (
                      <div className="bg-gray-100 rounded-lg p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center">
                            <Paperclip size={24} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{previewFile.file.name}</p>
                            <p className="text-sm text-gray-500">Document file</p>
                          </div>
                          {previewFiles.length > 1 && (
                            <button
                              onClick={() => removePreviewFile(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label="Remove file"
                            >
                              <X size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Caption Input Area */}
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border-2 border-gray-200 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100 transition-all">
                <textarea
                  placeholder="some text for the files or photo"
                  value={previewCaption}
                  onChange={(e) => setPreviewCaption(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder-gray-500 text-gray-800 min-h-[40px] max-h-[120px] overflow-y-auto"
                  rows={1}
                  style={{ minHeight: '40px' }}
                />
                <button
                  onClick={() => setPreviewCaption('')}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Clear caption"
                >
                  <X size={18} className="text-gray-500" />
                </button>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Add emoji"
                >
                  <Smile size={18} className="text-gray-500" />
                </button>
              </div>

              {/* File Thumbnails and Actions */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  {previewFiles.map((previewFile, index) => (
                    <div
                      key={index}
                      className={`w-16 h-16 rounded-lg border-2 overflow-hidden ${
                        index === 0 ? 'border-green-500' : 'border-gray-300'
                      }`}
                    >
                      {previewFile.type === 'image' && previewFile.preview ? (
                        <img
                          src={previewFile.preview}
                          alt={previewFile.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          {previewFile.type === 'audio' ? (
                            <Mic size={20} className="text-gray-500" />
                          ) : (
                            <Paperclip size={20} className="text-gray-500" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => allFilesInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-gray-300 border-dashed flex items-center justify-center hover:bg-gray-50 transition-colors"
                    aria-label="Add more files"
                  >
                    <Plus size={24} className="text-gray-400" />
                  </button>
                  <input
                    ref={allFilesInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.xlsm,.xlsb,.mp3,.wav,.m4a,.ogg,.aac,.webm,.flac,image/*,audio/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // Determine file type and route to appropriate handler
                        if (file.type.startsWith('image/')) {
                          handleImageSelect(file);
                        } else if (isAudioFile(file)) {
                          handleAudioSelect(file);
                        } else {
                          handleFileSelect(file);
                        }
                      }
                      e.target.value = '';
                    }}
                  />
                </div>
                <button
                  onClick={sendPreviewFiles}
                  disabled={uploadingFile}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send"
                >
                  <Send size={24} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Create Group Modal Component
const CreateGroupModal = ({ isOpen, onClose, onCreateGroup, storedUser }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState('');

  // Fetch all members when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllMembers();
    } else {
      // Reset when modal closes
      setSearchQuery('');
      setSearchResults([]);
      setAllMembers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchUsersForGroup(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      // When search is cleared, show all members again
      setSearchResults([]);
    }
  }, [searchQuery, selectedMembers]);

  const fetchAllMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser`,
        { withCredentials: true }
      );
      // Store all members, filtering will be done in render
      const allUsers = res.data?.employees || [];
      setAllMembers(allUsers);
    } catch (err) {
      console.error("❌ Failed to fetch all members", err);
      // Fallback: try search endpoint with empty query
      try {
        const searchRes = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/chat/search-users?q=`,
          { withCredentials: true }
        );
        setAllMembers(searchRes.data || []);
      } catch (searchErr) {
        console.error("❌ Failed to fetch members via search", searchErr);
        setAllMembers([]);
      }
    } finally {
      setLoadingMembers(false);
    }
  };

  const searchUsersForGroup = async (query) => {
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/search-users?q=${query}`,
        { withCredentials: true }
      );
      // Filter out current user and already selected members
      const filtered = (res.data || []).filter(
        user => user.empId !== storedUser?.empId && 
        !selectedMembers.find(m => m.empId === user.empId)
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error("❌ Failed to search users", err);
    }
  };

  const handleAddMember = (user) => {
    if (!selectedMembers.find(m => m.empId === user.empId)) {
      setSelectedMembers([...selectedMembers, user]);
      // Clear search when member is added
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleRemoveMember = (empId) => {
    setSelectedMembers(selectedMembers.filter(m => m.empId !== empId));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const memberEmpIds = selectedMembers.map(m => m.empId);
      await onCreateGroup(groupName.trim(), description.trim(), memberEmpIds);
      // Reset form
      setGroupName('');
      setDescription('');
      setSelectedMembers([]);
      setSearchQuery('');
      setSearchResults([]);
      setAllMembers([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Users size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Create New Group</h2>
                <p className="text-blue-100 text-sm">Add members and start chatting</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Add Members
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees to add"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              {/* Search Results Dropdown */}
              {searchQuery.trim() && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.empId}
                      onClick={() => handleAddMember(user)}
                      className="p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                        {user.employeeName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{formatEmployeeName(user)}</p>
                        <p className="text-sm text-gray-500">{user.designation || "Employee"}</p>
                      </div>
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Plus size={18} className="text-blue-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Members List */}
            <div className="mt-4">
              {loadingMembers ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                      <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users size={48} className="mx-auto mb-2 text-gray-400" />
                    <p>No employees found matching "{searchQuery}"</p>
                  </div>
                )
              ) : (() => {
                // Filter out current user and already selected members
                const availableMembers = allMembers.filter(
                  user => user.empId !== storedUser?.empId && 
                  !selectedMembers.find(m => m.empId === user.empId)
                );
                return availableMembers.length > 0 ? (
                  <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Available Members ({availableMembers.length})
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {availableMembers.map((user) => (
                        <div
                          key={user.empId}
                          onClick={() => handleAddMember(user)}
                          className="p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                            {user.employeeName?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{formatEmployeeName(user)}</p>
                            <p className="text-sm text-gray-500">{user.designation || "Employee"}</p>
                          </div>
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Plus size={18} className="text-blue-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users size={48} className="mx-auto mb-2 text-gray-400" />
                    <p>No members available to add</p>
                  </div>
                );
              })()}
            </div>

            {selectedMembers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <div
                    key={member.empId}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-2 rounded-full border border-blue-200 shadow-sm"
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {member.employeeName?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{formatEmployeeName(member)}</span>
                    <button
                      onClick={() => handleRemoveMember(member.empId)}
                      className="text-gray-500 hover:text-red-500 transition-colors ml-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !groupName.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg shadow-blue-500/30"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </span>
            ) : (
              'Create Group'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Members Modal Component
const AddMembersModal = ({ isOpen, onClose, group, onAddMembers, onRemoveMembers, storedUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchUsersForAdd(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsersForAdd = async (query) => {
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/search-users?q=${query}`,
        { withCredentials: true }
      );
      // Filter out current user and existing members
      const existingMemberIds = group.memberEmpIds || [];
      const filtered = (res.data || []).filter(
        user => user.empId !== storedUser?.empId && 
        !existingMemberIds.includes(user.empId)
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error("❌ Failed to search users", err);
    }
  };

  const handleAddMember = async (user) => {
    try {
      setLoading(true);
      setError('');
      await onAddMembers(group._id, [user.empId]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberEmpId) => {
    if (memberEmpId === group.creatorEmpId) {
      setError('Cannot remove group creator');
      return;
    }
    if (memberEmpId === storedUser?.empId) {
      setError('Cannot remove yourself. Use Leave Group instead.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onRemoveMembers(group._id, [memberEmpId]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const existingMembers = group.members || [];
  const isAdmin = group.adminEmpIds?.includes(storedUser?.empId);

  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <UserPlus size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Manage Group Members</h2>
                <p className="text-purple-100 text-sm">{group.groupName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              {error}
            </div>
          )}

          {/* Existing Members */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Current Members <span className="text-gray-500 font-normal">({existingMembers.length})</span>
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {existingMembers.map((member) => (
                <div
                  key={member.empId}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                      {member.employeeName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {formatEmployeeName(member)}
                        {member.empId === group.creatorEmpId && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Creator</span>
                        )}
                        {group.adminEmpIds?.includes(member.empId) && member.empId !== group.creatorEmpId && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Admin</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{member.designation || "Employee"}</p>
                    </div>
                  </div>
                  {isAdmin && member.empId !== group.creatorEmpId && member.empId !== storedUser?.empId && (
                    <button
                      onClick={() => handleRemoveMember(member.empId)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      <UserMinus size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add New Members */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Add Members
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employees to add"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.empId}
                        onClick={() => handleAddMember(user)}
                        className="p-3 hover:bg-purple-50 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                          {user.employeeName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{formatEmployeeName(user)}</p>
                          <p className="text-sm text-gray-500">{user.designation || "Employee"}</p>
                        </div>
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Plus size={18} className="text-purple-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-purple-500/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Group Info Modal Component
const GroupInfoModal = ({ isOpen, onClose, group, storedUser }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Info size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Group Information</h2>
                <p className="text-purple-100 text-sm">{group.groupName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
              <Users size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{group.groupName}</h3>
              <p className="text-sm text-gray-600 font-medium">{group.members?.length || 0} members</p>
            </div>
          </div>

          {group.description && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <p className="text-gray-600">{group.description}</p>
            </div>
          )}

          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Created By
            </label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                {group.createdBy?.employeeName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{formatEmployeeName(group.createdBy)}</p>
                <p className="text-sm text-gray-600">
                  {new Date(group.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Members <span className="text-gray-500 font-normal">({group.members?.length || 0})</span>
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {group.members?.map((member) => (
                <div
                  key={member.empId}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                    {member.employeeName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {formatEmployeeName(member)}
                      {member.empId === group.creatorEmpId && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Creator</span>
                      )}
                      {group.adminEmpIds?.includes(member.empId) && member.empId !== group.creatorEmpId && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Admin</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">{member.designation || "Employee"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-purple-500/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
