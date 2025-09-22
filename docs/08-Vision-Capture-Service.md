# Vision Capture Service - Complete Specification

## Overview

The Vision Capture Service handles camera control and image capture for the Microplate AI System. It provides camera management, image capture, live preview, and camera settings control.

## Technology Stack

- **Runtime**: Python 3.11+
- **Framework**: FastAPI
- **Computer Vision**: OpenCV, PIL
- **Camera Control**: pycamera2, v4l2 (Linux), DirectShow (Windows)
- **Image Processing**: numpy, scikit-image
- **HTTP Client**: httpx
- **Validation**: Pydantic
- **Documentation**: OpenAPI 3.0

## Service Architecture

```python
# Project structure
vision-capture-service/
├── src/
│   ├── config/
│   │   ├── camera.py
│   │   ├── settings.py
│   │   └── image.py
│   ├── controllers/
│   │   └── capture_controller.py
│   ├── services/
│   │   ├── camera_service.py
│   │   ├── capture_service.py
│   │   ├── image_service.py
│   │   └── preview_service.py
│   ├── hardware/
│   │   ├── camera_manager.py
│   │   ├── usb_camera.py
│   │   ├── csi_camera.py
│   │   └── camera_factory.py
│   ├── utils/
│   │   ├── image_utils.py
│   │   ├── camera_utils.py
│   │   └── validation_utils.py
│   ├── schemas/
│   │   └── capture_schemas.py
│   ├── types/
│   │   └── capture_types.py
│   └── main.py
├── tests/
├── requirements.txt
├── Dockerfile
└── .env.example
```

## API Endpoints

### Capture Endpoints

#### POST /api/v1/capture
Capture an image from the camera.

**Request Body:**
```json
{
  "sample_no": "S123456",
  "submission_no": "SUB789",
  "camera_id": 0,
  "settings": {
    "resolution": "1920x1080",
    "brightness": 50,
    "contrast": 50,
    "exposure": "auto",
    "white_balance": "auto",
    "focus": "auto"
  },
  "options": {
    "save_metadata": true,
    "generate_thumbnail": true,
    "image_format": "jpg",
    "quality": 95
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "capture_id": "uuid",
    "sample_no": "S123456",
    "submission_no": "SUB789",
    "image_path": "/tmp/captures/S123456_20240115_103000.jpg",
    "image_url": "https://storage.example.com/captures/S123456_20240115_103000.jpg",
    "thumbnail_path": "/tmp/captures/S123456_20240115_103000_thumb.jpg",
    "thumbnail_url": "https://storage.example.com/captures/S123456_20240115_103000_thumb.jpg",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "JPEG",
      "file_size": 2048576,
      "camera_settings": {
        "brightness": 50,
        "contrast": 50,
        "exposure": "auto",
        "white_balance": "auto"
      },
      "capture_time": "2024-01-15T10:30:00Z"
    },
    "captured_at": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/v1/capture/preview
Get live preview stream from the camera.

**Query Parameters:**
- `camera_id`: Camera ID (default: 0)
- `resolution`: Preview resolution (default: 640x480)
- `quality`: JPEG quality (default: 80)

**Response:**
```
Content-Type: multipart/x-mixed-replace; boundary=frame

--frame
Content-Type: image/jpeg

[Binary JPEG data]
--frame
Content-Type: image/jpeg

