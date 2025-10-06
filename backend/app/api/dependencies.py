from functools import lru_cache
from typing import Optional
from fastapi import Header, HTTPException

from app.services.detector import YOLOv8Detector
from app.services.image_processor import ImageProcessor
from app.utils.file_handler import FileHandler
from app.core.session_manager import get_session_manager


@lru_cache()
def get_detector() -> YOLOv8Detector:
    """Provide a singleton YOLO detector instance."""
    return YOLOv8Detector()


@lru_cache()
def get_image_processor() -> ImageProcessor:
    """Provide a singleton image processor instance."""
    return ImageProcessor()


def get_file_handler(x_session_id: Optional[str] = Header(None)) -> FileHandler:
    """
    Provide a file handler instance with session support.
    
    Args:
        x_session_id: Optional session ID from request header
        
    Returns:
        FileHandler instance configured for the session
        
    Raises:
        HTTPException: If session is invalid or expired
    """
    session_manager = get_session_manager()
    
    if x_session_id:
        # Validate existing session
        if not session_manager.validate_session(x_session_id):
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session. Please refresh to get a new session."
            )
        session_id = x_session_id
    else:
        # Create new session for requests without session ID
        session_id = session_manager.create_session()
    
    # Increment file count for tracking
    session_manager.increment_file_count(session_id)
    
    return FileHandler(session_id=session_id)
