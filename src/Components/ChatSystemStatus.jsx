import { useChatMessages } from '../contexts/ChatMessageContext';

function ChatSystemStatus() {
  const { isSocketConnected, messages } = useChatMessages();

  // Only show in development
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-20 left-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs z-50 opacity-75 hover:opacity-100 transition-opacity">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
        <span>Chat System: {isSocketConnected ? 'Connected' : 'Disconnected'}</span>
        {messages.length > 0 && (
          <span className="bg-blue-500 px-1 rounded">{messages.length}</span>
        )}
      </div>
    </div>
  );
}

export default ChatSystemStatus;