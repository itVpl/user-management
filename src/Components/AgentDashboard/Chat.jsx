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
  Camera,
  PhoneCall,
  Info,
  Archive,
  Trash2,
  Volume2,
  VolumeX,
  Bell
} from "lucide-react";
import { io } from "socket.io-client";

const ChatPage = () => {
  const [chatList, setChatList] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [storedUser, setStoredUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [newMessagesMap, setNewMessagesMap] = useState({});
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
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Show notification
  const showNotification = (title, body, senderName) => {
    console.log("🔔 Attempting to show notification:", { title, body, senderName });
    console.log("🔔 Notification permission:", Notification.permission);
    console.log("🔔 Browser support:", typeof Notification !== 'undefined');
    
    // Check if Notification API is supported
    if (typeof Notification === 'undefined') {
      console.error("❌ Notification API not supported in this browser");
      return;
    }
    
    if (Notification.permission === "granted") {
      try {
        const notification = new Notification(title, {
          body: `${senderName}: ${body}`,
          icon: "/vite.svg",
          badge: "/vite.svg",
          requireInteraction: true, // Keep notification until user interacts
          silent: false // Play sound
        });
        console.log("✅ Notification created successfully");
        
        // Add click handler
        notification.onclick = () => {
          console.log("🔔 Notification clicked");
          window.focus();
          notification.close();
        };
        
        // Add close handler
        notification.onclose = () => {
          console.log("🔔 Notification closed");
        };
        
        // Auto close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
        
      } catch (error) {
        console.error("❌ Failed to create notification:", error);
      }
    } else {
      console.log("❌ Notification permission not granted:", Notification.permission);
      // Try to request permission again
      Notification.requestPermission().then(permission => {
        console.log("🔔 Permission request result:", permission);
        if (permission === "granted") {
          showNotification(title, body, senderName); // Retry
        }
      });
    }
  };

  // Request notification permission
  const requestNotificationPermission = () => {
    console.log("🔔 Current notification permission:", Notification.permission);
    
    if (Notification.permission === "default") {
      console.log("🔔 Requesting notification permission...");
      Notification.requestPermission().then(permission => {
        console.log("🔔 Permission result:", permission);
        if (permission === "granted") {
          console.log("✅ Notification permission granted!");
        } else {
          console.log("❌ Notification permission denied:", permission);
        }
      });
    } else if (Notification.permission === "granted") {
      console.log("✅ Notification permission already granted!");
    } else {
      console.log("❌ Notification permission denied:", Notification.permission);
    }
  };

  // Update unread count for a user
  const updateUnreadCount = (senderEmpId, increment = 1) => {
    console.log("📊 Updating unread count for:", senderEmpId, "increment:", increment);
    setNewMessagesMap(prev => {
      const newCount = (prev[senderEmpId] || 0) + increment;
      console.log("📊 New count for", senderEmpId, ":", newCount);
      return {
        ...prev,
        [senderEmpId]: newCount
      };
    });
  };

  // Clear unread count for a user
  const clearUnreadCount = (empId) => {
    console.log("📊 Clearing unread count for:", empId);
    setNewMessagesMap(prev => {
      const copy = { ...prev };
      delete copy[empId];
      return copy;
    });
  };

  // Mark messages as seen on server
  const markMessagesAsSeen = async (senderEmpId) => {
    try {
      console.log("👁️ Marking messages as seen for:", senderEmpId);
      const res = await axios.patch(
        `https://vpl-liveproject-1.onrender.com/api/v1/chat/seen/${senderEmpId}`,
        {},
        { withCredentials: true }
      );
      console.log("✅ Messages marked as seen:", res.data);
      
      // Update local unread count
      clearUnreadCount(senderEmpId);
      
      // Refresh unread counts from server
      await fetchUnreadCounts();
    } catch (err) {
      console.error("❌ Failed to mark messages as seen:", err);
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

  const fetchMessages = async (selectedEmpId) => {
    if (!storedUser?.empId || !selectedEmpId) return;
    try {
      const res = await axios.get(
        `https://vpl-liveproject-1.onrender.com/api/v1/chat/with/${selectedEmpId}`,
        { withCredentials: true }
      );

      console.log("📨 All messages from server:", res.data);
      
      const allMessages = res.data || [];
      // Don't filter - show all messages between these two users
      setMessages(allMessages);
      
      console.log("📨 Messages set:", allMessages);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("❌ Failed to load messages:", err);
      setMessages([]);
    }
  };

  const fetchChatList = async () => {
    try {
      const res = await axios.get(
        "https://vpl-liveproject-1.onrender.com/api/v1/chat/list",
        { withCredentials: true }
      );
      const list = res.data || [];
      
      // Fetch server-side unread counts first
      await fetchUnreadCounts();
      
      // Sort chat list with unread priority
      const sortedList = sortChatListWithUnreadPriority(list, newMessagesMap);
      
      console.log("📊 Sorted chat list with unread priority:", sortedList.map(u => ({
        name: u.employeeName,
        unread: newMessagesMap[u.empId] || 0
      })));
      
      setChatList(sortedList);
    } catch (err) {
      console.error("❌ Failed to fetch chat list", err);
    }
  };

  // Fetch unread counts from server
  const fetchUnreadCounts = async () => {
    try {
      const res = await axios.get(
        "https://vpl-liveproject-1.onrender.com/api/v1/chat/unread",
        { withCredentials: true }
      );
      console.log("📊 Server unread counts:", res.data);
      
      const unread = {};
      if (res.data && res.data.success && res.data.unreadBySender) {
        res.data.unreadBySender.forEach((item) => {
          if (item.unreadCount > 0 && item.sender && item.sender.empId) {
            unread[item.sender.empId] = item.unreadCount;
            console.log(`📊 Unread count for ${item.sender.employeeName}: ${item.unreadCount}`);
          }
        });
      }
      
      console.log("📊 Final unread map:", unread);
      setNewMessagesMap(unread);
    } catch (err) {
      console.error("❌ Failed to fetch unread counts", err);
    }
  };

  const fetchFiles = async (empId) => {
    if (!empId) return;
    try {
      setLoadingFiles(true);
      const res = await axios.get(
        `https://vpl-liveproject-1.onrender.com/api/v1/chat/files/user/${empId}`,
        { withCredentials: true }
      );
      console.log('Files response:', res.data);
      setFiles(res.data.files || []);
    } catch (err) {
      console.error("❌ Failed to fetch files:", err);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedUser) return;
    try {
      const payload = {
        receiverEmpId: selectedUser.empId,
        message: input,
      };
      const response = await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/chat/send",
        payload,
        { withCredentials: true }
      );

      // Add the new message to the messages array immediately
      if (response.data) {
        const newMessage = {
          senderEmpId: storedUser.empId,
          receiverEmpId: selectedUser.empId,
          message: input,
          timestamp: new Date().toISOString(),
          status: 'sent'
        };
        setMessages(prev => [...prev, newMessage]);
      }

      socketRef.current?.emit("newMessage", {
        senderEmpId: storedUser.empId,
        receiverEmpId: selectedUser.empId,
        message: input,
        senderName: storedUser.employeeName
      });

      setInput("");
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("❌ Send message failed:", err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !selectedUser) return;
    
    try {
      setUploadingFile(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('receiverEmpId', selectedUser.empId);
      formData.append('message', `Sent a file: ${file.name}`);
      
      const response = await axios.post(
        'https://vpl-liveproject-1.onrender.com/api/v1/chat/send',
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('File upload response:', response.data);

      // Add file message to UI immediately with proper ID
      const newFileMessage = {
        _id: response.data?.messageId || response.data?.id || response.data?.message?._id || Date.now().toString(),
        senderEmpId: storedUser.empId,
        receiverEmpId: selectedUser.empId,
        message: `Sent a file: ${file.name}`,
        timestamp: new Date().toISOString(),
        status: 'sent',
        fileName: file.name,
        fileType: file.type.startsWith('image/') ? 'image' : 'document'
      };
      
      setMessages(prev => [...prev, newFileMessage]);
      
      // Refresh messages to get proper server data
      setTimeout(async () => {
        await fetchMessages(selectedUser.empId);
        setTimeout(scrollToBottom, 100);
      }, 1500);
      
      socketRef.current?.emit("newMessage", {
        senderEmpId: storedUser.empId,
        receiverEmpId: selectedUser.empId,
        message: `Sent a file: ${file.name}`,
        senderName: storedUser.employeeName
      });
      
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('❌ File upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file || !selectedUser) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB.');
      return;
    }
    
    try {
      setUploadingFile(true);
      
      const formData = new FormData();
      formData.append('file', file); // Changed from 'image' to 'file'
      formData.append('receiverEmpId', selectedUser.empId);
      formData.append('message', `Sent an image: ${file.name}`);
      
      const response = await axios.post(
        'https://vpl-liveproject-1.onrender.com/api/v1/chat/send',
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Image upload response:', response.data);

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
      
      // Refresh messages to get proper server data
      setTimeout(async () => {
        await fetchMessages(selectedUser.empId);
        setTimeout(scrollToBottom, 100);
      }, 1500);
      
      socketRef.current?.emit("newMessage", {
        senderEmpId: storedUser.empId,
        receiverEmpId: selectedUser.empId,
        message: `Sent an image: ${file.name}`,
        senderName: storedUser.employeeName
      });
      
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = '';
  };

  const handleImageInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
    e.target.value = '';
  };

  const searchUsers = async (query) => {
    if (!query) return setChatUsers([]);
    try {
      const res = await axios.get(
        `https://vpl-liveproject-1.onrender.com/api/v1/chat/search-users?q=${query}`,
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

  const getMessageStatus = (status) => {
    switch (status) {
      case 'sent': return <Clock size={14} className="text-gray-400" />;
      case 'delivered': return <Check size={14} className="text-gray-400" />;
      case 'read': return <CheckCheck size={14} className="text-blue-500" />;
      default: return <Clock size={14} className="text-gray-400" />;
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
        `https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/${localUser.empId}`,
        { withCredentials: true }
      )
      .then((res) => {
        setStoredUser(res.data.employee);
        // Fetch chat list after user is loaded
        fetchChatList();
      })
      .catch((err) => {
        console.error("❌ Failed to load full stored user profile", err);
      })
      .finally(() => setLoading(false));
      
    // Request notification permission
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (storedUser?.empId && selectedUser?.empId) {
      fetchMessages(selectedUser.empId);
    }
  }, [selectedUser, storedUser]);

  // Fetch chat list when storedUser changes
  useEffect(() => {
    if (storedUser?.empId) {
      fetchChatList();
    }
  }, [storedUser]);

  // Fetch unread counts on initial load
  useEffect(() => {
    if (storedUser?.empId) {
      fetchUnreadCounts();
    }
  }, [storedUser]);

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

  useEffect(() => {
    if (!storedUser?.empId) return;

    socketRef.current = io("https://vpl-liveproject-1.onrender.com", {
      withCredentials: true,
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connected:", socketRef.current.id);
      socketRef.current.emit("join", storedUser.empId);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err);
    });

    const handleNewMessage = async ({ senderEmpId, receiverEmpId, message, senderName }) => {
      console.log("📨 New message from:", senderEmpId, "to", receiverEmpId);

      // Check if this message is for current user (as receiver)
      const isForMe = receiverEmpId === storedUser.empId;
      // Check if this message is from current selected user
      const isFromSelectedUser = senderEmpId === selectedUser?.empId;
      // Check if this message is to current selected user
      const isToSelectedUser = receiverEmpId === selectedUser?.empId;

      console.log("Message details:", {
        isForMe,
        isFromSelectedUser,
        isToSelectedUser,
        currentUser: storedUser.empId,
        selectedUser: selectedUser?.empId
      });

      // Show notification if message is for current user and not from current selected user
      console.log("🔔 Notification check:", {
        isForMe,
        isFromSelectedUser,
        message,
        senderName,
        currentUser: storedUser.empId,
        selectedUser: selectedUser?.empId
      });
      
      if (isForMe && !isFromSelectedUser) {
        console.log("🔔 Showing notification for message from:", senderName);
        
        // Try browser notification first
        showNotification("New Message", message || "Sent you a message", senderName || "Someone");
        
        // Also show in-app notification as backup
        displayInAppNotification("New Message", message || "Sent you a message", senderName || "Someone");
      } else {
        console.log("🔔 Not showing notification - conditions not met");
      }

      // Update last message time for sorting
      setLastMessageTime(prev => ({
        ...prev,
        [senderEmpId]: new Date()
      }));

      // Update unread count for the sender
      if (isForMe && !isFromSelectedUser) {
        console.log("📊 Updating unread count for:", senderEmpId);
        updateUnreadCount(senderEmpId, 1);
        
        // Refresh server-side unread counts and re-sort chat list
        setTimeout(async () => {
          await fetchUnreadCounts();
          // Re-sort chat list to move unread users to top
          await fetchChatList();
        }, 1000);
      }

      // If message is for current user OR involves current selected user, refresh messages
      if ((isForMe && isFromSelectedUser) || (isToSelectedUser && senderEmpId === storedUser.empId)) {
        console.log("🔄 Refreshing messages for current chat");
        await fetchMessages(selectedUser.empId);
        setTimeout(scrollToBottom, 100);
      }

      // Update chat list to show new message count
      await fetchChatList();
    };

    socketRef.current.on("newMessage", handleNewMessage);

    return () => {
      socketRef.current.off("newMessage", handleNewMessage);
      socketRef.current.disconnect();
    };
  }, [storedUser, selectedUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Inhouse Chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[87vh] bg-gray-50 flex relative">
      {/* In-App Notification */}
      {showInAppNotification && inAppNotificationData && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm transform transition-all duration-300 ease-in-out">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Bell size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">{inAppNotificationData.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{inAppNotificationData.senderName}: {inAppNotificationData.body}</p>
            </div>
            <button 
              onClick={() => {
                setShowInAppNotification(false);
                setInAppNotificationData(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
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
              <div>
                <h1 className="text-lg font-semibold text-gray-800">Inhouse Chat</h1>
                <p className="text-gray-500 text-sm">{chatList.length} chats</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              
              {/* <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Camera size={20} className="text-gray-600" />
              </button> */}
              {/* <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={20} className="text-gray-600" />
              </button> */}
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
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Search Results</p>
              {chatUsers.map((user) => (
                <div
                  key={user.empId}
                  onClick={async () => {
                    try {
                      const res = await axios.get(
                        `https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/${user.empId}`,
                        { withCredentials: true }
                      );
                      const fullUser = res.data.employee;
                      setSelectedUser(fullUser);
                      fetchMessages(fullUser.empId);
                      setSearchTerm("");
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
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{user.employeeName}</p>
                    <p className="text-sm text-gray-500 truncate">{user.designation || "Employee"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : chatList.length > 0 ? (
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Recent Chats</p>
              {chatList.map((user) => (
                <div
                  key={user.empId}
                  onClick={async () => {
                    try {
                      const res = await axios.get(
                        `https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/${user.empId}`,
                        { withCredentials: true }
                      );
                      const fullUser = res.data.employee;
                      setSelectedUser(fullUser);
                      fetchMessages(fullUser.empId);
                      
                      // Mark messages as seen on server
                      await markMessagesAsSeen(user.empId);
                    } catch (err) {
                      console.error("❌ Failed to load full user profile", err);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    selectedUser?.empId === user.empId
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {user.employeeName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    {/* Notification badge for unread messages */}
                    {newMessagesMap[user.empId] && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                        <Bell size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold truncate ${newMessagesMap[user.empId] ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>
                        {user.employeeName}
                      </p>
                      {newMessagesMap[user.empId] && (
                        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold min-w-[20px] text-center">
                          {newMessagesMap[user.empId]}
                        </div>
                      )}
                    </div>
                    <p className={`text-sm truncate ${newMessagesMap[user.empId] ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                      {user.designation || "Employee"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle size={48} className="mb-4 text-gray-300" />
              <p className="text-lg font-semibold">No conversations yet</p>
              <p className="text-sm">Start a new chat to begin messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {selectedUser.employeeName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{selectedUser.employeeName}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-gray-500">{selectedUser.designation || "Employee"}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <PhoneCall size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Video size={20} className="text-gray-600" />
                </button>
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
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-2">
                {messages.length === 0 ? (
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
                    console.log(`Message ${idx}:`, {
                      senderEmpId: msg.senderEmpId,
                      receiverEmpId: msg.receiverEmpId,
                      currentUser: storedUser?.empId,
                      isSentByMe,
                      message: msg.message
                    });
                    
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
                          className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`flex max-w-[70%] ${isSentByMe ? "flex-row-reverse" : "flex-row"}`}>
                            {!isSentByMe && (
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-2 mt-1">
                                {selectedUser.employeeName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <div
                                className={`px-4 py-2 rounded-lg shadow-sm ${
                                  isSentByMe
                                    ? "bg-blue-500 text-white rounded-br-md"
                                    : "bg-white text-gray-800 rounded-bl-md border border-gray-200"
                                }`}
                              >
                                {msg.imageUrl && (
                                  <div className="mb-2">
                                    <img 
                                      src={msg.imageUrl} 
                                      alt="Shared image" 
                                      className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => window.open(msg.imageUrl, '_blank')}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{msg.fileName}</p>
                                  </div>
                                )}
                                {/* Show images using message ID if no imageUrl */}
                                {!msg.imageUrl && msg.message && msg.message.includes('Sent a file:') && msg._id && (
                                  (() => {
                                    const fileName = msg.message.replace('Sent a file: ', '');
                                    const file = files.find(f => f.originalName === fileName || f.fileName === fileName);
                                    if (file && file.fileType === 'image') {
                                      return (
                                        <div className="mb-2">
                                          <img 
                                            src={`https://vpl-liveproject-1.onrender.com/api/v1/chat/download/${msg._id}`}
                                            alt="Shared image" 
                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(`https://vpl-liveproject-1.onrender.com/api/v1/chat/download/${msg._id}`, '_blank')}
                                          />
                                          <p className="text-xs text-gray-500 mt-1">{fileName}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()
                                )}
                                {/* Show images for any file message with _id */}
                                {!msg.imageUrl && msg._id && msg.message && (msg.message.includes('Sent an image:') || msg.message.includes('Sent a file:')) && (
                                  (() => {
                                    const fileName = msg.message.replace('Sent an image: ', '').replace('Sent a file: ', '');
                                    // Check if it's an image based on file extension
                                    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
                                    if (isImage) {
                                      return (
                                        <div className="mb-2">
                                          <img 
                                            src={`https://vpl-liveproject-1.onrender.com/api/v1/chat/download/${msg._id}`}
                                            alt="Shared image" 
                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(`https://vpl-liveproject-1.onrender.com/api/v1/chat/download/${msg._id}`, '_blank')}
                                          />
                                          <p className="text-xs text-gray-500 mt-1">{fileName}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()
                                )}
                                {/* Show images from API if no imageUrl in message */}
                                {!msg.imageUrl && !msg.fileUrl && msg.message && msg.message.includes('Sent a file:') && (
                                  (() => {
                                    const fileName = msg.message.replace('Sent a file: ', '');
                                    const file = files.find(f => f.originalName === fileName || f.fileName === fileName);
                                    if (file && file.fileType === 'image') {
                                      return (
                                        <div className="mb-2">
                                          <img 
                                            src={`https://vpl-liveproject-1.onrender.com/api/v1/chat/download/${msg._id}`}
                                            alt="Shared image" 
                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(`https://vpl-liveproject-1.onrender.com/api/v1/chat/download/${msg._id}`, '_blank')}
                                          />
                                          <p className="text-xs text-gray-500 mt-1">{file.originalName}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()
                                )}
                                {msg.fileUrl && !msg.imageUrl && (
                                  <div className="mb-2 p-3 bg-gray-100 rounded-lg border border-gray-200">
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
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                          <polyline points="7,10 12,15 17,10"></polyline>
                                          <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {/* Show files from API if no fileUrl in message */}
                                {!msg.fileUrl && !msg.imageUrl && msg.message && msg.message.includes('Sent a file:') && (
                                  <div className="mb-2 p-3 bg-gray-100 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <Paperclip size={20} className="text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-800">{msg.message.replace('Sent a file: ', '')}</p>
                                        <p className="text-xs text-gray-500">File available for download</p>
                                      </div>
                                      <button 
                                        onClick={() => {
                                          // Download using message ID
                                          if (msg._id) {
                                            console.log('Downloading file for message:', msg._id);
                                            window.open(`https://vpl-liveproject-1.onrender.com/api/v1/chat/download/${msg._id}`, '_blank');
                                          } else {
                                            console.log('No message ID found for download');
                                          }
                                        }}
                                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                          <polyline points="7,10 12,15 17,10"></polyline>
                                          <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${isSentByMe ? "justify-end" : "justify-start"}`}>
                                <span className="text-xs text-gray-400">
                                  {formatTime(msg.timestamp)}
                                </span>
                                {isSentByMe && (
                                  <span className="text-xs">
                                    {getMessageStatus(msg.status)}
                                  </span>
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
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <div className="flex items-end gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      disabled={uploadingFile}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add emoji"
                    >
                      <Smile size={20} className="text-gray-500" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Attach file"
                    >
                      <Paperclip size={20} className="text-gray-500" />
                    </button>
                    <textarea
                      placeholder={uploadingFile ? "Uploading..." : "Type a message"}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={uploadingFile}
                      rows={1}
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder-gray-500 text-gray-800 disabled:opacity-50"
                      style={{ minHeight: '20px', maxHeight: '100px' }}
                    />
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send image"
                    >
                      <Image size={20} className="text-gray-500" />
                    </button>
                    {input.trim() ? (
                      <button
                        onClick={sendMessage}
                        disabled={uploadingFile}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send size={20} />
                      </button>
                    ) : (
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={uploadingFile}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isRecording 
                            ? 'bg-red-500 text-white hover:bg-red-600' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        <Mic size={20} />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
                    onChange={handleFileInputChange}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageInputChange}
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
    </div>
  );
};

export default ChatPage;
