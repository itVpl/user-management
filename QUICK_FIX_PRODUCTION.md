# 🚨 QUICK FIX - Production Notifications & Unread Count Not Working

## ⚡ Immediate Fix (5 minutes)

### Step 1: Set Environment Variable in Netlify

1. Go to **Netlify Dashboard**
2. Select your site
3. Go to **Site Settings** → **Environment Variables**
4. Click **Add variable**
5. Add:
   ```
   Key: VITE_API_BASE_URL
   Value: https://vpl-liveproject-1.onrender.com/api/v1
   ```
6. Click **Save**

### Step 2: Rebuild Site

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for build to complete

### Step 3: Test

1. Open your production site
2. Open browser console (F12)
3. Look for these logs:
   ```
   🌍 Using API_BASE_URL from environment: https://vpl-liveproject-1.onrender.com
   🚀 Initializing SHARED socket connection for user: [your-empId]
   📍 Socket URL: https://vpl-liveproject-1.onrender.com
   ✅✅✅ SHARED Socket CONNECTED: [socket-id]
   📤 Emitted "join" event with empId: [your-empId]
   ```

4. Send a test message from another user
5. Check if:
   - Notification appears ✅
   - Unread count badge shows ✅

## 🔍 If Still Not Working

### Check Browser Console

Run this in browser console on production site:

```javascript
// Check environment
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('MODE:', import.meta.env.MODE);

// Check socket
import('./src/services/sharedSocketService.js').then(module => {
  const socket = module.default.getSocket();
  console.log('Socket:', socket);
  console.log('Connected:', socket?.connected);
  console.log('Socket URL:', socket?.io?.uri);
  console.log('Socket ID:', socket?.id);
});
```

### Check Network Tab

1. Open **Network** tab in DevTools
2. Filter by **WS** (WebSocket)
3. Look for connection to `wss://vpl-liveproject-1.onrender.com`
4. Check if it's **connected** (green status)

### Common Issues

#### Issue 1: Environment Variable Not Set
**Symptom:** Console shows `⚠️ VITE_API_BASE_URL not set`
**Fix:** Set `VITE_API_BASE_URL` in Netlify and rebuild

#### Issue 2: Socket Not Connecting
**Symptom:** No `✅✅✅ SHARED Socket CONNECTED` log
**Fix:** 
- Check CORS on backend includes your Netlify domain
- Check backend is running
- Check network tab for connection errors

#### Issue 3: Socket Connects But No Events
**Symptom:** Socket connects but no notifications/unread counts
**Fix:**
- Check backend logs for `join` event
- Verify backend emits `chatListUpdated` event
- Check backend emits `notification` event

## 📋 Verification Checklist

After setting environment variable and rebuilding:

- [ ] Environment variable is set in Netlify
- [ ] Site has been rebuilt
- [ ] Browser console shows socket connecting
- [ ] Browser console shows `join` event emitted
- [ ] Network tab shows WebSocket connected
- [ ] Test message shows notification
- [ ] Test message shows unread count badge

## 🆘 Still Not Working?

1. **Check Backend:**
   - Verify backend is running
   - Check backend logs for socket connections
   - Verify backend CORS includes Netlify domain

2. **Check Frontend:**
   - Verify environment variable is set
   - Check browser console for errors
   - Check network tab for blocked requests

3. **Contact Support:**
   - Share browser console logs
   - Share network tab screenshot
   - Share backend logs

