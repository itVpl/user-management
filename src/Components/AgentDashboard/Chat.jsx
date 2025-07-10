import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaPaperPlane } from "react-icons/fa";
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
  const socketRef = useRef(null);

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

      setTimeout(() => {
        const container = document.querySelector(".overflow-y-auto");
        container?.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }, 100);
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
    } catch (err) {
      console.error("❌ Send message failed:", err);
    }
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
      socketRef.current.emit("join", storedUser.empId); // optional: room join
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

  if (loading) return <div className="text-center mt-10">Loading chat...</div>;

  return (
    <div className="flex h-[80vh] font-sans">
      <div className="flex-1 flex flex-col">
        <div className="flex flex-1">
          {/* Left Panel */}
          <div className="w-[250px] bg-white border-r p-4">
            <input
              type="text"
              placeholder="Search name or ID"
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border rounded-full text-sm mb-4 outline-none"
            />
            <div className="space-y-2">
              {searchTerm && chatUsers.length > 0
                ? chatUsers.map((user) => (
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
                        } catch (err) {
                          console.error("❌ Failed to load full user profile", err);
                        }
                      }}
                      className={`flex items-center space-x-3 p-2 rounded cursor-pointer ${
                        selectedUser?.empId === user.empId
                          ? "bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-blue-500">
                        {user.employeeName?.charAt(0)}
                      </div>
                      <span className="text-sm">{user.employeeName}</span>
                    </div>
                  ))
                : chatList.length > 0
                ? chatList.map((user) => (
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
                      className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                        selectedUser?.empId === user.empId
                          ? "bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-blue-500">
                          {user.employeeName?.charAt(0)}
                        </div>
                        <span className="text-sm">{user.employeeName}</span>
                      </div>
                      {newMessagesMap[user.empId] && (
                        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {newMessagesMap[user.empId]}
                        </div>
                      )}
                    </div>
                  ))
                : <div className="text-gray-400 text-sm">No chats yet</div>}
            </div>
          </div>

          {/* Chat Box */}
          <div className="flex-1 flex flex-col bg-gray-100">
            <div className="flex justify-between items-center px-6 py-4 bg-white border-b">
              <div>
                <div className="font-semibold text-lg">
                  {selectedUser
                    ? `${selectedUser.employeeName} (${selectedUser.empId})`
                    : "Start chatting"}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedUser?.designation || ""}
                </div>
              </div>
              <div className="text-green-500 text-sm">● Active</div>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-gray-400">No messages yet.</div>
              ) : (
                messages.map((msg, idx) => {
                  const isSentByMe = msg.senderEmpId === storedUser?.empId;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-[70%] ${
                        isSentByMe ? "ml-auto items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`px-4 py-2 rounded-lg shadow text-sm whitespace-pre-wrap ${
                          isSentByMe
                            ? "bg-blue-500 text-white rounded-br-none"
                            : "bg-white text-black rounded-bl-none"
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {msg.timestamp &&
                          new Date(msg.timestamp).toLocaleString()}{" "}
                        {isSentByMe && msg.status ? `• ${msg.status}` : ""}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center px-6 py-4 bg-white border-t">
              <input
                type="text"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-full outline-none"
              />
              <button
                onClick={sendMessage}
                className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-full"
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
