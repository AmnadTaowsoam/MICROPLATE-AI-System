# Image Ingestion Service

บริการสำหรับรับ-จัดเก็บ-ให้ลิงก์เข้าถึงรูปภาพของระบบ Microplate โดยเก็บลง local shared-storage และส่งเหตุการณ์ความคืบหน้า/ข้อผิดพลาดไปยัง Redis (ตัวเลือก)

## คุณสมบัติหลัก
- อัปโหลดไฟล์ภาพแบบ multipart (`POST /api/v1/images`)
- แยกเก็บตามประเภทไฟล์: `raw`, `annotated` (รองรับ `thumbnail` ไว้แล้ว)
- สร้างโฟลเดอร์อัตโนมัติและตั้งชื่อไฟล์ด้วย `timestamp + uuid`
- สร้าง URL สำหรับเข้าถึงไฟล์ผ่าน Gateway static files
- Health/Readiness checks: `/healthz`, `/readyz`
- Worker จัดการ retention: ย้ายไฟล์เก่า >30 วันไป backup และลบไฟล์ backup >90 วัน (ตั้งค่าได้)
- ส่ง log ไป Redis เป็น progress_log และ error_log (ตั้งค่าได้)

## โครงสร้างโค้ด (ย่อ)
```
src/
  config/storage.ts            # ค่าคอนฟิกเส้นทาง/URL และ ensureStorageDirectories
  routes/image.routes.ts       # เส้นทาง API อัปโหลด + health/ready
  services/upload.service.ts   # ลอจิกบันทึกไฟล์/ตั้งชื่อ/คืน URL
  services/event-bus.service.ts# ส่ง log ไป Redis (ตัวเลือก)
  workers/retention.worker.ts  # worker จัดการ retention
  server.ts                    # bootstrap Fastify และลงทะเบียนปลั๊กอิน/เส้นทาง
```

## การตั้งค่า (Environment)
คัดลอกไฟล์ตัวอย่างแล้วปรับค่าตามต้องการ:
```
copy env.example .env
```
ตัวแปรสำคัญใน `.env`:
- Service
  - `PORT=6402`
  - `MAX_FILE_SIZE_BYTES=52428800`
  - `ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/tiff`
  - `DISABLE_AUTH=true` (ค่าปริยาย: ไม่ตรวจซ้ำ เพราะ Gateway ตรวจ JWT ให้แล้ว)
- Storage (local filesystem)
  - `FILE_STORAGE_BASE_PATH=../../shared-storage`
  - `FILE_STORAGE_RAW_IMAGES_PATH=../../shared-storage/raw-images`
  - `FILE_STORAGE_ANNOTATED_IMAGES_PATH=../../shared-storage/annotated-images`
  - `FILE_STORAGE_TEMP_FILES_PATH=../../shared-storage/temp-files`
  - `FILE_STORAGE_BACKUP_PATH=../../shared-storage/backup-images`
  - `FILE_BASE_URL=http://localhost:6400/files`
  - `FILE_RAW_IMAGES_URL=http://localhost:6400/files/raw-images`
  - `FILE_ANNOTATED_IMAGES_URL=http://localhost:6400/files/annotated-images`
- Retention worker
  - `RETENTION_MOVE_DAYS=30`
  - `RETENTION_DELETE_DAYS=90`
  - `RETENTION_CHECK_INTERVAL_MS=3600000`
- Redis (ตัวเลือก)
  - `REDIS_URL=redis://redis:6379`
  - `REDIS_LOG_CHANNEL=microplate:image-ingestion:logs`
  - `REDIS_ERROR_CHANNEL=microplate:image-ingestion:errors`

หมายเหตุ: โฟลเดอร์ที่จำเป็นจะถูกสร้างอัตโนมัติเมื่อ service/worker เริ่มทำงาน

## การติดตั้งและรัน (โหมดพัฒนา)
```
# ภายในโฟลเดอร์บริการนี้
npm install
npm run dev       # start API ที่พอร์ต 6402
# (ตัวเลือก) รัน worker เฝ้าระบบ retention
npm run worker:dev
```

## การรันด้วย Docker
บริการนี้มี Dockerfile ให้แล้ว และรวมใน `docker-compose.apps.yml` (service: `image-ingesion`)
```
docker compose -f microplate-be/docker-compose.apps.yml build image-ingesion
docker compose -f microplate-be/docker-compose.apps.yml up image-ingesion
```

