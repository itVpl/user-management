# 🔔 Frontend Implementation Guide: Bid Submission Notification

## Overview
When a CMT employee submits a bid through the Rate Request form, the sales person who created the rate request will receive a real-time notification. This guide shows you how to implement the frontend to receive and display these notifications.

---

## ✅ Backend Status
**The backend is fully implemented and working!** 

From the backend logs, we can confirm:
- ✅ Socket event `bid-submitted` is being emitted to the sales person
- ✅ Database notification is being created and stored
- ✅ Email notification is being sent
- ✅ Notification is delivered to all active socket connections

**Socket Event:** `bid-submitted`  
**Target Room:** `user_{salesPersonEmpId}`

---

## 📦 Step 1: Socket Connection Setup

If you already have Socket.io setup, skip to Step 2. Otherwise, ensure your socket connection is established:

### Socket Connection Example

```javascript
import { io } from 'socket.io-client';

// In your Socket Context or Service
const socket = io('YOUR_BACKEND_URL', {
  auth: {
    token: userToken,
    empId: userEmpId
  },
  transports: ['websocket', 'polling'],
  reconnection: true
});

// Join user room (CRITICAL - must be done!)
socket.emit('join', userEmpId);
```

**Important:** The user must emit `join` with their `empId` to join the room `user_{empId}`. This is how the backend knows where to send notifications.

---

## 🎯 Step 2: Listen for Bid Submission Notification

### ⚠️ IMPORTANT: Two Socket Events Are Emitted

The backend emits **TWO** socket events for bid submissions:

1. **`bid-submitted`** - Custom event with full bid details (recommended)
2. **`notification`** - Standard notification event (for general notification system)

**You can listen to either or both events.** The `bid-submitted` event has more detailed information.

### Option A: Listen to Custom Event `bid-submitted` (Recommended)

Add a listener for the `bid-submitted` event in your component or socket service:

```javascript
import { useEffect } from 'react';
import { useSocket } from './contexts/SocketContext'; // Your socket context
import { useAuth } from './contexts/AuthContext'; // Your auth context

function YourComponent() {
  const { socket } = useSocket();
  const { user } = useAuth(); // Assuming user has empId

  useEffect(() => {
    if (!socket || !user?.empId) return;

    // Listen for bid-submitted event
    const handleBidSubmitted = (notificationData) => {
      console.log('🔔 Bid submission notification received:', notificationData);
      
      // Handle the notification
      showNotification(notificationData);
      
      // Update your notification state/store
      updateNotificationList(notificationData);
      
      // Show toast/alert to user
      showToast({
        title: 'New Bid Submitted',
        message: `A bid of $${notificationData.rate} has been submitted for load ${notificationData.loadDetails.shipmentNumber}`,
        type: 'info'
      });
    };

    // Register the listener
    socket.on('bid-submitted', handleBidSubmitted);

    // Cleanup on unmount
    return () => {
      socket.off('bid-submitted', handleBidSubmitted);
    };
  }, [socket, user?.empId]);

  // ... rest of your component
}
```

### Option B: Listen to Standard `notification` Event

If you already have a notification system listening to the `notification` event, you can use that:

```javascript
socket.on('notification', (notificationData) => {
  // Check if it's a bid submission notification
  if (notificationData.type === 'load' && notificationData.loadId) {
    console.log('🔔 Load notification received:', notificationData);
    
    // notificationData structure:
    // {
    //   title: 'New Bid Submitted',
    //   body: 'A bid of $11.11 has been submitted for load...',
    //   type: 'load',
    //   loadId: '6953b6f5e773d12e6f867666',
    //   senderName: 'Prashu',
    //   timestamp: '...',
    //   hasFile: true
    // }
    
    // Navigate to load details
    navigate(`/rate-request/${notificationData.loadId}`);
  }
});
```

**Note:** The standard `notification` event has less detail than `bid-submitted`. For full bid details (rate, origin, destination, etc.), use the `bid-submitted` event.

---

## 📋 Step 3: Notification Data Structure

The `bid-submitted` event will send the following data structure:

