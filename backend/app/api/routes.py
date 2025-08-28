from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
import time
import os
import logging
from datetime import datetime
from typing import List

from app.core.config import settings
from app.models.schemas import ProcessingResult, HealthResponse, ModelInfo, ErrorResponse
from app.services.detector import YOLOv8Detector
from app.services.image_processor import ImageProcessor
from app.utils.file_handler import FileHandler

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Initialize services (these will be dependency injected)
detector = None
image_processor = None
file_handler = None

def get_detector():
    """Dependency injection for detector"""
    global detector
    if detector is None:
        detector = YOLOv8Detector()
    return detector

def get_image_processor():
    """Dependency injection for image processor"""
    global image_processor
    if image_processor is None:
        image_processor = ImageProcessor()
    return image_processor

def get_file_handler():
    """Dependency injection for file handler"""
    global file_handler
    if file_handler is None:
        file_handler = FileHandler()
    return file_handler

@router.post("/detect", response_model=ProcessingResult)
async def detect_sensitive_data(
    file: UploadFile = File(...),
    blur_faces: bool = True,
    blur_plates: bool = True,
    detector: YOLOv8Detector = Depends(get_detector),
    processor: ImageProcessor = Depends(get_image_processor),
    handler: FileHandler = Depends(get_file_handler)
):
    """
    Detect and optionally blur sensitive data in uploaded image
    """
    start_time = time.time()
    
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        file_content = await file.read()
        file_size = len(file_content)
        
        if not handler.validate_file(file.filename, file_size):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file. Max size: {settings.MAX_FILE_SIZE/1024/1024:.1f}MB, "
                       f"Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        
        # Save uploaded file
        upload_path = await handler.save_upload_file(file_content, file.filename)
        
        try:
            # Load image
            image = handler.load_image(upload_path)
            if image is None:
                raise HTTPException(status_code=400, detail="Unable to load image")
            
            # Validate image
            if not processor.validate_image(image):
                raise HTTPException(status_code=400, detail="Invalid image format")
            

            # Perform detection
            detections = detector.detect(image)

            # --- DEBUG: Save detection output with bounding boxes (no blur) ---
            debug_dir = os.path.join(settings.OUTPUT_DIRECTORY, "debug")
            os.makedirs(debug_dir, exist_ok=True)
            debug_filename = handler.generate_output_filename(file.filename, suffix="_detections")
            debug_path = os.path.join(debug_dir, debug_filename)
            debug_image = processor.draw_detections(image, detections, draw_labels=True)
            handler.save_image(debug_image, os.path.join(debug_dir, debug_filename))
            # --- END DEBUG ---

            # Process image (apply blur if requested)
            processed_image = image.copy()
            if blur_faces or blur_plates:
                # Temporarily override processor settings
                original_face_blur = processor.enable_face_blur
                original_plate_blur = processor.enable_plate_blur

                processor.enable_face_blur = blur_faces
                processor.enable_plate_blur = blur_plates

                processed_image = processor.blur_detections(processed_image, detections)

                # Restore original settings
                processor.enable_face_blur = original_face_blur
                processor.enable_plate_blur = original_plate_blur

            # Save processed image
            output_filename = handler.generate_output_filename(file.filename)
            output_path = handler.save_image(processed_image, output_filename)
            
            # Calculate statistics
            face_count = sum(1 for d in detections if d.class_name == "face")
            plate_count = sum(1 for d in detections if d.class_name == "license_plate")
            
            processing_time = time.time() - start_time
            
            # Create response
            result = ProcessingResult(
                original_filename=file.filename,
                processed_filename=output_filename,
                detections=detections,
                processing_time=processing_time,
                timestamp=datetime.now(),
                total_detections=len(detections),
                face_count=face_count,
                plate_count=plate_count
            )
            
            logger.info(f"Processed {file.filename}: {len(detections)} detections in {processing_time:.2f}s")
            
            return result
            
        finally:
            # Cleanup uploaded file
            handler.cleanup_file(upload_path)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.get("/download/{filename}")
async def download_processed_image(filename: str):
    """Download processed image"""
    file_path = os.path.join(settings.OUTPUT_DIRECTORY, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='image/jpeg'
    )

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    model_loaded = os.path.exists(settings.MODEL_PATH)
    
    return HealthResponse(
        status="healthy" if model_loaded else "unhealthy",
        version=settings.VERSION,
        model_loaded=model_loaded
    )

@router.get("/models/info", response_model=ModelInfo)
async def get_model_info(detector: YOLOv8Detector = Depends(get_detector)):
    """Get model information"""
    try:
        info = detector.get_model_info()
        
        # Calculate model file size
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
            model_size=model_size
        )
        
    except Exception as e:
        logger.error(f"Failed to get model info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")

@router.delete("/outputs/{filename}")
async def delete_output_file(filename: str):
    """Delete processed output file"""
    file_path = os.path.join(settings.OUTPUT_DIRECTORY, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        os.remove(file_path)
        return {"message": f"File {filename} deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

@router.get("/outputs")
async def list_output_files():
    """List all processed output files"""
    try:
        files = []
        if os.path.exists(settings.OUTPUT_DIRECTORY):
            for filename in os.listdir(settings.OUTPUT_DIRECTORY):
                file_path = os.path.join(settings.OUTPUT_DIRECTORY, filename)
                if os.path.isfile(file_path):
                    file_info = {
                        "filename": filename,
                        "size": os.path.getsize(file_path),
                        "created": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat()
                    }
                    files.append(file_info)
        
        return {"files": files, "total": len(files)}
        
    except Exception as e:
        logger.error(f"Failed to list files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")