## เอ็นด์พอยน์ต์
- `GET /healthz` → สถานะสุขภาพ
- `GET /readyz` → ความพร้อมใช้งาน (ตรวจสร้างโฟลเดอร์)
- `POST /api/v1/images` → อัปโหลดไฟล์ภาพ (multipart)
  - ฟิลด์ที่รองรับ:
    - `sample_no` (จำเป็น)
    - `run_id` (ไม่จำเป็น)
    - `file_type` = `raw` | `annotated` | `thumbnail` (ค่าเริ่มต้น `raw`)
    - `file` = ไฟล์รูปภาพ (JPEG/PNG/WebP/TIFF)
    - `description` (ไม่จำเป็น)
  - ตัวอย่าง curl:
```
curl -X POST http://localhost:6402/api/v1/images \
  -F "sample_no=S123456" \
  -F "file_type=raw" \
  -F "file=@/path/to/image.jpg"
```
ผลลัพธ์ตัวอย่าง:
```
{
  "success": true,
  "data": {
    "sampleNo": "S123456",
    "runId": 789,
    "fileType": "annotated",
    "fileName": "S123456_20240115_103000_uuid.jpg",
    "filePath": "S123456/789/S123456_20240115_103000_uuid.jpg",
    "fileSize": 2048576,
    "mimeType": "image/jpeg",
    "bucketName": "annotated-images",
    "objectKey": "S123456/789/S123456_20240115_103000_uuid.jpg",
    "signedUrl": "http://localhost:6400/files/annotated-images/S123456/789/...",
    "urlExpiresAt": null,
    "description": ""
  }
}
```

## Logging ผ่าน Redis (ตัวเลือก)
- progress_log: เหตุการณ์ทั่วไป เช่น `image_uploaded`, `retention_started`, `retention_moved`, `retention_deleted`
- error_log: เหตุการณ์ผิดพลาด เช่น `retention_move_error`, `retention_delete_error`
- เผยแพร่ผ่าน Redis Pub/Sub ไปยังช่อง:
  - `REDIS_LOG_CHANNEL` (progress)
  - `REDIS_ERROR_CHANNEL` (error)

แนะนำให้ FE ดึงผ่าน Gateway (WebSocket/SSE) เพื่อควบคุมสิทธิ์และการกรองข้อมูล แทนการต่อ Redis ตรง

## ความปลอดภัย
- ใน production แนะนำให้เข้าถึงบริการนี้ผ่าน Gateway เท่านั้น
- ตั้ง `DISABLE_AUTH=true` (ค่าเริ่มต้น) เพื่อปิดการตรวจสิทธิ์ซ้ำในบริการนี้ เพราะ Gateway ตรวจ JWT ให้แล้ว
- จำกัดขนาดไฟล์/ชนิดไฟล์ผ่าน ENV

## โครงสร้าง Shared Storage (ย่อ)
```
shared-storage/
  raw-images/
    {sample_no}/[{run_id}/]{timestamp_uuid}.{ext}
  annotated-images/
    {sample_no}/[{run_id}/]{timestamp_uuid}.{ext}
  backup-images/
    raw-images/... (โครงสร้างเหมือนต้นทาง)
    annotated-images/...
  temp-files/
```

## การทดสอบด่วน
```
# Health
curl http://localhost:6402/healthz
# Ready
curl http://localhost:6402/readyz
# Upload
curl -X POST http://localhost:6402/api/v1/images \
  -F "sample_no=S123456" \
  -F "file_type=raw" \
  -F "file=@/path/to/image.jpg"
```

## Troubleshooting
- 415/400 Unsupported mime type → ตรวจ `ALLOWED_MIME_TYPES` และ content-type ของไฟล์
- 400 sample_no is required → ต้องส่ง `sample_no`
- 500 multipart already present → อย่าลงทะเบียน `@fastify/multipart` ซ้ำทั้งใน `server.ts` และ `routes`
- Container เริ่มไม่ขึ้น (ESM/CJS) → ปัจจุบันคอมไพล์เป็น CommonJS (`tsconfig.json: module=CommonJS`, `package.json: type=commonjs`)

---
หากต้องการเพิ่ม GET endpoints (เช่น list by sample/run) หรือเชื่อมต่อฐานข้อมูลเพื่อเก็บเมทาดาทา แจ้งได้ครับ
