# Import Fix ✅

## 🚨 ปัญหาที่พบ:
- `imageApi is not defined` error
- API instances ไม่ได้ถูก import ใน `auth.service.ts`

## 🔧 การแก้ไข:

### 1. เพิ่ม Import Statements
```typescript
// ใน auth.service.ts
import { authApi, imageApi, visionApi, resultsApi, labwareApi, predictionApi } from './api'
```

### 2. ปรับปรุง refreshToken Function
```typescript
// รองรับ response structure ใหม่
async refreshToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }
  
  try {
    const res = await authApi.post<LoginResponse>('/api/v1/auth/refresh', { refreshToken })
    
    // Handle different response structures
    let accessToken = null
    let newRefreshToken = null
    
    if (res.accessToken) {
      // Direct structure: {accessToken: "...", refreshToken: "..."}
      accessToken = res.accessToken
      newRefreshToken = res.refreshToken
    } else if (res.data && res.data.accessToken) {
      // Nested structure: {success: true, data: {accessToken: "...", refreshToken: "..."}}
      accessToken = res.data.accessToken
      newRefreshToken = res.data.refreshToken
    }
    
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      if (newRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
      }
      this.setTokensForAllServices(accessToken)
      return accessToken
    }
  } catch (error) {
    this.logout()
    throw error
  }
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

## ✅ Expected Result:

1. **ไม่มี import errors** ✅
2. **Token ถูกเก็บใน localStorage** ✅
3. **Token ถูก set สำหรับทุก services** ✅
4. **Token validation ผ่าน** ✅
5. **Redirect ไป /capture** ✅
6. **หน้า capture แสดงขึ้น** ✅

## 🚨 หากยังไม่ทำงาน:

### 1. ตรวจสอบ Console Errors
- ดูว่ามี error messages หรือไม่
- ตรวจสอบ import errors

### 2. ตรวจสอบ Network Tab
- ดูว่า login request สำเร็จหรือไม่
- ตรวจสอบ response structure

### 3. Manual Test
```javascript
// ใน browser console
localStorage.setItem('access_token', 'test-token');
console.log('Manual token set:', localStorage.getItem('access_token'));
```

---

**ตอนนี้ import errors ควรหายไปแล้ว!** 🎉
