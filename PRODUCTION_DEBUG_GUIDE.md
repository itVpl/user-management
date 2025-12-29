# Production Debugging Guide - Notifications & Unread Count Not Working

## 🔍 Issue
- Notifications not coming in production (Netlify)
- Unread count badge not showing in Chat module in production
- Works fine locally but not in production

## 🎯 Root Causes

### 1. Environment Variable Not Set in Netlify
**Problem:** `VITE_API_BASE_URL` not set in Netlify environment variables

**Solution:**
1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Add:
   ```
   Variable name: VITE_API_BASE_URL
   Value: https://vpl-liveproject-1.onrender.com/api/v1
   ```
3. **Rebuild** the site (trigger a new deploy)

### 2. Socket Not Connecting in Production
**Problem:** Socket trying to connect but failing silently

**Debug Steps:**
1. Open browser console on production site
2. Look for these logs:
   ```
   🚀 Initializing SHARED socket connection for user: [empId]
   📍 Socket URL: [should show production URL]
   ✅✅✅ SHARED Socket CONNECTED: [socket-id]
   📤 Emitted "join" event with empId: [empId]
   ```

3. If you see connection errors:
   ```
   ❌ Shared socket connection error: [error]
   ```
   - Check CORS settings on backend
   - Verify backend URL is correct
   - Check network tab for blocked requests

### 3. Socket Connects But No Events Received
**Problem:** Socket connects but `join` event not recognized by backend

**Debug Steps:**
1. Check browser console for:
   ```
   📤 Emitted "join" event with empId: [empId]
   ```

2. Check backend logs to see if `join` event is received

3. Verify backend socket handler is working:
   ```javascript
   // Backend should log when join event is received
   socket.on('join', (empId) => {
     console.log('User joined:', empId);
     socket.join(`user_${empId}`);
   });
   ```

### 4. CORS Issues
**Problem:** Backend CORS not allowing Netlify domain

**Solution:**
Backend CORS should include your Netlify domain:
```javascript
cors: {
  origin: [
    'https://vpower.netlify.app',  // Your Netlify domain
    'https://fluffy-fenglisu-36edff.netlify.app',
    'http://localhost:5173',
    // ... other domains
  ],
  credentials: true
}
```

## 🔧 Quick Fixes

### Fix 1: Add Environment Variable in Netlify
1. Netlify Dashboard → Site Settings → Environment Variables
2. Add: `VITE_API_BASE_URL=https://vpl-liveproject-1.onrender.com/api/v1`
3. Rebuild site

### Fix 2: Verify Socket Connection
Add this to browser console on production site:
```javascript
// Check socket connection
const socket = window.sharedSocketService?.getSocket();
console.log('Socket:', socket);
console.log('Socket connected:', socket?.connected);
console.log('Socket URL:', socket?.io?.uri);
console.log('Socket ID:', socket?.id);
```

### Fix 3: Check Backend Socket Handler
Verify backend is listening for `join` event and emitting `chatListUpdated`:
```javascript
// Backend should have:
socket.on('join', async (empId) => {
  console.log('User joined:', empId);
  socket.join(`user_${empId}`);
  
  // Emit initial chat list
  const chatList = await getChatList(empId);
  socket.emit('chatListUpdated', chatList);
});
```

## 📋 Debugging Checklist

### In Production (Netlify):
- [ ] Environment variable `VITE_API_BASE_URL` is set
- [ ] Site has been rebuilt after setting env var
- [ ] Browser console shows socket connecting
- [ ] Browser console shows `join` event emitted
- [ ] Network tab shows WebSocket connection established
- [ ] No CORS errors in console
- [ ] Backend logs show `join` event received
- [ ] Backend logs show `chatListUpdated` event emitted

### Browser Console Checks:
```javascript
// Run these in browser console on production site:

// 1. Check environment variables
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('API_CONFIG.BASE_URL:', window.API_CONFIG?.BASE_URL);

// 2. Check socket connection
const socketService = await import('./src/services/sharedSocketService.js');
const socket = socketService.default.getSocket();
console.log('Socket:', socket);
console.log('Connected:', socket?.connected);
console.log('Socket URL:', socket?.io?.uri);

// 3. Check if listeners are set up
console.log('Socket listeners:', socket?.listeners);
```

## 🐛 Common Issues & Solutions

### Issue: Socket URL shows localhost in production
**Cause:** Environment variable not set or not loaded
**Solution:** Set `VITE_API_BASE_URL` in Netlify and rebuild

### Issue: Socket connects but no events
**Cause:** Backend not recognizing `join` event or not emitting events
**Solution:** Check backend socket handlers

### Issue: CORS errors
**Cause:** Backend CORS not including Netlify domain
**Solution:** Add Netlify domain to backend CORS config

### Issue: Environment variable not loading
**Cause:** Vite requires rebuild after env var changes
**Solution:** Trigger new build in Netlify

## 🚀 Step-by-Step Fix

1. **Set Environment Variable:**
   - Netlify Dashboard → Site Settings → Environment Variables
   - Add: `VITE_API_BASE_URL=https://vpl-liveproject-1.onrender.com/api/v1`

2. **Rebuild Site:**
   - Netlify Dashboard → Deploys → Trigger deploy

3. **Test in Production:**
   - Open production site
   - Open browser console
   - Check for socket connection logs
   - Send a test message
   - Verify unread count appears

4. **Verify Backend:**
   - Check backend logs for socket connections
   - Verify `join` events are received
   - Verify `chatListUpdated` events are emitted

## 📞 Still Not Working?

If still not working after above steps:

1. **Check Browser Console:**
   - Look for any errors
   - Check socket connection status
   - Verify environment variables

2. **Check Network Tab:**
   - Look for WebSocket connection
   - Check if it's connecting to correct URL
   - Verify no blocked requests

3. **Check Backend Logs:**
   - Verify socket connections
   - Check if `join` events are received
   - Verify events are being emitted

4. **Verify CORS:**
   - Check backend CORS includes Netlify domain
   - Verify credentials are allowed

