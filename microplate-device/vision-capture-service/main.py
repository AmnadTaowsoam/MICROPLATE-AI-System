"""
Vision Capture Service - Main Application
Provides camera capture functionality with real-time status updates
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, Any

import uvicorn
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.auth import verify_token
from app.api.routes import capture
from app.api.routes import health
from app.api.routes import websocket
from app.api.routes import stream
from app.services.camera_service import CameraService
from app.services.status_service import StatusService
from app.core.websocket_manager import WebSocketManager

# Ensure log directory exists before configuring logging
log_file = getattr(settings, 'LOG_FILE', 'logs/vision-capture.log')
log_dir = os.path.dirname(log_file) or '.'
os.makedirs(log_dir, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Global services
camera_service: CameraService = None
status_service: StatusService = None
websocket_manager: WebSocketManager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global camera_service, status_service, websocket_manager
    
    logger.info("Starting Vision Capture Service...")
    
    try:
        # Initialize services
        camera_service = CameraService()
        status_service = StatusService()
        websocket_manager = WebSocketManager()
        
        # Initialize camera
        await camera_service.initialize()
        
        # Set up status monitoring
        asyncio.create_task(status_service.start_monitoring())
        
        logger.info("Vision Capture Service started successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Failed to start Vision Capture Service: {e}")
        raise
    finally:
        # Cleanup
        logger.info("Shutting down Vision Capture Service...")
        if camera_service:
            await camera_service.cleanup()
        if websocket_manager:
            await websocket_manager.cleanup()


# Create FastAPI app
app = FastAPI(
    title="Vision Capture Service",
    description="Camera capture service for HAllytics microplate analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(capture.router, prefix="/api/v1/capture", tags=["capture"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])
app.include_router(stream.router, prefix="/api/v1/stream", tags=["stream"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Vision Capture Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/api/v1/capture/health",
            "capture": "/api/v1/capture/image",
            "status": "/api/v1/capture/status",
            "websocket": "/ws/capture",
            "mjpeg": "/api/v1/stream/mjpeg"
        }
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred"
            }
        }
    )


# Dependency to get services
def get_camera_service() -> CameraService:
    """Get camera service instance"""
    if camera_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Camera service not initialized"
        )
    return camera_service


def get_status_service() -> StatusService:
    """Get status service instance"""
    if status_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Status service not initialized"
        )
    return status_service


def get_websocket_manager() -> WebSocketManager:
    """Get WebSocket manager instance"""
    if websocket_manager is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WebSocket manager not initialized"
        )
    return websocket_manager


if __name__ == "__main__":
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Run the application
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
