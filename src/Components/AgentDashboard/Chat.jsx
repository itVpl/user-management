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
  Bell,
  Users,
  Plus,
  X,
  Settings,
  UserPlus,
  UserMinus,
  LogOut
} from "lucide-react";
import { io } from "socket.io-client";
import API_CONFIG from '../../config/api.js';

// Helper function to format employee name with alias
const formatEmployeeName = (user) => {
  if (!user) return '';
  if (user.aliasName && user.employeeName) {
    return `${user.employeeName}/${user.aliasName}`;
  }
  return user.employeeName || user.aliasName || '';
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

        // Add click handler
        notification.onclick = () => {

          window.focus();
          notification.close();
        };
        
        // Add close handler
        notification.onclose = () => {

        };
        
        // Auto close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
        
      } catch (error) {
        console.error("❌ Failed to create notification:", error);
      }
    } else {

      // Try to request permission again
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
  };

  // Mark messages as seen on server
  const markMessagesAsSeen = async (senderEmpId) => {
    try {

      const res = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/chat/seen/${senderEmpId}`,
        {},
        { withCredentials: true }
      );

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
      setLoadingMessages(true);
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/with/${selectedEmpId}`,
        { withCredentials: true }
      );

      const allMessages = res.data || [];
      // Don't filter - show all messages between these two users
      setMessages(allMessages);

      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("❌ Failed to load messages:", err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
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
    } finally {
      setLoadingChatList(false);
    }
  };

  // Group Chat Functions
  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/list`,
        { withCredentials: true }
      );
      if (res.data && res.data.success) {
        setGroups(res.data.groups || []);
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

  const fetchGroupMessages = async (groupId) => {
    if (!groupId) return;
    try {
      setLoadingGroupMessages(true);
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/chat/group/${groupId}/messages`,
        { withCredentials: true }
      );
      if (res.data && res.data.success) {
        setGroupMessages(res.data.messages || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error("❌ Failed to fetch group messages", err);
      setGroupMessages([]);
    } finally {
      setLoadingGroupMessages(false);
    }
  };

  const sendGroupMessage = async () => {
    if (!input.trim() || !selectedGroup || isSendingMessage) return;
    
    // Prevent multiple sends
    setIsSendingMessage(true);
    const messageToSend = input.trim();
    
    // Clear input immediately to prevent duplicate sends
    setInput("");
    
    try {
      const formData = new FormData();
      formData.append('groupId', selectedGroup._id);
      formData.append('message', messageToSend);

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
        const newMessage = {
          senderEmpId: storedUser.empId,
          senderName: storedUser.employeeName,
          senderAliasName: storedUser.aliasName,
          message: messageToSend,
          timestamp: new Date().toISOString(),
          isMyMessage: true
        };
        setGroupMessages(prev => [...prev, newMessage]);
      }

      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("❌ Send group message failed:", err);
      // Restore input on error
      setInput(messageToSend);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleGroupFileUpload = async (file) => {
    if (!file || !selectedGroup) return;
    
    try {
      setUploadingFile(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('groupId', selectedGroup._id);
      formData.append('message', `Sent a file: ${file.name}`);
      
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
        // Refresh group messages
        await fetchGroupMessages(selectedGroup._id);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('❌ Group file upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleGroupImageUpload = async (file) => {
    if (!file || !selectedGroup) return;
    
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
        setTimeout(scrollToBottom, 100);
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

          }
        });
      }

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
    
    try {
      const payload = {
        receiverEmpId: selectedUser.empId,
        message: messageToSend,
      };
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/chat/send`,
        payload,
        { withCredentials: true }
      );

      // Add the new message to the messages array immediately
      if (response.data) {
        const newMessage = {
          senderEmpId: storedUser.empId,
          receiverEmpId: selectedUser.empId,
          message: messageToSend,
          timestamp: new Date().toISOString(),
          status: 'sent'
        };
        setMessages(prev => [...prev, newMessage]);
      }

      socketRef.current?.emit("newMessage", {
        senderEmpId: storedUser.empId,
        receiverEmpId: selectedUser.empId,
        message: messageToSend,
        senderName: storedUser.employeeName
      });

      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("❌ Send message failed:", err);
      // Restore input on error
      setInput(messageToSend);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Only send if not already sending and input is not empty
      if (!isSendingMessage && input.trim()) {
        sendMessage();
      }
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
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/${localUser.empId}`,
        { withCredentials: true }
      )
      .then((res) => {
        setStoredUser(res.data.employee);
        // Fetch chat list and groups after user is loaded
        fetchChatList();
        fetchGroups();
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

    socketRef.current = io(`${API_CONFIG.BASE_URL}`, {
      withCredentials: true,
    });

    socketRef.current.on("connect", () => {

      socketRef.current.emit("join", storedUser.empId);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err);
    });

    const handleNewMessage = async ({ senderEmpId, receiverEmpId, message, senderName }) => {

      // Check if this message is for current user (as receiver)
      const isForMe = receiverEmpId === storedUser.empId;
      // Check if this message is from current selected user
      const isFromSelectedUser = senderEmpId === selectedUser?.empId;
      // Check if this message is to current selected user
      const isToSelectedUser = receiverEmpId === selectedUser?.empId;

      // Show notification if message is for current user and not from current selected user

      if (isForMe && !isFromSelectedUser) {

        // Try browser notification first
        showNotification("New Message", message || "Sent you a message", senderName || "Someone");
        
        // Also show in-app notification as backup
        displayInAppNotification("New Message", message || "Sent you a message", senderName || "Someone");
      } else {

      }

      // Update last message time for sorting
      setLastMessageTime(prev => ({
        ...prev,
        [senderEmpId]: new Date()
      }));

      // Update unread count for the sender
      if (isForMe && !isFromSelectedUser) {

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

        await fetchMessages(selectedUser.empId);
        setTimeout(scrollToBottom, 100);
      }

      // Update chat list to show new message count
      await fetchChatList();
    };

    socketRef.current.on("newMessage", handleNewMessage);

    const handleNewGroupMessage = async ({ groupId, groupName, senderEmpId, senderName, senderAliasName, message }) => {
      // Check if this message is for current selected group
      const isForSelectedGroup = selectedGroup?._id === groupId;
      const isFromMe = senderEmpId === storedUser.empId;

      // Show notification if message is not from me and not for selected group
      if (!isFromMe && !isForSelectedGroup) {
        showNotification("New Group Message", message || "Sent a message", `${senderName || "Someone"} in ${groupName || "Group"}`);
        displayInAppNotification("New Group Message", message || "Sent a message", `${senderName || "Someone"} in ${groupName || "Group"}`);
        
        // Update unread count for the group
        setNewGroupMessagesMap(prev => {
          const newCount = (prev[groupId] || 0) + 1;
          return {
            ...prev,
            [groupId]: newCount
          };
        });
      }

      // If message is for selected group, refresh messages and clear unread count
      if (isForSelectedGroup) {
        await fetchGroupMessages(groupId);
        setTimeout(scrollToBottom, 100);
        // Clear unread count when viewing the group
        setNewGroupMessagesMap(prev => {
          const copy = { ...prev };
          delete copy[groupId];
          return copy;
        });
      }

      // Refresh groups list to update last message
      await fetchGroups();
    };

    socketRef.current.on("newGroupMessage", handleNewGroupMessage);

    return () => {
      socketRef.current.off("newMessage", handleNewMessage);
      socketRef.current.off("newGroupMessage", handleNewGroupMessage);
      socketRef.current.disconnect();
    };
  }, [storedUser, selectedUser, selectedGroup]);

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
                    <p className="font-semibold text-gray-800 truncate">{formatEmployeeName(user)}</p>
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
                            setSelectedGroup(res.data.group);
                            setChatType('group');
                            setSelectedUser(null);
                            await fetchGroupMessages(group._id);
                            // Clear unread count when selecting the group
                            setNewGroupMessagesMap(prev => {
                              const copy = { ...prev };
                              delete copy[group._id];
                              return copy;
                            });
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
                        {newGroupMessagesMap[group._id] && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${selectedGroup?._id === group._id && chatType === 'group' ? 'text-blue-600' : 'text-gray-800'}`}>
                          {group.groupName}
                        </p>
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
                  {chatList.map((user) => (
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
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        {/* Red dot indicator for unread messages */}
                        {newMessagesMap[user.empId] && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
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
                        <p className="text-xs text-gray-400 truncate">
                          {user.lastMessage || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  ))}
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
      <div className="flex-1 flex flex-col bg-white">
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
            <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
              <div className="space-y-2">
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
                        <div className={`flex ${isSentByMe ? "justify-end" : "justify-start"} mb-3`}>
                          <div className={`flex max-w-[75%] ${isSentByMe ? "flex-row-reverse" : "flex-row"} items-end gap-2`}>
                            {!isSentByMe && (
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0">
                                {msg.senderName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                            <div className="flex flex-col">
                              {!isSentByMe && (
                                <span className="text-xs text-gray-600 font-medium mb-1 px-1">
                                  {msg.senderAliasName ? `${msg.senderName}/${msg.senderAliasName}` : (msg.senderName || 'Unknown')}
                                </span>
                              )}
                              <div
                                className={`px-4 py-3 rounded-2xl shadow-md ${
                                  isSentByMe
                                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
                                    : "bg-white text-gray-800 rounded-bl-md border border-gray-200"
                                }`}
                              >
                                {/* Show images */}
                                {msg.message && (msg.message.includes('Sent an image:') || msg.message.includes('Sent a file:')) && msg._id && (
                                  (() => {
                                    const fileName = msg.message.replace('Sent an image: ', '').replace('Sent a file: ', '');
                                    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
                                    if (isImage) {
                                      return (
                                        <div className="mb-2">
                                          <img 
                                            src={`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`}
                                            alt="Shared image" 
                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`, '_blank')}
                                          />
                                          <p className={`text-xs mt-1 ${isSentByMe ? 'text-blue-100' : 'text-gray-500'}`}>{fileName}</p>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="mb-2 p-3 bg-gray-100 rounded-lg border border-gray-200">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 ${isSentByMe ? 'bg-blue-400' : 'bg-blue-500'} rounded-lg flex items-center justify-center`}>
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
                                        </div>
                                      );
                                    }
                                  })()
                                )}
                                {!(msg.message && msg.message.includes('Sent an image:') || msg.message && msg.message.includes('Sent a file:')) && (
                                  <p className={`text-sm leading-relaxed ${isSentByMe ? 'text-white' : 'text-gray-800'}`}>{msg.message}</p>
                                )}
                                <div className={`flex items-center justify-end mt-2 gap-1`}>
                                  <span className={`text-xs ${isSentByMe ? 'text-blue-100' : 'text-gray-500'}`}>
                                    {formatTime(msg.timestamp)}
                                  </span>
                                  {isSentByMe && (
                                    <CheckCheck size={12} className="text-blue-100" />
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
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <div className="flex items-end gap-2 p-3 bg-gray-50 rounded-2xl border-2 border-gray-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition-all shadow-sm">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile || isSendingMessage}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Attach file"
                    >
                      <Paperclip size={20} className="text-gray-500" />
                    </button>
                    <textarea
                      placeholder={uploadingFile || isSendingMessage ? (uploadingFile ? "Uploading..." : "Sending...") : "Type a message"}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={uploadingFile || isSendingMessage}
                      rows={1}
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder-gray-500 text-gray-800 disabled:opacity-50"
                      style={{ minHeight: '20px', maxHeight: '100px' }}
                    />
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingFile || isSendingMessage}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send image"
                    >
                      <Image size={20} className="text-gray-500" />
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
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleGroupFileUpload(file);
                      }
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleGroupImageUpload(file);
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
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{formatEmployeeName(selectedUser)}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-gray-500">Online</p>
                  </div>
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
            <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
              <div className="space-y-2">
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
                          className={`flex ${isSentByMe ? "justify-end" : "justify-start"} mb-3`}
                        >
                          <div className={`flex max-w-[75%] ${isSentByMe ? "flex-row-reverse" : "flex-row"} items-end gap-2`}>
                            {!isSentByMe && (
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0">
                                {selectedUser.employeeName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col">
                              {!isSentByMe && (
                                <span className="text-xs text-gray-600 font-medium mb-1 px-1">
                                  {formatEmployeeName(selectedUser)}
                                </span>
                              )}
                              <div
                                className={`px-4 py-3 rounded-2xl shadow-md ${
                                  isSentByMe
                                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
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
                                            src={`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`}
                                            alt="Shared image" 
                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`, '_blank')}
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
                                            src={`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`}
                                            alt="Shared image" 
                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`, '_blank')}
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
                                            src={`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`}
                                            alt="Shared image" 
                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`, '_blank')}
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

                                            window.open(`${API_CONFIG.BASE_URL}/api/v1/chat/download/${msg._id}`, '_blank');
                                          } else {

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
            <div className="p-4 border-t border-gray-200 bg-white shadow-lg">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <div className="flex items-end gap-2 p-3 bg-gray-50 rounded-2xl border-2 border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile || isSendingMessage}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Attach file"
                    >
                      <Paperclip size={20} className="text-gray-500" />
                    </button>
                    <textarea
                      placeholder={uploadingFile || isSendingMessage ? (uploadingFile ? "Uploading..." : "Sending...") : "Type a message"}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={uploadingFile || isSendingMessage}
                      rows={1}
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder-gray-500 text-gray-800 disabled:opacity-50"
                      style={{ minHeight: '20px', maxHeight: '100px' }}
                    />
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingFile || isSendingMessage}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send image"
                    >
                      <Image size={20} className="text-gray-500" />
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
