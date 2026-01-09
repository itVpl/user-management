# Backend Group Notification Requirements

## Problem
Group red dots are not appearing because the `groupId` format from backend notifications might not match the `group._id` format in the frontend groups list.

## What Backend Needs to Send

### 1. Socket Event: `newGroupMessage`
When a group message is sent, backend should emit:
```javascript
io.to(`user_${receiverEmpId}`).emit('newGroupMessage', {
  groupId: group._id,           // MUST be the same format as group._id from /api/v1/chat/group/list
  groupName: group.groupName,    // Group name for display
  senderEmpId: sender.empId,
  senderName: sender.employeeName,
  senderAliasName: sender.aliasName,
  message: messageText,          // Message content
  audio: audioUrl || null,
  image: imageUrl || null,
  file: fileUrl || null
});
```

### 2. Socket Event: `notification` (for group messages)
When a group message is sent, backend should also emit:
```javascript
io.to(`user_${receiverEmpId}`).emit('notification', {
  messageId: message._id,
  type: 'group',                 // MUST be 'group' for group messages
  groupId: group._id,            // MUST match group._id format from API
  groupName: group.groupName,    // Group name
  senderEmpId: sender.empId,
  senderName: sender.employeeName,
  senderAliasName: sender.aliasName,
  title: group.groupName,        // Will be formatted as "GroupName: SenderName"
  body: messageText,
  timestamp: new Date().toISOString(),
  hasImage: !!imageUrl,
  hasFile: !!fileUrl,
  hasAudio: !!audioUrl
});
```

### 3. API Endpoint: `/api/v1/chat/group/list`
When fetching groups, backend should include `unreadCount`:
```javascript
{
  success: true,
  groups: [
    {
      _id: "groupId123",          // MUST be consistent format (string or ObjectId)
      groupName: "Test Group",
      members: [...],
      lastMessage: {...},
      unreadCount: 2              // OPTIONAL: Number of unread messages for current user
    }
  ]
}
```

## Critical Requirements

1. **groupId Format Consistency**: 
   - The `groupId` in socket events MUST match the `group._id` format from `/api/v1/chat/group/list`
   - If using MongoDB ObjectId, convert to string consistently: `String(group._id)`
   - Or always use the same format (string or ObjectId) everywhere

2. **Group Notification Type**:
   - MUST include `type: 'group'` in notification events
   - MUST include `groupId` field

3. **Unread Count Initialization**:
   - Include `unreadCount` in group list API response if available
   - This helps initialize red dots on page load

## Frontend Handling

The frontend now:
- Normalizes all groupIds to strings for consistent matching
- Handles both string and ObjectId formats
- Updates `newGroupMessagesMap` when notifications arrive
- Shows red dots when `newGroupMessagesMap[group._id] > 0`

## Testing

To verify backend is sending correct data:
1. Open browser console (F12)
2. Send a group message
3. Look for logs:
   - `🔔 Group notification received: groupId=...`
   - `📊 Updating newGroupMessagesMap for group ...`
   - `🔍 Rendering group: "GroupName"` with unreadCount

If groupId formats don't match, you'll see warnings in console.

