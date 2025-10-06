import logging
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.api.dependencies import get_file_handler
from app.core.config import settings
from app.models.schemas import ProcessingResult, BlurParameters
from app.services.face_recognition_blur import FaceRecognitionBlur, FaceRecognitionBlurError
from app.utils.file_handler import FileHandler

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/reference", response_model=dict)
async def upload_reference_face(
    file: UploadFile = File(...),
    handler: FileHandler = Depends(get_file_handler),
) -> dict:
    """Upload a reference face image for selective blurring (session-specific)."""
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

    try:
        # Store the uploaded reference image temporarily
        temp_path = await handler.save_upload_file(file_content, file.filename)
        
        # Process the reference image to extract face encoding
        processor = FaceRecognitionBlur()
        encoding = processor.load_reference_image(temp_path)
        
        # Save the encoding to a session-specific location
        if handler.session_id:
            encoding_dir = Path(handler.upload_dir) / "reference_encodings"
        else:
            # Fallback to root directory for backward compatibility
            encoding_dir = Path(settings.UPLOAD_DIRECTORY) / "reference_encodings"
        
        encoding_dir.mkdir(exist_ok=True, parents=True)
        encoding_path = encoding_dir / "current_reference.npy"
        
        processor.save_reference_encoding(encoding_path)
        
        logger.info(f"Successfully stored reference face encoding from {file.filename} (Session: {handler.session_id})")
        
        return {
            "message": "Reference face uploaded successfully",
            "encoding_shape": encoding.shape,
            "filename": file.filename,
            "session_id": handler.session_id,
        }

    except FaceRecognitionBlurError as e:
        logger.error(f"Face recognition error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error processing reference image: {e}")
        raise HTTPException(status_code=500, detail="Failed to process reference image")
    finally:
        # Clean up temporary file
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/selective-blur", response_model=ProcessingResult)
async def selective_blur_image(
    file: UploadFile = File(...),
    tolerance: Optional[float] = Form(0.75),
    blur_kernel: Optional[int] = Form(51),
    handler: FileHandler = Depends(get_file_handler),
) -> ProcessingResult:
    """Apply selective blurring to an image, keeping only the reference face unblurred."""
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

    # Check if reference encoding exists (session-specific)
    if handler.session_id:
        encoding_path = Path(handler.upload_dir) / "reference_encodings" / "current_reference.npy"
    else:
        encoding_path = Path(settings.UPLOAD_DIRECTORY) / "reference_encodings" / "current_reference.npy"
    
    if not encoding_path.exists():
        raise HTTPException(
            status_code=400,
            detail="No reference face found. Please upload a reference image first."
        )

    input_path = None
    output_path = None

    try:
        # Store the uploaded image
        start_time = datetime.now()
        input_path = await handler.save_upload_file(file_content, file.filename)
        
        # Initialize face recognition blur processor
        processor = FaceRecognitionBlur(tolerance=tolerance or 0.75)
        processor.load_reference_encoding(encoding_path)
        
        # Generate output filename
        output_filename = handler.generate_output_filename(file.filename, "_selective_blur")
        output_path = os.path.join(handler.output_dir, output_filename)
        
        # Apply selective blurring and get face statistics
        result_stats = processor.selective_blur_image(
            input_path,
            output_path,
            tolerance=tolerance,
            blur_kernel=blur_kernel or 51,
        )
        
        # Calculate processing time
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        # Get file stats
        output_stats = os.stat(output_path)
        
        logger.info(f"Successfully processed {file.filename} with selective blur")
        
        return ProcessingResult(
            original_filename=file.filename,
            processed_filename=output_filename,
            detections=[],  # No detections for selective blur
            processing_time=processing_time,
            timestamp=datetime.fromtimestamp(output_stats.st_mtime),
            total_detections=result_stats.get('total_faces', 0),
            face_count=result_stats.get('total_faces', 0),
            plate_count=0,
            blur_parameters=BlurParameters(
                min_kernel_size=blur_kernel or 51,
                max_kernel_size=blur_kernel or 51,
                blur_focus_exp=1.0,
                blur_base_weight=1.0,
            ),
            session_id=handler.session_id,  # Include session ID
        )

    except FaceRecognitionBlurError as e:
        logger.error(f"Face recognition error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during selective blur processing: {e}")
        raise HTTPException(status_code=500, detail="Failed to process image")
    finally:
        # Clean up input file
        if input_path and os.path.exists(input_path):
            os.remove(input_path)


@router.get("/reference/status")
async def get_reference_status(handler: FileHandler = Depends(get_file_handler)) -> dict:
    """Check if a reference face encoding is available for current session."""
    if handler.session_id:
        encoding_path = Path(handler.upload_dir) / "reference_encodings" / "current_reference.npy"
    else:
        encoding_path = Path(settings.UPLOAD_DIRECTORY) / "reference_encodings" / "current_reference.npy"
    
    if encoding_path.exists():
        stats = encoding_path.stat()
        return {
            "has_reference": True,
            "uploaded_at": stats.st_mtime,
            "encoding_file_size": stats.st_size,
            "session_id": handler.session_id,
        }
    else:
        return {
            "has_reference": False,
            "session_id": handler.session_id,
        }


@router.delete("/reference")
async def clear_reference_face(handler: FileHandler = Depends(get_file_handler)) -> dict:
    """Remove the current reference face encoding for current session."""
    if handler.session_id:
        encoding_path = Path(handler.upload_dir) / "reference_encodings" / "current_reference.npy"
    else:
        encoding_path = Path(settings.UPLOAD_DIRECTORY) / "reference_encodings" / "current_reference.npy"
    
    if encoding_path.exists():
        encoding_path.unlink()
        logger.info(f"Cleared reference encoding (Session: {handler.session_id})")
        return {
            "message": "Reference face encoding cleared successfully",
            "session_id": handler.session_id,
        }
    else:
        raise HTTPException(status_code=404, detail="No reference face found")