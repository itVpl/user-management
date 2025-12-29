# Production Deployment Guide - Netlify

## ✅ What's Already Fixed

### Backend Fixes (Already Deployed)
1. ✅ Added POST route `/api/v1/chat/mark-seen/:empId` 
2. ✅ Updated Socket.io CORS to include production URLs
3. ✅ Fixed `getUserChatFiles` 500 error with null check

### Frontend Fixes (Already Done)
1. ✅ Fixed `socketService.js` - removed localhost hardcode
2. ✅ Fixed `ChatMessageContext.jsx` - removed localhost hardcode  
3. ✅ Fixed `SocketContext.js` - removed localhost hardcode
4. ✅ Added mark-seen endpoint fallback (POST → PATCH)
5. ✅ All socket services now use `API_CONFIG.BASE_URL`

---

## 🚀 Netlify Deployment Steps

### Step 1: Set Environment Variables

Go to **Netlify Dashboard** → **Your Site** → **Site Settings** → **Environment Variables** → **Add variable**

**Required Variable:**
```
Variable name: VITE_API_BASE_URL
Value: https://vpl-liveproject-1.onrender.com/api/v1
```

**Optional Variables (if you want separate socket URL):**
```
Variable name: VITE_SOCKET_URL
Value: https://vpl-liveproject-1.onrender.com
```

### Step 2: Build Settings

Netlify should auto-detect these from `netlify.toml`, but verify:

- **Build command:** `npm run build`
- **Publish directory:** `dist`

### Step 3: Deploy

1. Push your code to your repository
2. Netlify will automatically build and deploy
3. Or manually trigger a deploy from Netlify Dashboard

---

## 🔍 Verification Checklist

After deployment, check the following:

### 1. Environment Variables
- [ ] Open browser console on deployed site
- [ ] Check that no `localhost:3001` errors appear
- [ ] Verify socket connects to production URL

### 2. Socket Connection
- [ ] Look for: `✅✅✅ SHARED Socket CONNECTED: [socket-id]`
- [ ] Should see: `🚀 Initializing SHARED socket connection for user: [empId]`
- [ ] Should NOT see: `WebSocket connection to 'ws://localhost:3001' failed`

### 3. API Endpoints
- [ ] `/api/v1/chat/mark-seen/:empId` returns 200 (not 404)
- [ ] `/api/v1/chat/files/user/:empId` returns 200 (not 500)
- [ ] Chat messages load correctly

### 4. Notifications
- [ ] Notifications are received in production
- [ ] Real-time updates work
- [ ] Red dot indicator updates correctly

---

## 🐛 Debugging Socket Issues

If sockets aren't connecting, add this debug code temporarily:

```javascript
// In browser console on deployed site
console.log('Environment check:');
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('VITE_SOCKET_URL:', import.meta.env.VITE_SOCKET_URL);
console.log('API_CONFIG.BASE_URL:', window.API_CONFIG?.BASE_URL);
```

### Common Issues:

#### Issue: Socket still connecting to localhost
**Solution:** 
- Verify `VITE_API_BASE_URL` is set in Netlify environment variables
- Clear browser cache and hard refresh (Ctrl+Shift+R)
- Check build logs to confirm env var is included

#### Issue: CORS errors
**Solution:**
- Backend CORS should already include your Netlify domain
- Check Network tab to see actual request URL
- Verify backend CORS config includes your Netlify URL

#### Issue: 404 on mark-seen
**Solution:**
- Frontend already has fallback (POST → PATCH)
- Check Network tab to see which endpoint is being called
- Verify backend has both routes deployed

#### Issue: Notifications not working
**Solution:**
1. Check socket connection is established
2. Verify `join` event is emitted with correct `empId`
3. Check browser console for errors
4. Verify authentication token is valid

---

## 📋 Environment Variables Reference

### Required for Production:
```env
VITE_API_BASE_URL=https://vpl-liveproject-1.onrender.com/api/v1
```

### Optional:
```env
VITE_SOCKET_URL=https://vpl-liveproject-1.onrender.com
VITE_BACKEND_URL=https://vpl-liveproject-1.onrender.com
```

### For Local Development:
Create `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_SOCKET_URL=http://localhost:3001
```

---

## 🔧 Socket Connection Flow

1. **App loads** → `sharedSocketService.initialize(empId)` called
2. **Socket URL determined:**
   - Checks `VITE_SOCKET_URL` (if set)
   - Falls back to `API_CONFIG.BASE_URL` (from `VITE_API_BASE_URL`)
   - Final fallback: `https://vpl-liveproject-1.onrender.com`
3. **Socket connects** → Emits `join` event with `empId`
4. **Notifications flow** → Backend emits events → Frontend receives

---

## 📝 API Endpoints

### Mark Messages as Seen
- **POST** `/api/v1/chat/mark-seen/:empId` ✅ (Preferred)
- **PATCH** `/api/v1/chat/seen/:empId` ✅ (Fallback)

### Chat Files
- **GET** `/api/v1/chat/files/user/:empId` ✅ (Fixed null check)

### Socket Events
- **Event:** `join` - Join with empId
- **Event:** `notification` - Receive notifications
- **Event:** `chatListUpdated` - Chat list updates
- **Event:** `newMessage` - New chat messages

---

## 🎯 Testing After Deployment

1. **Open deployed site** in browser
2. **Open DevTools Console** (F12)
3. **Login** to the application
4. **Check console logs:**
   - Should see socket connection success
   - Should NOT see localhost errors
   - Should see notification listener active
5. **Test chat functionality:**
   - Send a message
   - Check red dot indicator
   - Verify real-time updates
6. **Test notifications:**
   - Trigger a notification from backend
   - Verify it appears in frontend

---

## 🆘 Support

If issues persist:

1. **Check Browser Console** for specific errors
2. **Check Network Tab** to see actual requests
3. **Verify Environment Variables** in Netlify Dashboard
4. **Check Build Logs** in Netlify to confirm env vars are set
5. **Verify Backend CORS** includes your Netlify domain
6. **Test Socket Connection** using browser console debug code above

---

## ✅ Summary

**What's Fixed:**
- ✅ All localhost hardcodes removed
- ✅ Socket services use production URLs
- ✅ Mark-seen endpoint fallback added
- ✅ Environment variable support added

**What You Need to Do:**
1. Set `VITE_API_BASE_URL` in Netlify environment variables
2. Deploy to Netlify
3. Test and verify everything works

**Expected Result:**
- Socket connects to production URL ✅
- Notifications work in production ✅
- Chat functionality works ✅
- No localhost errors ✅

