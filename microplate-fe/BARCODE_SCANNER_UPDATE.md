# Barcode Scanner Update ✅

## 🔧 การอัปเดต Barcode Scanner:

### 1. เพิ่ม Barcode Input Field
- **Input ใหม่**: "Barcode Scanner Input" 
- **Auto Parse**: แยกข้อมูลจาก barcode เป็น Sample Number และ Submission Number
- **Enter Key**: กด Enter เพื่อประมวลผล barcode

### 2. ปรับปรุงปุ่ม Scan QR
- **เพิ่ม Icon**: ไอคอน QR scanner
- **Click Handler**: เรียกใช้ฟังก์ชัน handleScanQR
- **Visual Design**: ดูสวยงามและใช้งานง่าย

### 3. Barcode Format Support
- **Comma Separated**: `SAMPLE123,SUBMISSION456`
- **Pipe Separated**: `SAMPLE123|SUBMISSION456`
- **Single Value**: `SAMPLE123` (ใส่เฉพาะ Sample Number)

## 🎯 Features:

### Barcode Input Field
```tsx
<Input 
  placeholder="Barcode Scanner Input" 
  value={barcodeInput}
  onChange={(e) => setBarcodeInput(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      handleScanQR()
    }
  }}
/>
```

### Scan QR Button
```tsx
<Button 
  variant="outline" 
  onClick={handleScanQR}
  className="flex items-center gap-2"
>
  <MdQrCodeScanner className="h-4 w-4" />
  Scan QR
</Button>
```

### Parse Logic
```tsx
const handleScanQR = () => {
  if (barcodeInput.trim()) {
    // Parse barcode input - supporting multiple formats
    const parts = barcodeInput.split(/[,|]/).map(part => part.trim())
    if (parts.length >= 1) {
      setSampleNo(parts[0])
    }
    if (parts.length >= 2) {
      setSubmissionNo(parts[1])
    }
    // Clear barcode input after processing
    setBarcodeInput('')
  }
}
```

## 🧪 ทดสอบ Barcode Scanner:

### Step 1: ตรวจสอบ UI
1. ไปที่ http://localhost:6410
2. Login เข้าระบบ
3. ตรวจสอบ Sample Information section:
   - มี input "Barcode Scanner Input" ใหม่
   - ปุ่ม "Scan QR" มีไอคอน QR scanner

### Step 2: ทดสอบ Barcode Parsing
1. **Format 1**: ใส่ `SAMPLE123,SUBMISSION456`
   - กด Enter หรือคลิก Scan QR
   - ตรวจสอบว่า Sample Number = "SAMPLE123"
   - ตรวจสอบว่า Submission Number = "SUBMISSION456"

2. **Format 2**: ใส่ `SAMPLE456|SUBMISSION789`
   - กด Enter หรือคลิก Scan QR
   - ตรวจสอบว่า Sample Number = "SAMPLE456"
   - ตรวจสอบว่า Submission Number = "SUBMISSION789"

3. **Format 3**: ใส่ `SAMPLE999`
   - กด Enter หรือคลิก Scan QR
   - ตรวจสอบว่า Sample Number = "SAMPLE999"
   - ตรวจสอบว่า Submission Number = ""

### Step 3: ทดสอบ Reset
1. ใส่ข้อมูลใน barcode input
2. กดปุ่ม Reset
3. ตรวจสอบว่าทุกช่องว่างเปล่า

### Step 4: ทดสอบ Enter Key
1. ใส่ข้อมูลใน barcode input
2. กด Enter
3. ตรวจสอบว่าข้อมูลถูกแยกและใส่ในช่องที่ถูกต้อง

## ✅ Expected Result:

### UI Components
- ✅ Barcode Scanner Input field แสดงขึ้น
- ✅ ปุ่ม Scan QR มีไอคอน QR scanner
- ✅ Layout ดูสวยงามและใช้งานง่าย

### Barcode Parsing
- ✅ รองรับ format `SAMPLE,SUBMISSION`
- ✅ รองรับ format `SAMPLE|SUBMISSION`
- ✅ รองรับ format `SAMPLE` (เฉพาะ Sample Number)
- ✅ แยกข้อมูลถูกต้อง
- ✅ Clear input หลังประมวลผล

### User Experience
- ✅ กด Enter เพื่อประมวลผล
- ✅ คลิกปุ่ม Scan QR เพื่อประมวลผล
- ✅ Reset ทำงานถูกต้อง
- ✅ Responsive design

## 🔧 Technical Details:

### State Management
```tsx
const [barcodeInput, setBarcodeInput] = useState('')
```

### Parse Logic
- **Regex**: `/[,|]/` รองรับทั้ง comma และ pipe
- **Trim**: ลบ whitespace ออก
- **Validation**: ตรวจสอบว่ามีข้อมูลก่อนประมวลผล

### Event Handling
- **onChange**: อัปเดต barcodeInput state
- **onKeyDown**: ตรวจสอบ Enter key
- **onClick**: เรียกใช้ handleScanQR

## 🚨 หากมีปัญหา:

### 1. ตรวจสอบ Console
- ดูว่ามี error ในการ parse หรือไม่

### 2. ตรวจสอบ State
- barcodeInput state อัปเดตหรือไม่
- sampleNo และ submissionNo ถูกตั้งค่าหรือไม่

### 3. ตรวจสอบ UI
- Input field แสดงขึ้นหรือไม่
- ปุ่มมีไอคอนหรือไม่

---

**ตอนนี้ barcode scanner ทำงานได้สมบูรณ์แล้ว!** 🎉