```typescript
interface BidSubmissionNotification {
  type: 'bid_submitted';
  bidId: string;                    // MongoDB bid ID
  loadId: string;                    // MongoDB load ID
  rate: number;                      // Bid rate amount (e.g., 1.01)
  message: string;                   // Additional message/notes from CMT employee
  submittedBy: {
    empId: string;                   // CMT employee ID who submitted
    empName: string;                 // CMT employee name (e.g., "Prashu")
  };
  salesPerson: {
    empId: string;                   // Sales person employee ID (you)
    empName: string;                 // Sales person name (e.g., "Shyam Singh")
  };
  loadDetails: {
    shipmentNumber: string;          // Load shipment number or "N/A"
    origin: string;                  // Origin location (e.g., "City, State")
    destination: string;             // Destination location (e.g., "City, State")
    vehicleType: string;             // Vehicle type (e.g., "Reefer")
  };
  timestamp: string;                 // ISO timestamp (e.g., "2025-12-30T11:20:21.457Z")
  hasAttachment: boolean;            // Whether bid has attachment/file
}
```

### Example Notification Data (from backend logs):

```json
{
  "type": "bid_submitted",
  "bidId": "6953b575e773d12e6f86062e",
  "loadId": "6953b494c0b1ecb80712dc32",
  "rate": 1.01,
  "message": "fyghjert tjertyu ert  dyt ytj",
  "submittedBy": {
    "empId": "VPL003",
    "empName": "Prashu"
  },
  "salesPerson": {
    "empId": "1234",
    "empName": "Shyam Singh"
  },
  "loadDetails": {
    "shipmentNumber": "N/A",
    "origin": "rrrrrrrrrrr, rrrrrrrrrrrr",
    "destination": "rrrrrrrrrrr, rrrrrrrrr",
    "vehicleType": "Reefer"
  },
  "timestamp": "2025-12-30T11:20:21.457Z",
  "hasAttachment": true
}
```

---

## 🎨 Step 4: Display the Notification

### Option A: Toast/Alert Notification

```javascript
import { toast } from 'react-toastify'; // or your toast library

const handleBidSubmitted = (data) => {
  toast.info(
    `💰 New Bid: $${data.rate} for Load ${data.loadDetails.shipmentNumber}`,
    {
      position: "top-right",
      autoClose: 5000,
      onClick: () => {
        // Navigate to load details page
        navigate(`/rate-request/${data.loadId}`);
      }
    }
  );
};
```

### Option B: Notification Badge/Icon

```javascript
const [unreadBidNotifications, setUnreadBidNotifications] = useState(0);

const handleBidSubmitted = (data) => {
  // Increment unread count
  setUnreadBidNotifications(prev => prev + 1);
  
  // Add to notifications list
  addToNotificationsList(data);
};
```

### Option C: Full Notification Component

```jsx
function BidNotificationCard({ notification }) {
  const { loadDetails, rate, submittedBy, timestamp, hasAttachment } = notification;

  return (
    <div className="bid-notification-card">
      <div className="notification-header">
        <span className="badge">💰 New Bid</span>
        <span className="timestamp">{formatTime(timestamp)}</span>
      </div>
      
      <div className="notification-body">
        <h4>Bid Amount: ${rate}</h4>
        <p>
          <strong>Load:</strong> {loadDetails.shipmentNumber}<br/>
          <strong>Route:</strong> {loadDetails.origin} → {loadDetails.destination}<br/>
          <strong>Vehicle:</strong> {loadDetails.vehicleType}<br/>
          <strong>Submitted by:</strong> {submittedBy.empName}
        </p>
        
        {hasAttachment && (
          <span className="attachment-badge">📎 Has Attachment</span>
        )}
      </div>
      
      <div className="notification-actions">
        <button onClick={() => navigate(`/rate-request/${notification.loadId}`)}>
          View Details
        </button>
      </div>
    </div>
  );
}
```

---

## 🔄 Step 5: Fetch Stored Notifications (Optional)

The backend also stores notifications in the database. You can fetch them when the user opens the notifications panel:

### API Endpoint

```javascript
// GET /api/v1/notifications
// Headers: Authorization: Bearer {token}
// Query params: ?type=load&loadId={loadId} (optional)

const fetchNotifications = async () => {
  try {
    const response = await fetch('/api/v1/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    return data.notifications; // Array of notification objects
  } catch (error) {
    console.error('Error fetching notifications:', error);
  }
};
```

### Notification Object from Database:

