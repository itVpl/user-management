import React from 'react';

const NotificationToast = ({ notification, onClose, onClick }) => {
  const getNotificationIcon = () => {
    if (notification.hasImage) return '🖼️';
    if (notification.hasFile) return '📄';
    if (notification.hasAudio) return '🎵';
    return '💬';
  };

  const getNotificationBody = () => {
    if (notification.body) {
      return notification.body;
    }
    
    if (notification.hasImage) {
      return `${notification.senderName || notification.senderAliasName || 'Someone'} sent an image`;
    }
    
    if (notification.hasFile) {
      return `${notification.senderName || notification.senderAliasName || 'Someone'} sent a file`;
    }
    
    if (notification.hasAudio) {
      return `${notification.senderName || notification.senderAliasName || 'Someone'} sent an audio message`;
    }
    
    return 'New message';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        minWidth: '300px',
        maxWidth: '400px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        animation: 'slideIn 0.3s ease-out',
        transition: 'background-color 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f5f5f5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
      }}
    >
      <div style={{ fontSize: '24px', flexShrink: 0 }}>{getNotificationIcon()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
          {notification.title || notification.senderName || notification.senderAliasName || 'New Message'}
        </div>
        <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px', wordBreak: 'break-word' }}>
          {getNotificationBody()}
        </div>
        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
          {formatTime(notification.timestamp)}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          color: '#999',
          padding: '0',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#333';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#999';
        }}
      >
        ×
      </button>
    </div>
  );
};

export default NotificationToast;

