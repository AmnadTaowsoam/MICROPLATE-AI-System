# MinIO Retention Worker

Worker สำหรับลบไฟล์เก่าใน MinIO ที่มีอายุเกิน 60 วัน (ตั้งค่าได้)

## คุณสมบัติ

- **อัตโนมัติ**: ตรวจสอบและลบไฟล์เก่าทุก 24 ชั่วโมง (ตั้งค่าได้)
- **ปลอดภัย**: รองรับ Dry Run mode สำหรับทดสอบ
- **ครบถ้วน**: ลบทั้งไฟล์ใน MinIO และข้อมูลในฐานข้อมูล
- **ติดตาม**: ส่ง log ไป Redis สำหรับ monitoring

## การตั้งค่า

### Environment Variables

```bash
# MinIO Retention Worker
MINIO_RETENTION_CHECK_INTERVAL_MS=86400000  # 24 hours (milliseconds)
MINIO_RETENTION_DELETE_DAYS=60              # ลบไฟล์ที่เก่ากว่า 60 วัน
MINIO_RETENTION_DRY_RUN=false               # true = ทดสอบ, false = ลบจริง
```

### การรัน

#### Development
```bash
npm run worker:retention:dev
```

#### Production
```bash
npm run worker:retention
```

#### Docker
```bash
# รัน worker แยกต่างหาก
docker-compose -f docker-compose.worker.yml up minio-retention-worker

# หรือรันพร้อมกับ service หลัก
docker-compose -f docker-compose.apps.yml up image-ingesion minio-retention-worker
```

## การทำงาน

1. **ตรวจสอบไฟล์**: ดูไฟล์ใน buckets `raw-images` และ `annotated-images`
2. **ตรวจสอบอายุ**: เปรียบเทียบ `LastModified` กับ threshold
3. **ลบไฟล์**: ลบไฟล์ใน MinIO และข้อมูลในฐานข้อมูล
4. **บันทึก log**: ส่ง log ไป Redis

## Dry Run Mode

ตั้งค่า `MINIO_RETENTION_DRY_RUN=true` เพื่อทดสอบ:

```bash
# ดูว่ามีไฟล์อะไรที่จะถูกลบ (ไม่ลบจริง)
MINIO_RETENTION_DRY_RUN=true npm run worker:retention:dev
```

## Monitoring

Worker ส่ง log events ไป Redis:

- `minio_retention_started` - เริ่มการทำงาน
- `minio_retention_deleted` - ลบไฟล์สำเร็จ
- `minio_retention_error` - เกิดข้อผิดพลาด
- `minio_retention_completed` - เสร็จสิ้นการทำงาน

## ตัวอย่าง Log

```
[minio-retention] MinIO retention worker started
[minio-retention] Settings: { checkIntervalMs: 86400000, deleteAfterDays: 60, dryRun: false }
[minio-retention] Starting retention check (delete files older than 60 days)
[minio-retention] Processing bucket: raw-images
[minio-retention] Deleted from MinIO: raw-images/SAMPLE001/123/image.jpg
[minio-retention] Deleted database record ID: 456
[minio-retention] Retention check completed. Deleted: 5, Errors: 0
```

## การแก้ไขปัญหา

### ไฟล์ไม่ถูกลบ
- ตรวจสอบ `MINIO_RETENTION_DELETE_DAYS`
- ตรวจสอบ `MINIO_RETENTION_DRY_RUN`
- ตรวจสอบ MinIO credentials

### Worker ไม่ทำงาน
- ตรวจสอบ database connection
- ตรวจสอบ MinIO connection
- ตรวจสอบ Redis connection

### ข้อผิดพลาด
- ดู log ใน Redis
- ตรวจสอบ permissions
- ตรวจสอบ disk space
