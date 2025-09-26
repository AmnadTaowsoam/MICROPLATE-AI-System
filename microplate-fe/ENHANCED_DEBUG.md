# Enhanced Debug Logging 🔍

## 🔧 การปรับปรุงที่ทำไปแล้ว:

### 1. เพิ่ม Detailed Logging ใน Login Process
```typescript
// ใน auth.service.ts
console.log('AuthService: Storing tokens in localStorage...')
localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
console.log('AuthService: Access token stored:', localStorage.getItem(ACCESS_TOKEN_KEY) ? 'Success' : 'Failed')

if (refreshToken) {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  console.log('AuthService: Refresh token stored:', localStorage.getItem(REFRESH_TOKEN_KEY) ? 'Success' : 'Failed')
}

// Set token for all API instances
console.log('AuthService: Setting tokens for all services...')
this.setTokensForAllServices(accessToken)
console.log('AuthService: Token stored and set for all services')

// Verify token is accessible
const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY)
console.log('AuthService: Verification - stored token present:', !!storedToken)
console.log('AuthService: Verification - token valid:', this.isTokenValid())
```

### 2. เพิ่ม Logging ใน setTokensForAllServices
```typescript
setTokensForAllServices(token: string) {
  console.log('AuthService: Setting token for authApi...')
  authApi.setAccessToken(token)
  console.log('AuthService: Setting token for imageApi...')
  imageApi.setAccessToken(token)
  // ... และอื่นๆ
  console.log('AuthService: All services token set complete')
}
```

### 3. เพิ่ม Logging ใน loadTokenFromStorage
```typescript
loadTokenFromStorage() {
  console.log('AuthService: Loading token from storage...')
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  console.log('AuthService: Token from storage:', token ? 'Present' : 'Missing')
  // ...
}
```

## 🧪 ทดสอบ Login Flow:

### Step 1: Clear Storage
```javascript
// ใน browser console
localStorage.clear();
location.reload();
```

### Step 2: Login
1. ไปที่ http://localhost:6410
2. ใส่ข้อมูล:
   - Username/Email: `qi@qi.com` หรือ `qiadmin`
   - Password: `[รหัสผ่านของคุณ]`
3. กด Login

### Step 3: ตรวจสอบ Console Logs
ควรเห็น logs ตามลำดับ:

```
Starting login process...
Login result: {success: true, data: {…}}
AuthService: Login response: {success: true, data: {…}}
AuthService: Extracted accessToken: Present
AuthService: Extracted refreshToken: Present
AuthService: Storing tokens in localStorage...
AuthService: Access token stored: Success
AuthService: Refresh token stored: Success
AuthService: Setting tokens for all services...
AuthService: Setting token for authApi...
AuthService: Setting token for imageApi...
AuthService: Setting token for visionApi...
AuthService: Setting token for resultsApi...
AuthService: Setting token for labwareApi...
AuthService: Setting token for predictionApi...
AuthService: All services token set complete
AuthService: Token stored and set for all services
AuthService: Verification - stored token present: true
AuthService: Verification - token valid: true
Token after login: Present
Token valid: true
Triggering storage event...
App: Storage change detected: access_token Present
App: Checking authentication...
AuthService: Loading token from storage...
AuthService: Token from storage: Present
AuthService: Setting token for all services from storage...
AuthService: Setting token for authApi...
AuthService: Setting token for imageApi...
AuthService: Setting token for visionApi...
AuthService: Setting token for resultsApi...
AuthService: Setting token for labwareApi...
AuthService: Setting token for predictionApi...
AuthService: All services token set complete
App: Token present: true
App: Token valid: true
App: Authenticated: true
Navigating to /capture...
AuthGuard: Checking authentication...
AuthService: Loading token from storage...
AuthService: Token from storage: Present
AuthService: Setting token for all services from storage...
AuthService: Setting token for authApi...
AuthService: Setting token for imageApi...
AuthService: Setting token for visionApi...
AuthService: Setting token for resultsApi...
AuthService: Setting token for labwareApi...
AuthService: Setting token for predictionApi...
AuthService: All services token set complete
AuthGuard: Token present: true
AuthGuard: Token valid: true
AuthGuard: Authentication successful
```

## 🔍 ตรวจสอบ Local Storage:

### 1. ตรวจสอบ Token
```javascript
// ใน browser console
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('Refresh Token:', localStorage.getItem('refresh_token'));
```

### 2. ตรวจสอบ Token Validity
```javascript
// ใน browser console
const token = localStorage.getItem('access_token');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    console.log('Token expires at:', new Date(payload.exp * 1000));
    console.log('Token valid:', payload.exp > now);
  } catch (e) {
    console.log('Token invalid:', e.message);
  }
}
```

## 🚨 หากยังไม่ทำงาน:

### 1. ตรวจสอบ Console Errors
- ดูว่ามี error messages หรือไม่
- ตรวจสอบ network errors

### 2. ตรวจสอบ Network Tab
- ดูว่า login request สำเร็จหรือไม่
- ตรวจสอบ response structure

### 3. Manual Test
```javascript
// ใน browser console
localStorage.setItem('access_token', 'test-token');
console.log('Manual token set:', localStorage.getItem('access_token'));
```

## ✅ Expected Result:

1. **Token ถูกเก็บใน localStorage** ✅
2. **Token ถูก set สำหรับทุก services** ✅
3. **Token validation ผ่าน** ✅
4. **Redirect ไป /capture** ✅
5. **หน้า capture แสดงขึ้น** ✅

---

**กรุณาทดสอบและแชร์ console logs เพื่อให้ผมช่วย debug ต่อ** 🔍
