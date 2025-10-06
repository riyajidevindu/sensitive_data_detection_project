from pydantic_settings import BaseSettings
from typing import List
import os
from pydantic import field_validator

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Sensitive Data Detection API"
    DESCRIPTION: str = "API for detecting sensitive data in images using YOLOv8"
    VERSION: str = "1.0.0"
    
    # Model Configuration
    # Use a container-friendly relative default; override via env MODEL_PATH if needed
    MODEL_PATH: str = "model/best.pt"
    CONFIDENCE_THRESHOLD: float = 0.2
    IOU_THRESHOLD: float = 0.5
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # File Upload Configuration
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "bmp", "tiff", "webp"]
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]  # Can be overridden with comma-separated env BACKEND_CORS_ORIGINS
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Storage Configuration
    UPLOAD_DIRECTORY: str = "../uploads"
    OUTPUT_DIRECTORY: str = "../outputs"
    SESSION_DIRECTORY: str = "../sessions"
    
    # Processing Configuration
    ENABLE_FACE_BLUR: bool = True
    ENABLE_PLATE_BLUR: bool = True
    BLUR_KERNEL_SIZE: int = 15
    MIN_BLUR_KERNEL_SIZE: int = 9
    MAX_BLUR_KERNEL_SIZE: int = 45
    BLUR_FOCUS_EXP: float = 2.5
    BLUR_BASE_WEIGHT: float = 0.35
    
    # Session Management
    SESSION_TIMEOUT_HOURS: int = 24
    SESSION_CLEANUP_INTERVAL_MINUTES: int = 60
    
    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors(cls, v):
        """Allow comma or semicolon separated string in env to become list."""
        if isinstance(v, str):
            # Support JSON-like [..] or plain comma/semicolon separated
            cleaned = v.strip().strip('[]')
            parts = [p.strip().strip('"').strip("'") for p in cleaned.replace(";", ",").split(",") if p.strip()]
            return parts
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()