[Binary JPEG data]
...
```

#### GET /api/v1/capture/cameras
Get list of available cameras.

**Response:**
```json
{
  "success": true,
  "data": {
    "cameras": [
      {
        "camera_id": 0,
        "name": "USB Camera",
        "type": "usb",
        "resolution": "1920x1080",
        "supported_formats": ["MJPG", "YUYV"],
        "is_available": true,
        "current_settings": {
          "brightness": 50,
          "contrast": 50,
          "exposure": "auto",
          "white_balance": "auto"
        }
      }
    ],
    "default_camera": 0
  }
}
```

#### PUT /api/v1/capture/cameras/:cameraId/settings
Update camera settings.

**Request Body:**
```json
{
  "brightness": 60,
  "contrast": 55,
  "exposure": "manual",
  "exposure_value": 100,
  "white_balance": "manual",
  "white_balance_temperature": 5000,
  "focus": "manual",
  "focus_distance": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "camera_id": 0,
    "settings": {
      "brightness": 60,
      "contrast": 55,
      "exposure": "manual",
      "exposure_value": 100,
      "white_balance": "manual",
      "white_balance_temperature": 5000,
      "focus": "manual",
      "focus_distance": 50
    },
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/v1/capture/cameras/:cameraId/settings
Get current camera settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "camera_id": 0,
    "settings": {
      "brightness": 60,
      "contrast": 55,
      "exposure": "manual",
      "exposure_value": 100,
      "white_balance": "manual",
      "white_balance_temperature": 5000,
      "focus": "manual",
      "focus_distance": 50
    },
    "supported_ranges": {
      "brightness": {"min": 0, "max": 100, "step": 1},
      "contrast": {"min": 0, "max": 100, "step": 1},
      "exposure_value": {"min": 1, "max": 1000, "step": 1},
      "white_balance_temperature": {"min": 2000, "max": 8000, "step": 100},
      "focus_distance": {"min": 0, "max": 100, "step": 1}
    }
  }
}
```

### Image Management Endpoints

#### GET /api/v1/capture/images/:captureId
Get captured image information.

**Response:**
```json
{
  "success": true,
  "data": {
    "capture_id": "uuid",
    "sample_no": "S123456",
    "image_path": "/tmp/captures/S123456_20240115_103000.jpg",
    "image_url": "https://storage.example.com/captures/S123456_20240115_103000.jpg",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "JPEG",
      "file_size": 2048576,
      "capture_time": "2024-01-15T10:30:00Z"
    },
    "captured_at": "2024-01-15T10:30:00Z"
  }
}
```

#### DELETE /api/v1/capture/images/:captureId
Delete captured image.

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

## Implementation Details

### Camera Service
```python
class CameraService:
    def __init__(self):
        self.cameras: Dict[int, Camera] = {}
        self.camera_manager = CameraManager()
    
    async def initialize_cameras(self) -> None:
        """Initialize all available cameras"""
        available_cameras = await self.camera_manager.discover_cameras()
        
        for camera_info in available_cameras:
            camera = await self.create_camera(camera_info)
            self.cameras[camera_info.id] = camera
    
    async def create_camera(self, camera_info: CameraInfo) -> Camera:
        """Create camera instance based on type"""
        if camera_info.type == "usb":
            return USBCamera(camera_info)
        elif camera_info.type == "csi":
            return CSICamera(camera_info)
        else:
            raise ValueError(f"Unsupported camera type: {camera_info.type}")
    
    async def get_camera(self, camera_id: int) -> Camera:
        """Get camera by ID"""
        if camera_id not in self.cameras:
            raise CameraNotFoundError(f"Camera {camera_id} not found")
        return self.cameras[camera_id]
    
    async def capture_image(
        self,
        camera_id: int,
        sample_no: str,
        settings: CameraSettings
    ) -> CaptureResult:
        """Capture image from specified camera"""
        camera = await self.get_camera(camera_id)
        
        # Apply settings
        await camera.apply_settings(settings)
        
        # Capture image
        image = await camera.capture()
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{sample_no}_{timestamp}.jpg"
        
        # Save image
        image_path = await self.save_image(image, filename)
        
        # Generate thumbnail
        thumbnail_path = await self.generate_thumbnail(image, filename)
        
        # Create metadata
        metadata = self.create_metadata(image, settings)
        
        return CaptureResult(
            capture_id=str(uuid.uuid4()),
            sample_no=sample_no,
            image_path=image_path,
            thumbnail_path=thumbnail_path,
            metadata=metadata,
            captured_at=datetime.now()
        )
