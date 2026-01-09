import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import API_CONFIG from '../config/api.js';

// Chat Message Context
const ChatMessageContext = createContext();

// Action types
const CHAT_ACTIONS = {
  ADD_MESSAGE: 'ADD_MESSAGE',
  REMOVE_MESSAGE: 'REMOVE_MESSAGE',
  CLEAR_MESSAGES: 'CLEAR_MESSAGES',
  SET_CURRENT_CHAT: 'SET_CURRENT_CHAT',
  SET_SOCKET_CONNECTED: 'SET_SOCKET_CONNECTED'
};

// Initial state
const initialState = {
  messages: [],
  currentChatId: null,
  currentChatUserId: null,
  isSocketConnected: false
};

// Reducer
function chatMessageReducer(state, action) {
  switch (action.type) {
    case CHAT_ACTIONS.ADD_MESSAGE:
      // Prevent duplicate messages
      const messageExists = state.messages.some(msg => msg.id === action.payload.id);
      if (messageExists) return state;
      
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    
    case CHAT_ACTIONS.REMOVE_MESSAGE:
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload)
      };
    
    case CHAT_ACTIONS.CLEAR_MESSAGES:
      return {
        ...state,
        messages: []
      };
    
    case CHAT_ACTIONS.SET_CURRENT_CHAT:
      return {
        ...state,
        currentChatId: action.payload.chatId,
        currentChatUserId: action.payload.userId
      };
    
    case CHAT_ACTIONS.SET_SOCKET_CONNECTED:
      return {
        ...state,
        isSocketConnected: action.payload
      };
    
    default:
      return state;
  }
}

