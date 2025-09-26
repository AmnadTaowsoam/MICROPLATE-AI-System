# Debug Login Redirect Issue 🔍

## 🚨 ปัญหา: Login ไม่ redirect ไปหน้า /capture

## 🔧 การแก้ไขที่ทำไปแล้ว:

### 1. เพิ่ม Debug Logging
- **AuthPage.tsx**: เพิ่ม console.log ใน login process
- **App.tsx**: เพิ่ม console.log ใน authentication check
- **AuthGuard.tsx**: เพิ่ม console.log ใน authentication guard

### 2. ปรับปรุง Navigation
- ใช้ `useNavigate()` แทน `window.location.href`
- เพิ่ม `setTimeout` เพื่อให้ state update ก่อน redirect
- Trigger storage event เพื่อ update App state

## 🧪 วิธีการ Debug:

### Step 1: เปิด Browser Console
1. ไปที่ http://localhost:6410
2. กด F12 เพื่อเปิด Developer Tools
3. ไปที่ tab "Console"

### Step 2: ทดสอบ Login
1. ใส่ข้อมูล login:
   - Username/Email: `qi@qi.com` หรือ `qiadmin`
   - Password: `[รหัสผ่านของคุณ]`
2. กด Login
3. ดู console logs

### Step 3: ตรวจสอบ Console Logs
ควรเห็น logs ตามลำดับ:

```
Starting login process...
Login result: {success: true, accessToken: "...", ...}
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

## 🔍 สาเหตุที่เป็นไปได้:

### 1. **Token ไม่ถูกเก็บ**
- ตรวจสอบ localStorage มี `access_token` หรือไม่
- ตรวจสอบ token format ถูกต้องหรือไม่

### 2. **Token หมดอายุ**
- ตรวจสอบ token expiration time
- ตรวจสอบ system clock

### 3. **Navigation ไม่ทำงาน**
- ตรวจสอบ React Router setup
- ตรวจสอบ route configuration

### 4. **State ไม่ update**
- ตรวจสอบ storage event trigger
- ตรวจสอบ useEffect dependencies

## 🛠️ การแก้ไขเพิ่มเติม:

### 1. ตรวจสอบ Token
```javascript
// ใน browser console
console.log('Token:', localStorage.getItem('access_token'));
console.log('Token valid:', authService.isTokenValid());
```

### 2. ตรวจสอบ Navigation
```javascript
// ใน browser console
console.log('Current path:', window.location.pathname);
console.log('Navigate function:', typeof navigate);
```

### 3. ตรวจสอบ Routes
```javascript
// ใน browser console
console.log('Available routes:', ['/auth', '/capture', '/results']);
```

## 🚨 หากยังไม่ทำงาน:

### 1. **Clear Storage และลองใหม่**
```javascript
// ใน browser console
localStorage.clear();
location.reload();
```

### 2. **Manual Navigation Test**
```javascript
// ใน browser console หลัง login
window.location.href = '/capture';
```

### 3. **ตรวจสอบ Network**
- ดูว่า login request สำเร็จหรือไม่
- ตรวจสอบ response มี accessToken หรือไม่

### 4. **ตรวจสอบ Console Errors**
- ดูว่ามี error messages หรือไม่
- ตรวจสอบ network errors

## 📋 Checklist:

- [ ] Console logs แสดงตามลำดับที่คาดหวัง
- [ ] Token ถูกเก็บใน localStorage
- [ ] Token valid เป็น true
- [ ] Storage event ถูก trigger
- [ ] App state ถูก update
- [ ] Navigation ไป /capture
- [ ] AuthGuard ทำงานถูกต้อง
- [ ] หน้า capture แสดงขึ้น

## 🎯 Expected Result:

หลังจาก login สำเร็จ:
1. ✅ Console แสดง logs ตามลำดับ
2. ✅ Token ถูกเก็บและ valid
3. ✅ Redirect ไป /capture ทันที
4. ✅ หน้า capture แสดงขึ้นพร้อม navbar
5. ✅ ไม่มี error messages

---

**หากยังไม่ทำงาน กรุณาแชร์ console logs เพื่อให้ผมช่วย debug ต่อ** 🔍