```typescript
interface DatabaseNotification {
  _id: string;
  receiverEmpId: string;
  senderEmpId: string;
  senderName: string;
  title: string;                    // "New Bid Submitted"
  body: string;                     // "A bid of $1.01 has been submitted..."
  type: 'load';                     // Notification type
  loadId: string;                  // Load ID
  hasFile: boolean;                 // Whether has attachment
  status: 'pending' | 'delivered' | 'read';
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
}
```

---

## 🎯 Step 6: Complete Implementation Example

Here's a complete example using React hooks:

```jsx
import { useEffect, useState } from 'react';
import { useSocket } from './contexts/SocketContext';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function BidNotificationHandler() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bidNotifications, setBidNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket || !user?.empId) return;

    // Ensure user has joined their room
    socket.emit('join', user.empId);

    // Listen for bid-submitted event
    const handleBidSubmitted = (notificationData) => {
      console.log('🔔 Bid submission notification:', notificationData);

      // Add to notifications list
      setBidNotifications(prev => [notificationData, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast notification
      toast.info(
        `💰 New Bid: $${notificationData.rate} for Load ${notificationData.loadDetails.shipmentNumber}`,
        {
          position: "top-right",
          autoClose: 5000,
          onClick: () => navigate(`/rate-request/${notificationData.loadId}`),
        }
      );

      // Optional: Play notification sound
      playNotificationSound();
    };

    // Register listener
    socket.on('bid-submitted', handleBidSubmitted);

    // Cleanup
    return () => {
      socket.off('bid-submitted', handleBidSubmitted);
    };
  }, [socket, user?.empId, navigate]);

  return (
    <div className="bid-notifications">
      {/* Your notification UI */}
      {unreadCount > 0 && (
        <div className="notification-badge">{unreadCount}</div>
      )}
    </div>
  );
}

export default BidNotificationHandler;
```

---

## 🧪 Step 7: Testing & Debugging

### How to Verify Notification is Working

Based on your backend logs, you should see:
- ✅ `✅ [BID NOTIFICATION] Socket notification emitted successfully to sales person: {empId}`
- ✅ `✅ Emitted notification to room: user_{empId} (X socket(s))`
- ✅ `✅ Global notification sent to {empId} (load) via X socket(s)`

### Frontend Debugging Code

Add this comprehensive debugging code to verify notifications are received:

```javascript
useEffect(() => {
  if (!socket || !user?.empId) return;

  // Debug: Log all socket events
  const originalEmit = socket.emit.bind(socket);
  socket.emit = function(...args) {
    console.log('🔍 [SOCKET DEBUG] Emitting:', args[0], args[1]);
    return originalEmit(...args);
  };

  // Debug: Log all received events
  const logAllEvents = (eventName, data) => {
    console.log(`🔍 [SOCKET DEBUG] Received event: ${eventName}`, data);
  };

  // Listen for bid-submitted
  socket.on('bid-submitted', (data) => {
    console.log('✅ [BID NOTIFICATION] bid-submitted event received:', data);
    logAllEvents('bid-submitted', data);
    // Your handler code here
  });

  // Listen for standard notification
  socket.on('notification', (data) => {
    console.log('✅ [BID NOTIFICATION] notification event received:', data);
    logAllEvents('notification', data);
    
    // Check if it's a bid-related notification
    if (data.type === 'load' && data.loadId) {
      console.log('✅ [BID NOTIFICATION] This is a load notification (likely bid-related)');
    }
  });

  // Verify socket connection
  console.log('🔍 [SOCKET DEBUG] Socket connected:', socket.connected);
  console.log('🔍 [SOCKET DEBUG] Socket ID:', socket.id);
  console.log('🔍 [SOCKET DEBUG] User empId:', user.empId);

  // Verify join event was sent
  socket.emit('join', user.empId);
  console.log('🔍 [SOCKET DEBUG] Join event emitted for:', user.empId);

  return () => {
    socket.off('bid-submitted');
    socket.off('notification');
  };
}, [socket, user?.empId]);
```

### Test Checklist:

1. ✅ **Socket Connection**
   - Verify socket is connected
   - Verify `join` event is emitted with correct `empId`
   - Check browser console for connection logs

2. ✅ **Event Listener**
   - Verify listener is registered: `socket.on('bid-submitted', ...)`
   - Check browser console when bid is submitted

