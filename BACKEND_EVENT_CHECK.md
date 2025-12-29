# 🔍 Backend Event Emission Check

## Problem Identified

**Frontend Status:** ✅ **WORKING**
- Socket connects successfully ✅
- `join` event is emitted ✅
- Listeners are set up ✅
- Ready to receive events ✅

**Backend Status:** ❌ **NOT EMITTING EVENTS**
- No `notification` events received ❌
- No `chatListUpdated` events received ❌
- No `newMessage` events received ❌

## Root Cause

The backend is **NOT emitting socket events** when messages are sent. The frontend is correctly set up and waiting, but the backend needs to emit these events.

## Backend Fixes Required

### 1. Emit `chatListUpdated` Event When Message is Sent

**Location:** Backend chat controller/service when sending a message

**Required Code:**
```javascript
// When a message is sent, emit chatListUpdated to receiver
io.to(`user_${receiverEmpId}`).emit('chatListUpdated', {
  empId: senderEmpId,
  employeeName: sender.employeeName,
  aliasName: sender.aliasName,
  lastMessage: message,
  lastMessageTime: new Date().toISOString(),
  unreadCount: unreadCount, // Get from database
  online: isOnline(senderEmpId)
});
```

### 2. Emit `notification` Event When Message is Sent

**Location:** Backend chat controller/service when sending a message

**Required Code:**
```javascript
// Emit notification event to receiver
io.to(`user_${receiverEmpId}`).emit('notification', {
  messageId: message._id,
  receiverEmpId: receiverEmpId,
  senderEmpId: senderEmpId,
  senderName: sender.employeeName,
  senderAliasName: sender.aliasName,
  title: sender.employeeName || sender.aliasName,
  body: message.message || message.content,
  type: 'individual',
  timestamp: new Date().toISOString(),
  hasImage: !!message.image,
  hasFile: !!message.file,
  hasAudio: !!message.audio
});
```

### 3. Handle `join` Event Properly

**Location:** Backend socket handler

**Required Code:**
```javascript
socket.on('join', async (empId) => {
  console.log('User joined:', empId);
  
  // Join user to their personal room
  socket.join(`user_${empId}`);
  
  // Mark user as online
  markUserOnline(empId);
  
  // Emit initial chat list with unread counts
  const chatList = await getChatList(empId);
  socket.emit('chatListUpdated', chatList);
  
  // Notify others that this user is online
  socket.broadcast.emit('user_online', empId);
});
```

### 4. Emit `chatListUpdated` When Messages Marked as Seen

**Location:** Backend when marking messages as seen

**Required Code:**
```javascript
// After marking messages as seen
io.to(`user_${receiverEmpId}`).emit('chatListUpdated', {
  empId: senderEmpId,
  unreadCount: 0, // No unread messages
  lastMessage: lastMessage,
  lastMessageTime: lastMessageTime
});
```

## Testing Checklist

After backend fixes:

1. **Send a message:**
   - [ ] Backend emits `chatListUpdated` to receiver
   - [ ] Backend emits `notification` to receiver
   - [ ] Frontend receives `chatListUpdated` event
   - [ ] Frontend receives `notification` event
   - [ ] Unread count badge appears

2. **Mark messages as seen:**
   - [ ] Backend emits `chatListUpdated` with `unreadCount: 0`
   - [ ] Frontend receives `chatListUpdated` event
   - [ ] Unread count badge disappears

3. **Check socket rooms:**
   - [ ] User joins `user_${empId}` room on `join` event
   - [ ] Events are emitted to correct room
   - [ ] Multiple users can receive events correctly

## Debug Commands

### Check if backend is emitting events:
```javascript
// In backend console/logs, check for:
console.log('Emitting chatListUpdated to:', receiverEmpId);
console.log('Emitting notification to:', receiverEmpId);
```

### Check socket rooms:
```javascript
// In backend, check if user is in room:
console.log('User rooms:', Array.from(socket.rooms));
// Should include: `user_${empId}`
```

## Expected Frontend Console Logs

After backend fixes, you should see:

```
🔔🔔🔔 SharedSocket - Event received: chatListUpdated [{empId: "...", unreadCount: 1, ...}]
📬📬📬 CHAT LIST UPDATED EVENT RECEIVED! 📬📬📬
🔔🔔🔔 SharedSocket - Event received: notification [{messageId: "...", ...}]
🔔🔔🔔 NOTIFICATION RECEIVED! 🔔🔔🔔
```

## Summary

**Frontend:** ✅ Ready and waiting for events
**Backend:** ❌ Needs to emit events when:
- Message is sent → emit `chatListUpdated` and `notification`
- Messages marked as seen → emit `chatListUpdated` with `unreadCount: 0`
- User joins → add to `user_${empId}` room

The frontend is correctly configured. The backend needs to emit these events to the correct socket rooms.

