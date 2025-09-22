# utils/config.py
from dotenv import load_dotenv
import os
from pathlib import Path

# 1. หาโฟลเดอร์ services (สองระดับเหนือไฟล์นี้)
base_services = Path(__file__).resolve().parents[2]

# 2. โหลดค่าจาก .env.common
common_env = base_services / ".env"
if common_env.exists():
    load_dotenv(dotenv_path=common_env)
    print(f"Loaded common env: {common_env}")

class Config:
    # Database Config
    DB_NAME: str = os.getenv("DB_NAME", "")
    DB_USERNAME: str = os.getenv("DB_USER", "")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_HOST: str = os.getenv("DB_HOST", "host.docker.internal")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    
    # Full Database URL
    FULL_DATABASE_URL: str = f"postgresql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
   
    # CORS Settings
    CORS_ALLOWED_ORIGINS: list = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    CORS_ALLOW_CREDENTIALS: bool = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
    CORS_ALLOW_METHODS: list = os.getenv("CORS_ALLOW_METHODS", "GET,POST,PUT,DELETE").split(",")
    CORS_ALLOW_HEADERS: list = os.getenv("CORS_ALLOW_HEADERS", "Authorization,Content-Type,Accept").split(",")
    
    # API Key and Secrets
    API_KEY: str = os.getenv("API_KEY", "default_api_key")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    
    # Logging and Timeouts
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG")
    CONNECTION_TIMEOUT: int = int(os.getenv("CONNECTION_TIMEOUT", "10"))
    READ_TIMEOUT: int = int(os.getenv("READ_TIMEOUT", "30"))
    TOKEN_EXPIRE_MINUTES: int = int(os.getenv("TOKEN_EXPIRE_MINUTES", "30"))

    MODEL_VERSION : str = os.getenv("MODEL_VERSION", "0.0")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "")
    PORT: int = int(os.getenv("PREDICT_SERVICE_PORT", "6403"))
    
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