// Provider component
export function ChatMessageProvider({ children }) {
  const [state, dispatch] = useReducer(chatMessageReducer, initialState);
  const location = useLocation();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const messageTimeoutRef = useRef(new Map());

  // Get auth token
  const getAuthToken = () => {
    return (
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  };

  // Get user data
  const getUserData = () => {
    const userString = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!userString) return null;
    
    try {
      return JSON.parse(userString);
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  // Check if user is on the same chat screen
  const checkIfOnSameChatScreen = useCallback((messageData) => {
    const currentPath = location.pathname;
    const isOnChatPage = currentPath.includes('/Chat') || currentPath.includes('/chat');
    
    if (!isOnChatPage) return false;

    // Check if it's the same conversation
    const messageChatId = messageData.chatId || messageData.conversationId;
    const messageSenderId = messageData.senderId || messageData.sender?.id || messageData.sender?._id;
    
    return (
      (state.currentChatId && state.currentChatId === messageChatId) ||
      (state.currentChatUserId && state.currentChatUserId === messageSenderId)
    );
  }, [state.currentChatId, state.currentChatUserId, location.pathname]);

  // Handle new message
  const handleNewMessage = useCallback((messageData) => {
    const userData = getUserData();
    if (!userData || !messageData) return;

    const currentUserId = userData.id || userData._id;
    const senderId = messageData.senderId || messageData.sender?.id || messageData.sender?._id;
    
    // Don't show popup for own messages
    if (senderId === currentUserId) return;

    // Check if user is currently on the same chat screen
    const isOnSameChatScreen = checkIfOnSameChatScreen(messageData);
    if (isOnSameChatScreen) return;

    // Create message popup data
    const popupMessage = {
      id: messageData.id || messageData._id || `msg_${Date.now()}_${Math.random()}`,
      senderId: senderId,
      senderName: messageData.senderName || messageData.sender?.name || messageData.sender?.username || 'Unknown User',
      senderAvatar: messageData.senderAvatar || messageData.sender?.avatar || messageData.sender?.profileImage,
      message: messageData.message || messageData.content || messageData.text || '',
      chatId: messageData.chatId || messageData.conversationId,
      chatType: messageData.chatType || 'private', // 'private', 'group'
      timestamp: messageData.timestamp || new Date().toISOString(),
      groupName: messageData.groupName || messageData.group?.name
    };

    // Add message to state
    dispatch({ type: CHAT_ACTIONS.ADD_MESSAGE, payload: popupMessage });

    // Auto-remove message after 5 seconds
    const timeoutId = setTimeout(() => {
      dispatch({ type: CHAT_ACTIONS.REMOVE_MESSAGE, payload: popupMessage.id });
      messageTimeoutRef.current.delete(popupMessage.id);
    }, 5000);

    messageTimeoutRef.current.set(popupMessage.id, timeoutId);
  }, [checkIfOnSameChatScreen]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = getAuthToken();
    const userData = getUserData();
    
    if (!token || !userData) {
      console.log('No authentication data found, skipping socket connection');
      return;
    }

    // Get socket URL from environment variables or API config (Vite uses import.meta.env)
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 
                     import.meta.env.REACT_APP_SOCKET_URL || 
                     API_CONFIG.BASE_URL || 
                     'https://vpl-liveproject-1.onrender.com';

    try {
      // Initialize socket connection
      socketRef.current = io(socketUrl, {
        auth: {
          token: token,
          userId: userData.id || userData._id
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });

      const socket = socketRef.current;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('Socket connected for chat messages');
        dispatch({ type: CHAT_ACTIONS.SET_SOCKET_CONNECTED, payload: true });
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        dispatch({ type: CHAT_ACTIONS.SET_SOCKET_CONNECTED, payload: false });
      });

      socket.on('connect_error', (error) => {
        console.warn('Socket connection error:', error.message);
        dispatch({ type: CHAT_ACTIONS.SET_SOCKET_CONNECTED, payload: false });
      });

      // Listen for new chat messages
      socket.on('new_message', handleNewMessage);
      socket.on('private_message', handleNewMessage);
      socket.on('group_message', handleNewMessage);

      // Test message handler (remove in production)
      const handleTestMessage = (event) => {
        handleNewMessage(event.detail);
      };
      window.addEventListener('test_message', handleTestMessage);

      return () => {
        if (socket) {
          socket.off('new_message', handleNewMessage);
          socket.off('private_message', handleNewMessage);
          socket.off('group_message', handleNewMessage);
          socket.disconnect();
        }
        // Clear all timeouts
        messageTimeoutRef.current.forEach(timeoutId => clearTimeout(timeoutId));
        messageTimeoutRef.current.clear();
        // Remove test listener
        window.removeEventListener('test_message', handleTestMessage);
      };
    } catch (error) {
      console.error('Failed to initialize socket connection:', error);
      dispatch({ type: CHAT_ACTIONS.SET_SOCKET_CONNECTED, payload: false });
    }
  }, [handleNewMessage]);

  // Update current chat when user navigates
  useEffect(() => {
    // Extract chat info from URL or state
    const urlParams = new URLSearchParams(location.search);
    const chatId = urlParams.get('chatId') || urlParams.get('conversationId');
    const userId = urlParams.get('userId') || urlParams.get('senderId');
    
    dispatch({
      type: CHAT_ACTIONS.SET_CURRENT_CHAT,
      payload: {
        chatId: chatId,
        userId: userId
      }
    });
  }, [location]);

  // Handle message click - navigate to chat
  const handleMessageClick = (message) => {
    // Remove the clicked message immediately
    dispatch({ type: CHAT_ACTIONS.REMOVE_MESSAGE, payload: message.id });
    
    // Clear timeout for this message
    const timeoutId = messageTimeoutRef.current.get(message.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      messageTimeoutRef.current.delete(message.id);
    }

    // Navigate to chat page with appropriate parameters
    const chatParams = new URLSearchParams();
    
    if (message.chatId) {
      chatParams.set('chatId', message.chatId);
    }
    if (message.senderId) {
      chatParams.set('userId', message.senderId);
    }
    if (message.chatType) {
      chatParams.set('type', message.chatType);
    }

    navigate(`/Chat?${chatParams.toString()}`);
  };

  // Manually remove message
  const removeMessage = (messageId) => {
    dispatch({ type: CHAT_ACTIONS.REMOVE_MESSAGE, payload: messageId });
    
    // Clear timeout
    const timeoutId = messageTimeoutRef.current.get(messageId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      messageTimeoutRef.current.delete(messageId);
    }
  };

  // Clear all messages
  const clearAllMessages = () => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_MESSAGES });
    
    // Clear all timeouts
    messageTimeoutRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    messageTimeoutRef.current.clear();
  };

  // Set current chat manually (for when user opens a chat)
  const setCurrentChat = (chatId, userId) => {
    dispatch({
      type: CHAT_ACTIONS.SET_CURRENT_CHAT,
      payload: { chatId, userId }
    });
  };

  const value = {
    messages: state.messages,
    currentChatId: state.currentChatId,
    currentChatUserId: state.currentChatUserId,
    isSocketConnected: state.isSocketConnected,
    handleMessageClick,
    removeMessage,
    clearAllMessages,
    setCurrentChat
  };

  return (
    <ChatMessageContext.Provider value={value}>
      {children}
    </ChatMessageContext.Provider>
  );
}

// Custom hook to use the context
export function useChatMessages() {
  const context = useContext(ChatMessageContext);
  if (!context) {
    throw new Error('useChatMessages must be used within a ChatMessageProvider');
  }
  return context;
}

export default ChatMessageContext;