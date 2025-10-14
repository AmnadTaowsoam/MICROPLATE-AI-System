from pypylon import pylon
import cv2
import numpy as np

SERIAL = "23522377"  # ปรับตามกล้องของคุณ

# ค้นหาและเปิดกล้องโดย Serial
tl_factory = pylon.TlFactory.GetInstance()
devices = tl_factory.EnumerateDevices()
cam_info = next((d for d in devices if d.GetSerialNumber() == SERIAL), None)
if cam_info is None:
    raise RuntimeError("ไม่พบกล้อง Basler ตาม Serial")

camera = pylon.InstantCamera(tl_factory.CreateDevice(cam_info))
camera.Open()

# ตั้งค่าพื้นฐาน
from pypylon import genicam
nodemap = camera.GetNodeMap()

# Exposure/Gain (ถ้ารองรับ)
try:
    exposure = genicam.CFloatPtr(nodemap.GetNode("ExposureTime"))
    if genicam.IsWritable(exposure):
        exposure.SetValue(20000.0)
except Exception:
    pass

try:
    gain = genicam.CFloatPtr(nodemap.GetNode("Gain"))
    if genicam.IsWritable(gain):
        gain.SetValue(0.0)
except Exception:
    pass

# Packet size (GigE เท่านั้น)
try:
    packet = genicam.CIntegerPtr(nodemap.GetNode("GevSCPSPacketSize"))
    if genicam.IsWritable(packet):
        packet.SetValue(8192)
except Exception:
    pass

# เริ่มจับภาพ
converter = pylon.ImageFormatConverter()
converter.OutputPixelFormat = pylon.PixelType_BGR8packed
converter.OutputBitAlignment = pylon.OutputBitAlignment_MsbAligned

grab = camera.GrabOne(5000)
if not grab.GrabSucceeded():
    camera.Close()
    raise RuntimeError("Grab ไม่สำเร็จ")

img = converter.Convert(grab)
frame = img.GetArray()  # numpy array (BGR)
cv2.imwrite("test_basler.jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
camera.Close()
print("บันทึก test_basler.jpg สำเร็จ")