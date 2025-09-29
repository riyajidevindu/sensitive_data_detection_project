import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.dependencies import get_detector, get_file_handler, get_image_processor
from app.core.config import settings
from app.models.schemas import BlurParameters, ProcessingResult
from app.services.detector import YOLOv8Detector
from app.services.image_processor import ImageProcessor
from app.utils.file_handler import FileHandler

logger = logging.getLogger(__name__)

router = APIRouter()


@dataclass
class StoredUpload:
    path: str
    filename: str
    size: int


async def _store_upload(
    file: UploadFile,
    handler: FileHandler,
) -> StoredUpload:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_content = await file.read()
    file_size = len(file_content)

    if not handler.validate_file(file.filename, file_size):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid file. Max size: {settings.MAX_FILE_SIZE/1024/1024:.1f}MB, "
                f"Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            ),
        )

    upload_path = await handler.save_upload_file(file_content, file.filename)
    return StoredUpload(path=upload_path, filename=file.filename, size=file_size)


def _load_and_validate_image(handler: FileHandler, processor: ImageProcessor, upload: StoredUpload):
    image = handler.load_image(upload.path)
    if image is None:
        raise HTTPException(status_code=400, detail="Unable to load image")

    if not processor.validate_image(image):
        raise HTTPException(status_code=400, detail="Invalid image format")

    return image


def _resolve_runtime_settings(
    processor: ImageProcessor,
    overrides: Dict[str, Optional[float]],
) -> Dict[str, float]:
    sanitized_overrides = {key: value for key, value in overrides.items() if value is not None}
    return processor.get_runtime_settings(sanitized_overrides)


def _save_debug_image(handler: FileHandler, processor: ImageProcessor, image, detections, source_filename: str):
    debug_dir = os.path.join(settings.OUTPUT_DIRECTORY, "debug")
    os.makedirs(debug_dir, exist_ok=True)
    debug_filename = handler.generate_output_filename(source_filename, suffix="_detections")
    debug_image = processor.draw_detections(image, detections, draw_labels=True)
    handler.save_image(debug_image, os.path.join(debug_dir, debug_filename))


def _apply_blur_if_needed(
    processor: ImageProcessor,
    image,
    detections,
    runtime_settings: Dict[str, float],
    blur_faces: bool,
    blur_plates: bool,
):
    if not (blur_faces or blur_plates):
        return image

    processed_image = image.copy()
    original_face_blur = processor.enable_face_blur
    original_plate_blur = processor.enable_plate_blur

    try:
        processor.enable_face_blur = blur_faces
        processor.enable_plate_blur = blur_plates
        return processor.blur_detections(processed_image, detections, runtime_settings=runtime_settings)
    finally:
        processor.enable_face_blur = original_face_blur
        processor.enable_plate_blur = original_plate_blur


@router.post("/detect", response_model=ProcessingResult)
async def detect_sensitive_data(
    file: UploadFile = File(...),
    blur_faces: bool = Form(True),
    blur_plates: bool = Form(True),
    min_kernel_size: int | None = Form(None),
    max_kernel_size: int | None = Form(None),
    blur_focus_exp: float | None = Form(None),
    blur_base_weight: float | None = Form(None),
    detector: YOLOv8Detector = Depends(get_detector),
    processor: ImageProcessor = Depends(get_image_processor),
    handler: FileHandler = Depends(get_file_handler),
):
    """Detect and optionally blur sensitive data in an uploaded image."""
    start_time = time.time()

    upload = await _store_upload(file, handler)

    try:
        image = _load_and_validate_image(handler, processor, upload)
        detections = detector.detect(image)
        _save_debug_image(handler, processor, image, detections, upload.filename)

        runtime_settings = _resolve_runtime_settings(
            processor,
            {
                "min_kernel_size": min_kernel_size,
                "max_kernel_size": max_kernel_size,
                "blur_focus_exp": blur_focus_exp,
                "blur_base_weight": blur_base_weight,
            },
        )

        processed_image = _apply_blur_if_needed(
            processor,
            image,
            detections,
            runtime_settings,
            blur_faces,
            blur_plates,
        )

        output_filename = handler.generate_output_filename(upload.filename)
        handler.save_image(processed_image, output_filename)

        face_count = sum(1 for d in detections if d.class_name == "face")
        plate_count = sum(1 for d in detections if d.class_name == "license_plate")
        processing_time = time.time() - start_time

        logger.info(
            "Processed %s: %s detections in %.2fs",
            upload.filename,
            len(detections),
            processing_time,
        )

        return ProcessingResult(
            original_filename=upload.filename,
            processed_filename=output_filename,
            detections=detections,
            processing_time=processing_time,
            timestamp=datetime.now(),
            total_detections=len(detections),
            face_count=face_count,
            plate_count=plate_count,
            blur_parameters=BlurParameters(**runtime_settings),
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error("Processing failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}") from exc
    finally:
        handler.cleanup_file(upload.path)
