"""
Configuration settings for Vision Capture Service
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 6407
    DEBUG: bool = False
    
    # JWT Configuration (should match auth-service access token config)
    # Defaults aligned with auth-service defaults
    JWT_SECRET: str = "your-super-secret-access-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "microplate-auth-service"
    JWT_AUDIENCE: str = "microplate-api"
    
    # Camera configuration
    CAMERA_DEVICE_ID: Optional[int] = None  # None for default camera
    CAMERA_WIDTH: int = 1920
    CAMERA_HEIGHT: int = 1080
    CAMERA_FPS: int = 30
    
    # Image capture settings
    CAPTURE_TIMEOUT: int = 30  # seconds
    IMAGE_QUALITY: int = 95  # JPEG quality (1-100)
    IMAGE_FORMAT: str = "JPEG"
    CAPTURE_RESIZE_WIDTH: Optional[int] = None
    CAPTURE_RESIZE_HEIGHT: Optional[int] = None
    CAPTURE_PERSIST_IMAGES: bool = True
    CAPTURE_IN_MEMORY_LIMIT: int = 10
    
    # File storage
    CAPTURE_DIR: str = "captures"
    MAX_CAPTURE_AGE_HOURS: int = 24  # Auto cleanup after 24 hours
    
    # Status monitoring
    STATUS_CHECK_INTERVAL: int = 5  # seconds
    CONNECTION_TIMEOUT: int = 10  # seconds
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json | pretty
    LOG_FILE: str = "logs/vision-capture.log"
    
    # WebSocket settings
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    WS_MAX_CONNECTIONS: int = 10

    # Basler Camera Configuration
    CAMERA_BACKEND: str = "opencv"
    BASLER_SERIAL: Optional[str] = None
    BASLER_IP: Optional[str] = None
    BASLER_PACKET_SIZE: Optional[int] = None
    BASLER_EXPOSURE_US: Optional[int] = None
    BASLER_GAIN: Optional[float] = None
    
    
# Create global settings instance
settings = Settings()
