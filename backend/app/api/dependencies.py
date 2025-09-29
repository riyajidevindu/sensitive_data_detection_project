from functools import lru_cache

from app.services.detector import YOLOv8Detector
from app.services.image_processor import ImageProcessor
from app.utils.file_handler import FileHandler


@lru_cache()
def get_detector() -> YOLOv8Detector:
    """Provide a singleton YOLO detector instance."""
    return YOLOv8Detector()


@lru_cache()
def get_image_processor() -> ImageProcessor:
    """Provide a singleton image processor instance."""
    return ImageProcessor()


@lru_cache()
def get_file_handler() -> FileHandler:
    """Provide a singleton file handler instance."""
    return FileHandler()
