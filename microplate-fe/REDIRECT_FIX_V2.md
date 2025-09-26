# Login Redirect Fix V2 ✅

## 🔧 ปัญหาที่แก้ไขแล้ว:

### 1. **React Router Navigation**
- เปลี่ยนจาก `window.location.href` เป็น `useNavigate()`
- ใช้ `navigate('/capture', { replace: true })` แทน

### 2. **App State Management**
- เพิ่ม `useState` และ `useEffect` ใน `App.tsx`
- ตรวจสอบ authentication status แบบ real-time
- ฟัง storage events เพื่อ update state

### 3. **Token Management**
- เพิ่มฟังก์ชัน `isTokenValid()` เพื่อตรวจสอบ token
- เพิ่มฟังก์ชัน `getCurrentToken()` เพื่อดึง token ปัจจุบัน
- ปรับปรุง `setTokensForAllServices()` และ `clearTokensFromAllServices()`

## 🚀 การเปลี่ยนแปลงหลัก:

### 1. **AuthPage.tsx**
```typescript
// ใช้ useNavigate แทน window.location.href
const navigate = useNavigate();

// หลัง login สำเร็จ
await authService.login({ username: username || email, password });
// Trigger storage event เพื่อ update App state
window.dispatchEvent(new StorageEvent('storage', {
  key: 'access_token',
  newValue: authService.getCurrentToken(),
  storageArea: localStorage
}));
// Redirect ไปหน้า capture
navigate('/capture', { replace: true });
```

### 2. **App.tsx**
```typescript
// เพิ่ม state management
const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

// ตรวจสอบ auth status แบบ real-time
useEffect(() => {
  const checkAuth = () => {
    const token = authService.loadTokenFromStorage();
    setIsAuthenticated(!!token && authService.isTokenValid());
  };
  
  checkAuth();
  
  // ฟัง storage changes
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'access_token') {
      checkAuth();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

### 3. **auth.service.ts**
```typescript
// เพิ่มฟังก์ชันใหม่
isTokenValid(): boolean {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (!token) return false
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Math.floor(Date.now() / 1000)
    return payload.exp && payload.exp > now
  } catch {
    return false
  }
}

getCurrentToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}
```

## 🧪 ทดสอบ Login Flow:

### Step 1: เริ่มต้น
1. ไปที่ http://localhost:6410
2. ควรเห็นหน้า login

### Step 2: Login
1. ใส่ข้อมูล:
   - Username/Email: `qi@qi.com` หรือ `qiadmin`
   - Password: `[รหัสผ่านของคุณ]`
2. กด Login

### Step 3: Expected Result
1. ✅ Login request ส่งไป auth service
2. ✅ JWT token ถูกเก็บใน localStorage
3. ✅ Storage event ถูก trigger
4. ✅ App state ถูก update
5. ✅ Redirect ไปหน้า `/capture`
6. ✅ แสดง navbar และ footer
7. ✅ ไม่มี loading screen

## 🔍 Debug Information:

### Console Logs
ควรเห็น:
- ไม่มี React Router warnings
- Login request สำเร็จ
- Redirect ไป `/capture`

### Network Tab
- `POST /api/v1/auth/login` → 200 OK
- JWT token ใน response

### Local Storage
- `access_token` ถูกเก็บ
- Token ยังไม่หมดอายุ

### URL
- เปลี่ยนจาก `/auth` เป็น `/capture`

## 🚨 หากยังไม่ทำงาน:

### 1. ตรวจสอบ Console
```javascript
// ตรวจสอบ token
console.log('Token:', localStorage.getItem('access_token'));

// ตรวจสอบ token validity
console.log('Token valid:', authService.isTokenValid());
```

### 2. ตรวจสอบ Network
- ดูว่า login request สำเร็จหรือไม่
- ตรวจสอบ response มี accessToken หรือไม่

### 3. ตรวจสอบ URL
- ดูว่า URL เปลี่ยนเป็น `/capture` หรือไม่
- ตรวจสอบว่าไม่ติด loading screen

### 4. Manual Test
- ลองไปที่ `/capture` โดยตรงหลังจาก login
- ตรวจสอบว่า AuthGuard ทำงานถูกต้อง

## 🎉 Success Indicators:

- ✅ Login redirects ไป `/capture` ทันที
- ✅ Navbar และ footer แสดงขึ้น
- ✅ ไม่มี loading screen ติดค้าง
- ✅ สามารถเข้าถึง protected routes ได้
- ✅ Token ถูกเก็บและใช้งานได้

---

**ตอนนี้ login และ redirect ควรทำงานได้สมบูรณ์แล้ว!** 🚀