```

### Camera Manager
```python
class CameraManager:
    def __init__(self):
        self.platform = platform.system().lower()
    
    async def discover_cameras(self) -> List[CameraInfo]:
        """Discover available cameras"""
        cameras = []
        
        if self.platform == "linux":
            cameras = await self.discover_linux_cameras()
        elif self.platform == "windows":
            cameras = await self.discover_windows_cameras()
        elif self.platform == "darwin":
            cameras = await self.discover_macos_cameras()
        
        return cameras
    
    async def discover_linux_cameras(self) -> List[CameraInfo]:
        """Discover cameras on Linux using v4l2"""
        cameras = []
        
        # Check /dev/video* devices
        for i in range(10):  # Check first 10 video devices
            device_path = f"/dev/video{i}"
            if os.path.exists(device_path):
                try:
                    cap = cv2.VideoCapture(i)
                    if cap.isOpened():
                        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                        
                        cameras.append(CameraInfo(
                            id=i,
                            name=f"Camera {i}",
                            type="usb",
                            device_path=device_path,
                            resolution=f"{width}x{height}",
                            supported_formats=["MJPG", "YUYV"],
                            is_available=True
                        ))
                        cap.release()
                except Exception as e:
                    logger.warning(f"Failed to open camera {i}: {e}")
        
        return cameras
    
    async def discover_windows_cameras(self) -> List[CameraInfo]:
        """Discover cameras on Windows using DirectShow"""
        cameras = []
        
        # Use OpenCV to enumerate cameras
        for i in range(10):
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
            if cap.isOpened():
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                
                cameras.append(CameraInfo(
                    id=i,
                    name=f"Camera {i}",
                    type="usb",
                    device_path=f"camera_{i}",
                    resolution=f"{width}x{height}",
                    supported_formats=["MJPG", "YUYV"],
                    is_available=True
                ))
                cap.release()
        
        return cameras
```

### USB Camera Implementation
```python
class USBCamera(Camera):
    def __init__(self, camera_info: CameraInfo):
        self.camera_info = camera_info
        self.cap = None
        self.settings = CameraSettings()
    
    async def initialize(self) -> None:
        """Initialize camera"""
        self.cap = cv2.VideoCapture(self.camera_info.id)
        if not self.cap.isOpened():
            raise CameraError(f"Failed to open camera {self.camera_info.id}")
    
    async def capture(self) -> np.ndarray:
        """Capture image from camera"""
        if not self.cap or not self.cap.isOpened():
            await self.initialize()
        
        ret, frame = self.cap.read()
        if not ret:
            raise CameraError("Failed to capture image")
        
        return frame
    
    async def apply_settings(self, settings: CameraSettings) -> None:
        """Apply camera settings"""
        if not self.cap:
            await self.initialize()
        
        # Apply brightness
        if settings.brightness is not None:
            self.cap.set(cv2.CAP_PROP_BRIGHTNESS, settings.brightness)
        
        # Apply contrast
        if settings.contrast is not None:
            self.cap.set(cv2.CAP_PROP_CONTRAST, settings.contrast)
        
        # Apply exposure
        if settings.exposure == "manual" and settings.exposure_value is not None:
            self.cap.set(cv2.CAP_PROP_EXPOSURE, settings.exposure_value)
        elif settings.exposure == "auto":
            self.cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 1)
        
        # Apply white balance
        if settings.white_balance == "manual" and settings.white_balance_temperature is not None:
            self.cap.set(cv2.CAP_PROP_WB_TEMPERATURE, settings.white_balance_temperature)
        elif settings.white_balance == "auto":
            self.cap.set(cv2.CAP_PROP_AUTO_WB, 1)
        
        # Apply focus
        if settings.focus == "manual" and settings.focus_distance is not None:
            self.cap.set(cv2.CAP_PROP_FOCUS, settings.focus_distance)
        elif settings.focus == "auto":
            self.cap.set(cv2.CAP_PROP_AUTOFOCUS, 1)
        
        self.settings = settings
    
    async def get_current_settings(self) -> CameraSettings:
        """Get current camera settings"""
        if not self.cap:
            await self.initialize()
        
        return CameraSettings(
            brightness=int(self.cap.get(cv2.CAP_PROP_BRIGHTNESS)),
            contrast=int(self.cap.get(cv2.CAP_PROP_CONTRAST)),
            exposure="auto" if self.cap.get(cv2.CAP_PROP_AUTO_EXPOSURE) else "manual",
            exposure_value=int(self.cap.get(cv2.CAP_PROP_EXPOSURE)),
            white_balance="auto" if self.cap.get(cv2.CAP_PROP_AUTO_WB) else "manual",
            white_balance_temperature=int(self.cap.get(cv2.CAP_PROP_WB_TEMPERATURE)),
            focus="auto" if self.cap.get(cv2.CAP_PROP_AUTOFOCUS) else "manual",
            focus_distance=int(self.cap.get(cv2.CAP_PROP_FOCUS))
        )
    
    async def start_preview(self) -> None:
        """Start live preview"""
        if not self.cap:
            await self.initialize()
    
    async def stop_preview(self) -> None:
        """Stop live preview"""
        if self.cap:
            self.cap.release()
            self.cap = None
    
    async def close(self) -> None:
        """Close camera"""
        if self.cap:
            self.cap.release()
            self.cap = None
