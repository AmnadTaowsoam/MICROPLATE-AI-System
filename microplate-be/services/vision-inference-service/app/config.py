# utils/config.py
from dotenv import load_dotenv
import os
from pathlib import Path
from typing import List

# 1. หาโฟลเดอร์ services (สองระดับเหนือไฟล์นี้)
base_services = Path(__file__).resolve().parents[2]

# 2. โหลดค่าจาก .env.common
common_env = base_services / ".env"
if common_env.exists():
    load_dotenv(dotenv_path=common_env)

# 3. โหลดค่าจาก .env ของ service นี้
service_root = Path(__file__).resolve().parents[1]
service_env = service_root / ".env"
if service_env.exists():
    load_dotenv(dotenv_path=service_env, override=True)


def _parse_csv(value: str | None, fallback: str | None = None) -> List[str]:
    items: List[str] = []
    if value:
        items = [item.strip() for item in value.split(',') if item.strip()]
    if not items and fallback:
        items = [fallback]
    return items

class Config:
    # Logging and Timeouts
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG")
    CONNECTION_TIMEOUT: int = int(os.getenv("CONNECTION_TIMEOUT", "10"))
    READ_TIMEOUT: int = int(os.getenv("READ_TIMEOUT", "30"))

    # Service runtime
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "0.0")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "")
    PORT: int = int(os.getenv("PORT", "6403"))

    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_LOG_CHANNEL: str = os.getenv("REDIS_LOG_CHANNEL", "microplate:vision-inference:logs")
    REDIS_ERROR_CHANNEL: str = os.getenv("REDIS_ERROR_CHANNEL", "microplate:vision-inference:errors")

    # Service URLs
    IMAGE_SERVICE_URL: str = os.getenv("IMAGE_SERVICE_URL", "http://image-ingestion-service:6402")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:6400")
    PREDICTION_DB_SERVICE_URL: str = os.getenv("PREDICTION_DB_SERVICE_URL", "http://prediction-db-service:6404")

    # Processing Configuration
    MAX_CONCURRENT_INFERENCES: int = int(os.getenv("MAX_CONCURRENT_INFERENCES", "5"))
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
    NMS_THRESHOLD: float = float(os.getenv("NMS_THRESHOLD", "0.4"))
    ENABLE_GPU: bool = os.getenv("ENABLE_GPU", "false").lower() == "true"
    GPU_DEVICE_ID: int = int(os.getenv("GPU_DEVICE_ID", "0"))

    # Calibration / Grid configuration
    CALIBRATION_CONFIG_PATH: str = os.getenv("CALIBRATION_CONFIG_PATH", "config/roi_calibration.json")
    DEFAULT_GRID_WIDTH: int = int(os.getenv("DEFAULT_GRID_WIDTH", "1700"))
    DEFAULT_GRID_HEIGHT: int = int(os.getenv("DEFAULT_GRID_HEIGHT", "1200"))
    GRID_ROWS: int = int(os.getenv("GRID_ROWS", "8"))
    GRID_COLS: int = int(os.getenv("GRID_COLS", "12"))

    # CORS Configuration
    CORS_ALLOWED_ORIGINS: List[str] = _parse_csv(
        os.getenv("CORS_ALLOWED_ORIGINS"),
        "http://localhost:6410"
    )
