import { X, MessageCircle, User } from 'lucide-react';
import { useChatMessages } from '../../contexts/ChatMessageContext';

// Individual message popup component
function MessagePopupItem({ message, onClose, onClick }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const truncateMessage = (text, maxLength = 60) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const getDisplayName = () => {
    if (message.chatType === 'group' && message.groupName) {
      return message.groupName;
    }
    return message.senderName || 'Unknown User';
  };

  const getSubtitle = () => {
    if (message.chatType === 'group' && message.groupName) {
      return `${message.senderName}: ${truncateMessage(message.message)}`;
    }
    return truncateMessage(message.message);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 mb-3 min-w-[320px] max-w-[400px] cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] relative">
      <div className="flex items-start space-x-3" onClick={() => onClick(message)}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {message.senderAvatar ? (
            <img
              src={message.senderAvatar}
              alt={message.senderName}
              className="w-10 h-10 rounded-full object-cover border-2 border-blue-100"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ${message.senderAvatar ? 'hidden' : ''}`}>
            <User className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {getDisplayName()}
            </h4>
            <span className="text-xs text-gray-500 ml-2">
              {formatTime(message.timestamp)}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 leading-relaxed">
            {getSubtitle()}
          </p>

          {/* Message type indicator */}
          <div className="flex items-center mt-2">
            <MessageCircle className="w-3 h-3 text-blue-500 mr-1" />
            <span className="text-xs text-blue-600 font-medium">
              {message.chatType === 'group' ? 'Group Message' : 'Direct Message'}
            </span>
          </div>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose(message.id);
        }}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors duration-150"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
      </button>
    </div>
  );
}

// Main popup container component
function ChatMessagePopup() {
  const { messages, handleMessageClick, removeMessage } = useChatMessages();

  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
      <div className="space-y-3 pointer-events-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className="animate-slide-in-right"
          >
            <MessagePopupItem
              message={message}
              onClose={removeMessage}
              onClick={handleMessageClick}
            />
          </div>
        ))}
      </div>

      {/* Clear all button (when multiple messages) */}
      {messages.length > 1 && (
        <div className="flex justify-end pointer-events-auto">
          <button
            onClick={() => {
              messages.forEach(msg => removeMessage(msg.id));
            }}
            className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs hover:bg-gray-700 transition-colors duration-150"
          >
            Clear All ({messages.length})
          </button>
        </div>
      )}
    </div>
  );
}

export default ChatMessagePopup;