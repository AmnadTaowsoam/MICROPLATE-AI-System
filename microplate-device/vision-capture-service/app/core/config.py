"""
Configuration settings for Vision Capture Service
"""

import os
from typing import List, Optional
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 6407
    DEBUG: bool = False
    
    # CORS configuration
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:6410",
        "http://localhost:3000",
        "http://localhost:8080"
    ]
    
    # JWT Configuration
    JWT_SECRET: str = "your-jwt-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "microplate-auth"
    JWT_AUDIENCE: str = "microplate-services"
    
    # Camera configuration
    CAMERA_DEVICE_ID: Optional[int] = None  # None for default camera
    CAMERA_WIDTH: int = 1920
    CAMERA_HEIGHT: int = 1080
    CAMERA_FPS: int = 30
    
    # Image capture settings
    CAPTURE_TIMEOUT: int = 30  # seconds
    IMAGE_QUALITY: int = 95  # JPEG quality (1-100)
    IMAGE_FORMAT: str = "JPEG"
    
    # File storage
    CAPTURE_DIR: str = "captures"
    MAX_CAPTURE_AGE_HOURS: int = 24  # Auto cleanup after 24 hours
    
    # Status monitoring
    STATUS_CHECK_INTERVAL: int = 5  # seconds
    CONNECTION_TIMEOUT: int = 10  # seconds
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/vision-capture.log"
    
    # WebSocket settings
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    WS_MAX_CONNECTIONS: int = 10
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()
