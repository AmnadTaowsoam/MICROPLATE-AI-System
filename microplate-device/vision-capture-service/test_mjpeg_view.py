# test_mjpeg_view.py
import os
import requests
import cv2
import numpy as np
from datetime import datetime, timedelta
try:
    from jwt import encode as jwt_encode
except Exception as e:
    raise RuntimeError(
        "ไม่พบฟังก์ชัน encode จาก PyJWT: โปรดรัน 'pip uninstall -y jwt' แล้ว 'pip install PyJWT==2.8.0'"
    )
try:
    from dotenv import load_dotenv
    # โหลด .env ที่อยู่ในไดเรกทอรีเดียวกับสคริปต์
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
except Exception:
    # ถ้าไม่มี python-dotenv จะข้ามได้ แต่แนะนำติดตั้งเพื่อความสะดวก
    pass

STREAM_URL = os.getenv("STREAM_URL", "http://localhost:6407/api/v1/stream/mjpeg")

# ตัวเลือกที่ 1: ใช้ JWT_TOKEN โดยตรงถ้าถูกตั้งค่า
TOKEN = os.getenv("JWT_TOKEN", "")

# ตัวเลือกที่ 2: ถ้าไม่มี JWT_TOKEN ให้สร้างโทเค็นจาก JWT_SECRET (+ ออปชัน JWT_ALGORITHM, JWT_ISSUER, JWT_AUDIENCE)
if not TOKEN:
    JWT_SECRET = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ISSUER = os.getenv("JWT_ISSUER")
    JWT_AUDIENCE = os.getenv("JWT_AUDIENCE")

    if JWT_SECRET:
        now = datetime.utcnow()
        payload = {
            "sub": "stream-client",
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        if JWT_ISSUER:
            payload["iss"] = JWT_ISSUER
        if JWT_AUDIENCE:
            payload["aud"] = JWT_AUDIENCE

        TOKEN = jwt_encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

if TOKEN and not TOKEN.isascii():
    raise ValueError("JWT_TOKEN ต้องเป็นอักขระ ASCII เท่านั้น (อย่าใช้ข้อความภาษาไทยเป็นค่าเริ่มต้น)")

headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}

def main():
    if not TOKEN:
        print("[คำแนะนำ] โปรดตั้งค่า JWT_TOKEN ก่อนรัน: set JWT_TOKEN=eyJ... หรือ export JWT_TOKEN=eyJ...")
    with requests.get(STREAM_URL, headers=headers, stream=True, timeout=10) as r:
        r.raise_for_status()
        buffer = b""
        for chunk in r.iter_content(chunk_size=2048):
            if not chunk:
                continue
            buffer += chunk
            # หา JPEG SOI/EOI เพื่อแยกเฟรมจากสตรีม
            start = buffer.find(b"\xff\xd8")  # SOI
            end = buffer.find(b"\xff\xd9")    # EOI
            if start != -1 and end != -1 and end > start:
                jpg = buffer[start:end+2]
                buffer = buffer[end+2:]
                frame = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                if frame is None:
                    continue
                cv2.imshow("MJPEG Stream (press q to quit)", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()