from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class BoundingBox(BaseModel):
    """Bounding box coordinates"""
    x: float
    y: float
    width: float
    height: float

class Detection(BaseModel):
    """Single detection result"""
    class_name: str
    confidence: float
    bbox: BoundingBox

class ProcessingResult(BaseModel):
    """Result of image processing"""
    original_filename: str
    processed_filename: str
    detections: List[Detection]
    processing_time: float
    timestamp: datetime
    total_detections: int
    face_count: int
    plate_count: int

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    model_loaded: bool

class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    detail: Optional[str] = None
    status_code: int

class ModelInfo(BaseModel):
    """Model information response"""
    model_name: str
    model_path: str
    confidence_threshold: float
    iou_threshold: float
    supported_classes: List[str]
    model_size: str
