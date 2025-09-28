"""
Camera Service for handling camera operations
"""

import asyncio
import logging
import os
import time
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.core.config import settings
from app.models.schemas import CameraStatus, ImageData, CaptureProgress

logger = logging.getLogger(__name__)


class CameraService:
    """Service for camera operations and image capture"""
    
    def __init__(self):
        self.camera = None
        self.is_initialized = False
        self.is_capturing = False
        self.device_id = settings.CAMERA_DEVICE_ID
        self.width = settings.CAMERA_WIDTH
        self.height = settings.CAMERA_HEIGHT
        self.fps = settings.CAMERA_FPS
        self.last_capture_time: Optional[datetime] = None
        self.capture_dir = Path(settings.CAPTURE_DIR)
        self._capture_stats = {
            "total_captures": 0,
            "successful_captures": 0,
            "failed_captures": 0,
            "capture_times": []
        }
        
        # Ensure capture directory exists
        self.capture_dir.mkdir(parents=True, exist_ok=True)
    
    async def initialize(self) -> bool:
        """
        Initialize camera connection
        
        Returns:
            bool: True if initialization successful
        """
        try:
            logger.info(f"Initializing camera with device ID: {self.device_id}")
            
            # Initialize OpenCV camera
            self.camera = cv2.VideoCapture(self.device_id or 0)
            
            if not self.camera.isOpened():
                logger.error("Failed to open camera")
                return False
            
            # Set camera properties
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            self.camera.set(cv2.CAP_PROP_FPS, self.fps)
            
            # Verify camera settings
            actual_width = int(self.camera.get(cv2.CAP_PROP_FRAME_WIDTH))
            actual_height = int(self.camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
            actual_fps = int(self.camera.get(cv2.CAP_PROP_FPS))
            
            logger.info(f"Camera initialized successfully:")
            logger.info(f"  Resolution: {actual_width}x{actual_height}")
            logger.info(f"  FPS: {actual_fps}")
            
            self.is_initialized = True
            return True
            
        except Exception as e:
            logger.error(f"Camera initialization failed: {e}")
            self.is_initialized = False
            return False
    
    async def get_status(self) -> CameraStatus:
        """
        Get current camera status
        
        Returns:
            CameraStatus: Current camera status
        """
        try:
            is_connected = self.is_initialized and self.camera is not None and self.camera.isOpened()
            
            if is_connected:
                actual_width = int(self.camera.get(cv2.CAP_PROP_FRAME_WIDTH))
                actual_height = int(self.camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
                actual_fps = int(self.camera.get(cv2.CAP_PROP_FPS))
                resolution = f"{actual_width}x{actual_height}"
            else:
                resolution = None
                actual_fps = None
            
            return CameraStatus(
                is_connected=is_connected,
                is_capturing=self.is_capturing,
                device_id=self.device_id,
                resolution=resolution,
                fps=actual_fps,
                last_capture=self.last_capture_time,
                error_message=None
            )
            
        except Exception as e:
            logger.error(f"Failed to get camera status: {e}")
            return CameraStatus(
                is_connected=False,
                is_capturing=False,
                device_id=self.device_id,
                resolution=None,
                fps=None,
                last_capture=self.last_capture_time,
                error_message=str(e)
            )
    
    async def capture_image(
        self, 
        sample_no: str, 
        submission_no: Optional[str] = None,
        description: str = "Captured image",
        quality: int = 95
    ) -> Tuple[bool, Optional[ImageData], Optional[str]]:
        """
        Capture image from camera
        
        Args:
            sample_no: Sample number
            submission_no: Submission number
            description: Image description
            quality: JPEG quality (1-100)
            
        Returns:
            Tuple of (success, image_data, error_message)
        """
        if not self.is_initialized or self.camera is None:
            return False, None, "Camera not initialized"
        
        if self.is_capturing:
            return False, None, "Capture already in progress"
        
        self.is_capturing = True
        start_time = time.time()
        
        try:
            logger.info(f"Starting image capture for sample: {sample_no}")
            
            # Capture frame
            ret, frame = self.camera.read()
            
            if not ret:
                self.is_capturing = False
                return False, None, "Failed to capture frame from camera"
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"capture_{sample_no}_{timestamp}.jpg"
            
            if submission_no:
                filename = f"capture_{sample_no}_{submission_no}_{timestamp}.jpg"
            
            file_path = self.capture_dir / filename
            
            # Save image
            success = cv2.imwrite(str(file_path), frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
            
            if not success:
                self.is_capturing = False
                return False, None, "Failed to save image"
            
            # Get image properties
            height, width = frame.shape[:2]
            file_size = file_path.stat().st_size
            
            # Create image data
            image_data = ImageData(
                filename=filename,
                file_path=str(file_path),
                file_size=file_size,
                width=width,
                height=height,
                format="JPEG",
                captured_at=datetime.now()
            )
            
            # Update stats
            capture_time = time.time() - start_time
            self._capture_stats["total_captures"] += 1
            self._capture_stats["successful_captures"] += 1
            self._capture_stats["capture_times"].append(capture_time)
            
            # Keep only last 100 capture times for average calculation
            if len(self._capture_stats["capture_times"]) > 100:
                self._capture_stats["capture_times"] = self._capture_stats["capture_times"][-100:]
            
            self.last_capture_time = datetime.now()
            
            logger.info(f"Image captured successfully: {filename} ({file_size} bytes)")
            
            return True, image_data, None
            
        except Exception as e:
            logger.error(f"Image capture failed: {e}")
            self._capture_stats["failed_captures"] += 1
            return False, None, str(e)
        
        finally:
            self.is_capturing = False
    
    async def test_camera(self) -> Tuple[bool, Optional[str]]:
        """
        Test camera functionality
        
        Returns:
            Tuple of (success, error_message)
        """
        try:
            if not self.is_initialized or self.camera is None:
                return False, "Camera not initialized"
            
            # Try to read a frame
            ret, frame = self.camera.read()
            
            if not ret:
                return False, "Failed to read frame from camera"
            
            # Check if frame is valid
            if frame is None or frame.size == 0:
                return False, "Invalid frame received from camera"
            
            return True, None
            
        except Exception as e:
            logger.error(f"Camera test failed: {e}")
            return False, str(e)
    
    async def get_capture_stats(self) -> Dict[str, Any]:
        """
        Get capture statistics
        
        Returns:
            Dict containing capture statistics
        """
        stats = self._capture_stats.copy()
        
        # Calculate average capture time
        if stats["capture_times"]:
            stats["average_capture_time"] = sum(stats["capture_times"]) / len(stats["capture_times"])
        else:
            stats["average_capture_time"] = None
        
        # Calculate storage used
        storage_used = 0
        for file_path in self.capture_dir.glob("*.jpg"):
            storage_used += file_path.stat().st_size
        
        stats["storage_used"] = storage_used
        stats["last_capture_time"] = self.last_capture_time
        
        return stats
    
    async def cleanup_captures(self, max_age_hours: int = None) -> int:
        """
        Clean up old capture files
        
        Args:
            max_age_hours: Maximum age of files in hours
            
        Returns:
            Number of files deleted
        """
        if max_age_hours is None:
            max_age_hours = settings.MAX_CAPTURE_AGE_HOURS
        
        deleted_count = 0
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        
        try:
            for file_path in self.capture_dir.glob("*.jpg"):
                if file_path.stat().st_mtime < cutoff_time:
                    file_path.unlink()
                    deleted_count += 1
            
            logger.info(f"Cleaned up {deleted_count} old capture files")
            
        except Exception as e:
            logger.error(f"Failed to cleanup captures: {e}")
        
        return deleted_count
    
    async def cleanup(self):
        """Cleanup camera resources"""
        try:
            if self.camera is not None:
                self.camera.release()
                self.camera = None
            
            self.is_initialized = False
            self.is_capturing = False
            
            logger.info("Camera service cleaned up")
            
        except Exception as e:
            logger.error(f"Camera cleanup error: {e}")
    
    def get_device_info(self) -> Dict[str, Any]:
        """Get camera device information"""
        return {
            "device_id": self.device_id,
            "configured_resolution": f"{self.width}x{self.height}",
            "configured_fps": self.fps,
            "is_initialized": self.is_initialized,
            "is_capturing": self.is_capturing
        }
