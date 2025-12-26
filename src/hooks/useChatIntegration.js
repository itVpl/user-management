import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useChatMessages } from '../contexts/ChatMessageContext';

/**
 * Custom hook for integrating chat functionality with existing chat components
 * This hook should be used in your existing Chat.jsx component
 */
export function useChatIntegration() {
  const location = useLocation();
  const { setCurrentChat } = useChatMessages();

  // Extract chat parameters from URL or component props
  const extractChatParams = useCallback(() => {
    const urlParams = new URLSearchParams(location.search);
    const chatId = urlParams.get('chatId') || urlParams.get('conversationId');
    const userId = urlParams.get('userId') || urlParams.get('senderId');
    const chatType = urlParams.get('type') || 'private';

    return { chatId, userId, chatType };
  }, [location.search]);

  // Update current chat context when component mounts or URL changes
  useEffect(() => {
    const { chatId, userId } = extractChatParams();
    if (chatId || userId) {
      setCurrentChat(chatId, userId);
    }
  }, [extractChatParams, setCurrentChat]);

  // Function to manually set current chat (useful when opening a chat programmatically)
  const openChat = useCallback((chatId, userId) => {
    setCurrentChat(chatId, userId);
  }, [setCurrentChat]);

  // Function to clear current chat (useful when closing a chat)
  const closeChat = useCallback(() => {
    setCurrentChat(null, null);
  }, [setCurrentChat]);

  return {
    openChat,
    closeChat,
    extractChatParams
  };
}

export default useChatIntegration;