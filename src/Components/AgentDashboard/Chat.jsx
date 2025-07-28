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
  AlertCircle
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
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async (selectedEmpId) => {
    if (!storedUser?.empId || !selectedEmpId) return;
    try {
      const res = await axios.get(
        `https://vpl-liveproject-1.onrender.com/api/v1/chat/with/${selectedEmpId}`,
        { withCredentials: true }
      );

      const allMessages = res.data || [];
      const filtered = allMessages.filter(
        (msg) =>
          (msg.senderEmpId === storedUser.empId &&
            msg.receiverEmpId === selectedEmpId) ||
          (msg.receiverEmpId === storedUser.empId &&
            msg.senderEmpId === selectedEmpId)
      );

      setMessages(filtered);
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
      setChatList(list);

      const unread = {};
      list.forEach((user) => {
        if (user.unseenCount > 0) {
          unread[user.empId] = user.unseenCount;
        }
      });
      setNewMessagesMap(unread);
    } catch (err) {
      console.error("❌ Failed to fetch chat list", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedUser) return;
    try {
      const payload = {
        receiverEmpId: selectedUser.empId,
        message: input,
      };
      await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/chat/send",
        payload,
        { withCredentials: true }
      );

      socketRef.current?.emit("newMessage", {
        senderEmpId: storedUser.empId,
        receiverEmpId: selectedUser.empId,
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
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('receiverEmpId', selectedUser.empId);
      formData.append('message', `Sent a file: ${file.name}`);
      
      // Upload file to server
      const response = await axios.post(
        'https://vpl-liveproject-1.onrender.com/api/v1/chat/send-file',
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // Emit socket event for real-time update
        socketRef.current?.emit("newMessage", {
          senderEmpId: storedUser.empId,
          receiverEmpId: selectedUser.empId,
        });
        
        // Refresh messages
        await fetchMessages(selectedUser.empId);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('❌ File upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file || !selectedUser) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB.');
      return;
    }
    
    try {
      setUploadingFile(true);
      
      // Create FormData for image upload
      const formData = new FormData();
      formData.append('image', file);
      formData.append('receiverEmpId', selectedUser.empId);
      formData.append('message', `Sent an image: ${file.name}`);
      
      // Upload image to server
      const response = await axios.post(
        'https://vpl-liveproject-1.onrender.com/api/v1/chat/send-image',
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // Emit socket event for real-time update
        socketRef.current?.emit("newMessage", {
          senderEmpId: storedUser.empId,
          receiverEmpId: selectedUser.empId,
        });
        
        // Refresh messages
        await fetchMessages(selectedUser.empId);
        setTimeout(scrollToBottom, 100);
      }
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
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleImageInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input value to allow selecting the same file again
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
      })
      .catch((err) => {
        console.error("❌ Failed to load full stored user profile", err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (storedUser?.empId && selectedUser?.empId) {
      fetchMessages(selectedUser.empId);
    }
  }, [selectedUser, storedUser]);

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

    const handleNewMessage = async ({ senderEmpId, receiverEmpId }) => {
      console.log("📨 New message from:", senderEmpId, "to", receiverEmpId);

      const isMyChat =
        (receiverEmpId === storedUser.empId && senderEmpId === selectedUser?.empId) ||
        (senderEmpId === storedUser.empId && receiverEmpId === selectedUser?.empId);

      if (isMyChat && selectedUser?.empId) {
        await fetchMessages(selectedUser.empId);
      }

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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex">
      {/* Left Sidebar - Chat List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold">Messages</h1>
                <p className="text-blue-100 text-sm">{chatList.length} conversations</p>
              </div>
            </div>
            <button className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Recent Conversations</p>
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
                      setNewMessagesMap((prev) => {
                        const copy = { ...prev };
                        delete copy[user.empId];
                        return copy;
                      });
                    } catch (err) {
                      console.error("❌ Failed to load full user profile", err);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedUser?.empId === user.empId
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {user.employeeName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800 truncate">{user.employeeName}</p>
                      {newMessagesMap[user.empId] && (
                        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          {newMessagesMap[user.empId]}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{user.designation || "Employee"}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {user.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {selectedUser.employeeName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedUser.employeeName}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-gray-500">{selectedUser.designation || "Employee"}</p>
                    <span className="text-xs text-gray-400">• {selectedUser.empId}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Phone size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Video size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={20} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
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
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-2 mt-1">
                                {selectedUser.employeeName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                                                         <div className="flex flex-col">
                               <div
                                 className={`px-4 py-3 rounded-2xl shadow-sm ${
                                   isSentByMe
                                     ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-md"
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
                                   </div>
                                 )}
                                 {msg.fileUrl && (
                                   <div className="mb-2 p-2 bg-black bg-opacity-10 rounded-lg">
                                     <div className="flex items-center gap-2">
                                       <Paperclip size={16} />
                                       <a 
                                         href={msg.fileUrl} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="text-sm underline hover:no-underline"
                                       >
                                         {msg.fileName || 'Download file'}
                                       </a>
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
            <div className="p-6 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <div className="flex items-end gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Attach file"
                    >
                      <Paperclip size={20} className="text-gray-500" />
                    </button>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      disabled={uploadingFile}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add emoji"
                    >
                      <Smile size={20} className="text-gray-500" />
                    </button>
                    <textarea
                      placeholder={uploadingFile ? "Uploading..." : "Type your message..."}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={uploadingFile}
                      rows={1}
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder-gray-500 disabled:opacity-50"
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
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || uploadingFile}
                  className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {uploadingFile ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
              <h2 className="text-2xl font-bold text-gray-600 mb-2">Welcome to Chat</h2>
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
