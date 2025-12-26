# Chat Notification System Implementation

## Overview
A comprehensive real-time notification system has been implemented for the chat application. This system handles notifications for individual messages, group messages, and load-specific messages via Socket.io.

## What Was Implemented

### 1. NotificationHandler Component (`src/Components/NotificationHandler.jsx`)
- **Socket.io Integration**: Connects to the backend socket server and listens for `notification` events
- **Browser Notifications**: Shows native browser notifications when messages are received
- **In-App Notifications**: Displays toast-style notifications in the app
- **Smart Notification Logic**: Prevents duplicate notifications and suppresses notifications when user is viewing the relevant chat
- **Sound Support**: Plays notification sounds (requires sound file in public folder)
- **Navigation**: Handles clicking notifications to navigate to the appropriate chat

### 2. NotificationToast Component (`src/Components/NotificationToast.jsx`)
- **Visual Toast Component**: Displays in-app notification toasts
- **Rich Content**: Shows sender name, message preview, timestamp, and file type icons
- **Auto-dismiss**: Automatically removes notifications after 5 seconds
- **Clickable**: Users can click to navigate to the chat

### 3. Integration
- **App.jsx**: NotificationHandler has been added to the global components
- **CSS Animations**: Added slide-in animation for notification toasts in `src/index.css`

## Features

### ✅ Browser Notifications
- Requests permission on app load
- Shows native browser notifications
- Handles notification clicks to navigate to chats
- Auto-closes after 5 seconds
- Prevents duplicates using message IDs

### ✅ In-App Notifications
- Toast-style notifications in top-right corner
- Shows sender name, message preview, and timestamp
- File type indicators (image, file, audio)
- Clickable to navigate to chat
- Auto-dismiss after 5 seconds

### ✅ Notification Types Supported
1. **Individual Messages**: Direct messages between users
2. **Group Messages**: Messages in group chats
3. **Load Messages**: Messages related to specific loads

### ✅ Smart Features
- Prevents showing notifications when user is viewing that chat
- Prevents duplicate notifications
- Handles socket reconnection automatically
- Updates unread counts (placeholder for your implementation)

## Setup Instructions

### 1. Add Notification Sound File (Optional)
Add a notification sound file to the `public` folder:
- File name: `notification-sound.mp3`
- Path: `public/notification-sound.mp3`
- If not added, notifications will work but without sound

### 2. Backend Requirements
Ensure your backend:
- Emits `notification` events via Socket.io
- Sends notifications with the following structure:
```javascript
{
  title: string,              // Sender name or group name
  body: string,              // Message text
  from: string,              // Sender empId
  senderName: string,        // Sender full name
  senderAliasName: string,   // Sender alias
  type: 'individual' | 'group' | 'load',
  messageId: string,         // Unique message ID
  timestamp: Date,
  hasImage: boolean,
  hasFile: boolean,
  hasAudio: boolean,
  // Type-specific fields:
  receiverEmpId?: string,    // For individual
  groupId?: string,          // For group
  groupName?: string,        // For group
  loadId?: string            // For load
}
```

### 3. Optional: Chat Component Integration
To enable opening chats from notifications, you can add event listeners in your Chat component:

```javascript
// In Chat.jsx component
useEffect(() => {
  const handleOpenChatWithUser = (event) => {
    const { empId } = event.detail;
    // Find and select the user in chat list
    const user = chatUsers.find(u => u.empId === empId);
    if (user) {
      setSelectedUser(user);
      setChatType('individual');
    }
  };

  const handleOpenGroupChat = (event) => {
    const { groupId } = event.detail;
    // Find and select the group
    const group = groups.find(g => g._id === groupId);
    if (group) {
      setSelectedGroup(group);
      setChatType('group');
    }
  };

  const handleOpenLoadChat = (event) => {
    const { loadId } = event.detail;
    // Handle load chat opening
    // Adjust based on your load chat implementation
  };

  window.addEventListener('openChatWithUser', handleOpenChatWithUser);
  window.addEventListener('openGroupChat', handleOpenGroupChat);
  window.addEventListener('openLoadChat', handleOpenLoadChat);

  return () => {
    window.removeEventListener('openChatWithUser', handleOpenChatWithUser);
    window.removeEventListener('openGroupChat', handleOpenGroupChat);
    window.removeEventListener('openLoadChat', handleOpenLoadChat);
  };
}, [chatUsers, groups]);
```

## How It Works

1. **Socket Connection**: On app load, NotificationHandler connects to Socket.io
2. **Join Room**: Emits `join` event with user's `empId` to receive notifications
3. **Listen for Events**: Listens for `notification` events from backend
4. **Show Notifications**: 
   - Shows browser notification (if permission granted)
   - Shows in-app toast notification
   - Plays sound (if file exists)
5. **Handle Clicks**: When notification is clicked, navigates to Chat page and dispatches custom event

## Configuration

### Socket URL
The notification handler uses `API_CONFIG.BASE_URL` for the socket connection. Make sure this is configured correctly in `src/config/api.js`.

### Notification Permission
- Browser will request permission on first load
- Permission status is stored in component state
- Users can manually grant/deny permission in browser settings

## Testing

1. **Test Individual Notifications**:
   - Have User A send a message to User B
   - User B should receive notification

2. **Test Group Notifications**:
   - Send a message in a group
   - All group members should receive notifications

3. **Test Load Notifications**:
   - Send a message related to a load
   - Relevant users should receive notifications

4. **Test Browser Notifications**:
   - Grant notification permission
   - Minimize browser or switch tabs
   - Send a message
   - Browser notification should appear

5. **Test Duplicate Prevention**:
   - Send multiple messages quickly
   - Should not show duplicate notifications

## Troubleshooting

### Notifications Not Appearing
1. Check browser console for errors
2. Verify socket connection: Check `socket.connected` in console
3. Verify `join` event was emitted with correct `empId`
4. Check backend logs for `notification` events being emitted
5. Verify notification permission is granted

### Browser Notifications Not Showing
1. Check if browser supports notifications: `'Notification' in window`
2. Check permission status: `Notification.permission`
3. Ensure HTTPS in production (required for notifications)
4. Check browser settings for notification permissions

### Sound Not Playing
1. Ensure `notification-sound.mp3` exists in `public` folder
2. Check browser autoplay policies
3. Some browsers require user interaction before playing audio
4. Check browser console for audio errors

### Notifications Appearing When Viewing Chat
- This is expected behavior - the system checks if user is on `/Chat` route
- For more precise detection, integrate with Chat component state (see Optional Integration above)

## Files Modified/Created

### Created Files:
- `src/Components/NotificationHandler.jsx` - Main notification handler component
- `src/Components/NotificationToast.jsx` - Toast notification component
- `NOTIFICATION_IMPLEMENTATION.md` - This documentation

### Modified Files:
- `src/App.jsx` - Added NotificationHandler to global components
- `src/index.css` - Added slideIn animation for notifications

## Next Steps

1. **Add Notification Sound**: Add `notification-sound.mp3` to `public` folder
2. **Integrate with Chat Component**: Add event listeners in Chat.jsx (optional)
3. **Update Unread Counts**: Implement unread count update logic in `updateUnreadCount` function
4. **Customize Styling**: Adjust notification toast styling to match your design system
5. **Test Thoroughly**: Test all notification types and scenarios

## Support

For issues or questions:
1. Check browser console for errors
2. Verify socket connection status
3. Check notification permissions
4. Review backend logs for socket events
5. Refer to the original implementation guide for detailed API reference

