# Token Storage Fix ✅

## 🚨 ปัญหาที่พบ:
- Login สำเร็จแต่ token ไม่ถูกเก็บใน localStorage
- Console logs แสดง: `Token after login: Missing`
- AuthGuard redirect กลับไปหน้า auth

## 🔍 สาเหตุ:
Backend ส่ง response structure แบบ:
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {...}
  }
}
```

แต่ frontend คาดหวัง:
```json
{
  "success": true,
  "accessToken": "...",
  "refreshToken": "..."
}
```

## 🔧 การแก้ไข:

### 1. อัปเดต LoginResponse Type
```typescript
export type LoginResponse = {
  success: boolean
  data?: {
    accessToken: string
    refreshToken?: string
    expiresIn?: number
    tokenType?: string
    user?: any
  }
  accessToken?: string
  refreshToken?: string
  message?: string
}
```

### 2. ปรับปรุง Login Function
```typescript
async login(payload: LoginRequest) {
  const res = await authApi.post<LoginResponse>('/api/v1/auth/login', payload)
  console.log('AuthService: Login response:', res)
  
  // Handle different response structures
  let accessToken = null
  let refreshToken = null
  
  if (res.accessToken) {
    // Direct structure: {accessToken: "...", refreshToken: "..."}
    accessToken = res.accessToken
    refreshToken = res.refreshToken
  } else if (res.data && res.data.accessToken) {
    // Nested structure: {success: true, data: {accessToken: "...", refreshToken: "..."}}
    accessToken = res.data.accessToken
    refreshToken = res.data.refreshToken
  }
  
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
    this.setTokensForAllServices(accessToken)
  }
  
  return res
}
```

## 🧪 ทดสอบ:

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
ควรเห็น:
```
Starting login process...
Login result: {success: true, data: {…}}
AuthService: Login response: {success: true, data: {…}}
AuthService: Extracted accessToken: Present
AuthService: Extracted refreshToken: Present
AuthService: Token stored and set for all services
Token after login: Present
Token valid: true
Triggering storage event...
App: Storage change detected: access_token Present
App: Checking authentication...
App: Token present: true
App: Token valid: true
App: Authenticated: true
Navigating to /capture...
AuthGuard: Checking authentication...
AuthGuard: Token present: true
AuthGuard: Token valid: true
AuthGuard: Authentication successful
```

### Step 4: ตรวจสอบ Local Storage
```javascript
// ใน browser console
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('Refresh Token:', localStorage.getItem('refresh_token'));
```

## ✅ Expected Result:

1. **Login สำเร็จ** ✅
2. **Token ถูกเก็บใน localStorage** ✅
3. **Token valid เป็น true** ✅
4. **Redirect ไป /capture** ✅
5. **หน้า capture แสดงขึ้น** ✅
6. **Navbar และ footer แสดง** ✅

## 🚨 หากยังไม่ทำงาน:

### 1. ตรวจสอบ Network Tab
- ดูว่า login request สำเร็จหรือไม่
- ตรวจสอบ response structure

### 2. ตรวจสอบ Console Errors
- ดูว่ามี error messages หรือไม่

### 3. Manual Test
```javascript
// ใน browser console
localStorage.setItem('access_token', 'test-token');
location.href = '/capture';
```

---

**ตอนนี้ token storage ควรทำงานได้ถูกต้องแล้ว!** 🎉