```

### Preview Service
```python
class PreviewService:
    def __init__(self, camera_service: CameraService):
        self.camera_service = camera_service
        self.active_previews: Dict[int, asyncio.Task] = {}
    
    async def start_preview(self, camera_id: int, resolution: str = "640x480") -> None:
        """Start live preview for camera"""
        if camera_id in self.active_previews:
            return  # Preview already active
        
        camera = await self.camera_service.get_camera(camera_id)
        task = asyncio.create_task(self._preview_loop(camera, resolution))
        self.active_previews[camera_id] = task
    
    async def stop_preview(self, camera_id: int) -> None:
        """Stop live preview for camera"""
        if camera_id in self.active_previews:
            self.active_previews[camera_id].cancel()
            del self.active_previews[camera_id]
    
    async def _preview_loop(self, camera: Camera, resolution: str) -> None:
        """Preview loop for live streaming"""
        width, height = map(int, resolution.split('x'))
        
        while True:
            try:
                # Capture frame
                frame = await camera.capture()
                
                # Resize frame
                frame = cv2.resize(frame, (width, height))
                
                # Encode as JPEG
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                
                # Yield frame (this would be used in the streaming endpoint)
                yield buffer.tobytes()
                
                await asyncio.sleep(0.033)  # ~30 FPS
                
            except Exception as e:
                logger.error(f"Preview error: {e}")
                break
```

## Environment Configuration

```bash
# Application
NODE_ENV="development"
PORT=6406
API_BASE_URL="http://localhost:6400"

# Camera Configuration
DEFAULT_CAMERA_ID=0
DEFAULT_RESOLUTION="1920x1080"
DEFAULT_QUALITY=95
SUPPORTED_FORMATS="jpg,jpeg,png"

# Image Storage
CAPTURE_DIRECTORY="/tmp/captures"
THUMBNAIL_DIRECTORY="/tmp/thumbnails"
MAX_FILE_SIZE="50MB"
IMAGE_RETENTION_HOURS=24

# Camera Settings
DEFAULT_BRIGHTNESS=50
DEFAULT_CONTRAST=50
DEFAULT_EXPOSURE="auto"
DEFAULT_WHITE_BALANCE="auto"
DEFAULT_FOCUS="auto"

# Preview Settings
PREVIEW_RESOLUTION="640x480"
PREVIEW_QUALITY=80
PREVIEW_FPS=30
MAX_PREVIEW_CONNECTIONS=5

# Hardware
ENABLE_GPU=false
GPU_DEVICE_ID=0
CAMERA_TIMEOUT=30
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "CAMERA_NOT_FOUND",
    "message": "Camera not found",
    "details": {
      "camera_id": 0
    },
    "requestId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
- `CAMERA_NOT_FOUND`: Camera not found
- `CAMERA_NOT_AVAILABLE`: Camera not available
- `CAPTURE_FAILED`: Image capture failed
- `SETTINGS_INVALID`: Invalid camera settings
- `PREVIEW_FAILED`: Preview stream failed
- `HARDWARE_ERROR`: Hardware error
- `PERMISSION_ERROR`: Insufficient permissions

## Performance Optimization

### Camera Management
- Camera pooling for multiple connections
- Asynchronous camera operations
- Settings caching
- Error recovery mechanisms

### Image Processing
- Efficient image encoding
- Memory management
- Thumbnail generation optimization
- Format conversion optimization

### Preview Streaming
- Efficient frame encoding
- Connection management
- Bandwidth optimization
- Error handling and recovery

## Monitoring and Metrics

### Key Metrics
- Capture success/failure rates
- Camera availability
- Preview connection count
- Image processing time
- Hardware utilization

### Health Checks
- `/healthz`: Basic health check
- `/readyz`: Readiness check (camera availability)
- `/metrics`: Prometheus metrics

### Logging
- Camera operations
- Capture events
- Error tracking
- Performance metrics
