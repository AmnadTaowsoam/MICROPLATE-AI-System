"""
Pydantic models for Vision Capture Service
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class CaptureRequest(BaseModel):
    """Request model for image capture"""
    sample_no: str = Field(..., description="Sample number")
    submission_no: Optional[str] = Field(None, description="Submission number")
    description: Optional[str] = Field("Captured image", description="Image description")
    quality: Optional[int] = Field(95, ge=1, le=100, description="Image quality (1-100)")


class CaptureResponse(BaseModel):
    """Response model for image capture"""
    success: bool = Field(..., description="Capture success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Capture data")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")


class ImageData(BaseModel):
    """Image data model"""
    filename: str = Field(..., description="Image filename")
    file_path: str = Field(..., description="Image file path")
    file_size: int = Field(..., description="Image file size in bytes")
    width: int = Field(..., description="Image width in pixels")
    height: int = Field(..., description="Image height in pixels")
    format: str = Field(..., description="Image format")
    captured_at: datetime = Field(default_factory=datetime.now, description="Capture timestamp")


class CameraStatus(BaseModel):
    """Camera status model"""
    is_connected: bool = Field(..., description="Camera connection status")
    is_capturing: bool = Field(..., description="Capture in progress status")
    device_id: Optional[int] = Field(None, description="Camera device ID")
    resolution: Optional[str] = Field(None, description="Camera resolution")
    fps: Optional[int] = Field(None, description="Camera FPS")
    last_capture: Optional[datetime] = Field(None, description="Last capture timestamp")
    error_message: Optional[str] = Field(None, description="Error message if any")


class CaptureProgress(BaseModel):
    """Capture progress model"""
    stage: str = Field(..., description="Current capture stage")
    progress: int = Field(..., ge=0, le=100, description="Progress percentage")
    message: str = Field(..., description="Progress message")
    timestamp: datetime = Field(default_factory=datetime.now, description="Progress timestamp")


class ServiceStatus(BaseModel):
    """Service status model"""
    service_name: str = Field("Vision Capture Service", description="Service name")
    version: str = Field("1.0.0", description="Service version")
    status: str = Field(..., description="Service status")
    uptime: Optional[float] = Field(None, description="Service uptime in seconds")
    camera_status: CameraStatus = Field(..., description="Camera status")
    websocket_connections: int = Field(0, description="Active WebSocket connections")
    last_health_check: datetime = Field(default_factory=datetime.now, description="Last health check")


class HealthResponse(BaseModel):
    """Health check response model"""
    success: bool = Field(True, description="Health check success")
    status: str = Field("healthy", description="Service status")
    timestamp: datetime = Field(default_factory=datetime.now, description="Health check timestamp")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional health details")


class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = Field(False, description="Request success status")
    error: Dict[str, str] = Field(..., description="Error details")
    timestamp: datetime = Field(default_factory=datetime.now, description="Error timestamp")


class WebSocketMessage(BaseModel):
    """WebSocket message model"""
    type: str = Field(..., description="Message type")
    data: Optional[Dict[str, Any]] = Field(None, description="Message data")
    message: Optional[str] = Field(None, description="Message text")
    timestamp: datetime = Field(default_factory=datetime.now, description="Message timestamp")


class ConnectionInfo(BaseModel):
    """WebSocket connection info model"""
    connected_at: datetime = Field(..., description="Connection timestamp")
    client_info: Dict[str, Any] = Field(default_factory=dict, description="Client information")
    last_heartbeat: datetime = Field(..., description="Last heartbeat timestamp")


class CaptureStats(BaseModel):
    """Capture statistics model"""
    total_captures: int = Field(0, description="Total number of captures")
    successful_captures: int = Field(0, description="Successful captures")
    failed_captures: int = Field(0, description="Failed captures")
    average_capture_time: Optional[float] = Field(None, description="Average capture time in seconds")
    last_capture_time: Optional[datetime] = Field(None, description="Last capture timestamp")
    storage_used: int = Field(0, description="Storage used in bytes")