3. ✅ **Notification Display**
   - Verify toast/alert appears when bid is submitted
   - Verify notification appears in notification list
   - Verify unread count increments

4. ✅ **Navigation**
   - Click notification should navigate to load details
   - Verify correct `loadId` is used in navigation

### Common Issues & Solutions:

#### Issue: Notification Not Received

**Check these in browser console:**

1. **Socket Connection:**
   ```javascript
   console.log('Socket connected:', socket.connected); // Should be true
   console.log('Socket ID:', socket.id); // Should have a value
   ```

2. **Join Event:**
   ```javascript
   // Make sure this is called after socket connects
   socket.emit('join', userEmpId);
   console.log('Join event sent for:', userEmpId);
   ```

3. **Event Listeners:**
   ```javascript
   // Check if listeners are registered
   console.log('Listeners:', socket._callbacks);
   ```

4. **User empId Match:**
   ```javascript
   // Your frontend user empId must match the sales person empId in the load
   console.log('Frontend user empId:', user.empId);
   // Should match backend log: "Sales Person empId: 1234"
   ```

#### Issue: Multiple Notifications

If you receive duplicate notifications, you're likely listening to both events. Choose one:
- Use `bid-submitted` for detailed bid info
- Use `notification` for general notification system integration

#### Issue: Notification Received But Not Displaying

Check:
- State updates are happening
- React component is re-rendering
- Toast/notification library is initialized
- No JavaScript errors in console

---

## 📱 Step 8: Integration with Existing Notification System

If you already have a notification system, integrate the bid notification:

```javascript
// In your existing notification handler
socket.on('bid-submitted', (data) => {
  // Convert to your notification format
  const notification = {
    id: data.bidId,
    type: 'bid_submission',
    title: 'New Bid Submitted',
    message: `A bid of $${data.rate} has been submitted for load ${data.loadDetails.shipmentNumber}`,
    timestamp: data.timestamp,
    data: data, // Keep full data for details page
    read: false
  };

  // Add to your notification store/state
  addNotification(notification);
  
  // Show in UI
  showNotification(notification);
});
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Notification Not Received

**Problem:** Socket event not firing

**Solutions:**
- ✅ Verify `socket.emit('join', empId)` is called after connection
- ✅ Verify user's `empId` matches the sales person `empId` in the load
- ✅ Check browser console for socket connection errors
- ✅ Verify socket is connected: `socket.connected === true`

### Issue 2: Multiple Notifications

**Problem:** Same notification received multiple times

**Solutions:**
- ✅ Use `socket.once()` instead of `socket.on()` for one-time listeners
- ✅ Check if notification already exists before adding to list
- ✅ Deduplicate by `bidId` or `notificationId`

### Issue 3: Notification Not Displaying

**Problem:** Event received but UI not updating

**Solutions:**
- ✅ Verify state update is happening
- ✅ Check React component re-renders
- ✅ Verify toast/notification library is initialized
- ✅ Check browser console for errors

---

## 📝 Summary

### Quick Implementation Checklist:

- [ ] Socket.io connection established
- [ ] `join` event emitted with user's `empId`
- [ ] Listener registered: `socket.on('bid-submitted', handler)`
- [ ] Notification data structure understood
- [ ] UI component created to display notification
- [ ] Toast/alert shown when notification received
- [ ] Navigation to load details page implemented
- [ ] Unread count badge updated
- [ ] Notification stored in state/store
- [ ] Cleanup on component unmount

### Key Points:

1. **Socket Event:** `bid-submitted`
2. **Target:** Sales person who created the rate request
3. **Room:** `user_{salesPersonEmpId}`
4. **Data:** Full bid details including rate, load info, CMT employee info
5. **Persistence:** Notification also stored in database

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Verify socket connection status
3. Check backend logs for notification emission
4. Verify user's `empId` matches sales person `empId` in load

**Backend Logs to Check:**
- `🔔 [BID NOTIFICATION] Starting bid submission notification process...`
- `✅ [BID NOTIFICATION] Socket notification emitted successfully to sales person: {empId}`
- `✅ [BID NOTIFICATION] Bid submission notification process completed successfully!`

---

## 🎉 You're Done!

Once implemented, sales employees will receive real-time notifications when CMT employees submit bids on their rate requests. The notification includes all relevant details and allows quick navigation to review the bid.
