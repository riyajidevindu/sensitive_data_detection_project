import logging
import os

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_detector
from app.core.config import settings
from app.models.schemas import HealthResponse, ModelInfo
from app.services.detector import YOLOv8Detector

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Application health check."""
    model_loaded = os.path.exists(settings.MODEL_PATH)
    return HealthResponse(status="healthy" if model_loaded else "unhealthy", version=settings.VERSION, model_loaded=model_loaded)


@router.get("/models/info", response_model=ModelInfo)
async def get_model_info(detector: YOLOv8Detector = Depends(get_detector)):
    """Retrieve model metadata."""
    try:
        info = detector.get_model_info()

        model_size = "Unknown"
        if os.path.exists(settings.MODEL_PATH):
            size_bytes = os.path.getsize(settings.MODEL_PATH)
            size_mb = size_bytes / (1024 * 1024)
            model_size = f"{size_mb:.1f} MB"

        return ModelInfo(
            model_name=info["model_name"],
            model_path=info["model_path"],
            confidence_threshold=info["confidence_threshold"],
            iou_threshold=info["iou_threshold"],
            supported_classes=info["supported_classes"],
            model_size=model_size,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to get model info: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {exc}") from exc
