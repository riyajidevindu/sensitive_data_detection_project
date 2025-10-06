"""
Debug endpoints for troubleshooting image loading and session issues
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
import os
from pathlib import Path

from ...core.config import settings
from ..dependencies import get_file_handler
from ...utils.file_handler import FileHandler

router = APIRouter()


@router.get("/session-info")
async def get_debug_session_info(handler: FileHandler = Depends(get_file_handler)):
    """Get comprehensive session debug information"""
    
    return {
        "session_id": handler.session_id,
        "upload_dir": handler.upload_dir,
        "output_dir": handler.output_dir,
        "base_upload_dir": handler.base_upload_dir,
        "base_output_dir": handler.base_output_dir,
        "upload_dir_exists": os.path.exists(handler.upload_dir),
        "output_dir_exists": os.path.exists(handler.output_dir),
        "settings": {
            "UPLOAD_DIRECTORY": settings.UPLOAD_DIRECTORY,
            "OUTPUT_DIRECTORY": settings.OUTPUT_DIRECTORY,
        }
    }


@router.get("/list-session-files")
async def list_session_files(handler: FileHandler = Depends(get_file_handler)):
    """List all files in current session's directories"""
    
    upload_files = []
    output_files = []
    
    # List upload files
    if os.path.exists(handler.upload_dir):
        for file in Path(handler.upload_dir).rglob("*"):
            if file.is_file():
                upload_files.append({
                    "name": file.name,
                    "relative_path": str(file.relative_to(handler.upload_dir)),
                    "size": file.stat().st_size,
                    "full_path": str(file)
                })
    
    # List output files
    if os.path.exists(handler.output_dir):
        for file in Path(handler.output_dir).rglob("*"):
            if file.is_file():
                output_files.append({
                    "name": file.name,
                    "relative_path": str(file.relative_to(handler.output_dir)),
                    "size": file.stat().st_size,
                    "full_path": str(file)
                })
    
    return {
        "session_id": handler.session_id,
        "upload_files": upload_files,
        "output_files": output_files,
        "upload_count": len(upload_files),
        "output_count": len(output_files)
    }


@router.get("/test-download-url")
async def test_download_url(
    filename: str = Query(..., description="Filename to test"),
    session_id: Optional[str] = Query(None, description="Session ID (optional, uses header if not provided)"),
    handler: FileHandler = Depends(get_file_handler)
):
    """Test if a download URL would work"""
    
    # Determine which session ID to use
    effective_session_id = session_id if session_id else handler.session_id
    
    # Build expected path
    if effective_session_id:
        expected_path = os.path.join(handler.base_output_dir, effective_session_id, filename)
    else:
        expected_path = os.path.join(handler.base_output_dir, filename)
    
    file_exists = os.path.exists(expected_path)
    
    result = {
        "filename": filename,
        "session_id_from_header": handler.session_id,
        "session_id_from_query": session_id,
        "effective_session_id": effective_session_id,
        "expected_path": expected_path,
        "file_exists": file_exists,
        "test_url": f"/api/v1/download/{filename}?session_id={effective_session_id}" if effective_session_id else f"/api/v1/download/{filename}",
    }
    
    if file_exists:
        result["file_size"] = os.path.getsize(expected_path)
        result["message"] = "✅ File exists and should be downloadable"
    else:
        result["message"] = "❌ File does not exist at expected path"
        
        # Check if file exists in root output directory (old location)
        root_path = os.path.join(handler.base_output_dir, filename)
        if os.path.exists(root_path):
            result["found_in_root"] = True
            result["root_path"] = root_path
            result["note"] = "File exists in root directory (pre-session isolation). Process again to save in session folder."
        else:
            result["found_in_root"] = False
    
    return result


@router.get("/verify-file-access")
async def verify_file_access(
    filename: str = Query(..., description="Filename to verify"),
    handler: FileHandler = Depends(get_file_handler)
):
    """Verify if a file can be accessed with current session"""
    
    # Check in session-specific output directory
    session_path = os.path.join(handler.output_dir, filename)
    session_exists = os.path.exists(session_path)
    
    # Check in root output directory (for backwards compatibility)
    root_path = os.path.join(handler.base_output_dir, filename)
    root_exists = os.path.exists(root_path)
    
    return {
        "filename": filename,
        "session_id": handler.session_id,
        "session_specific": {
            "path": session_path,
            "exists": session_exists,
            "accessible": session_exists
        },
        "root_directory": {
            "path": root_path,
            "exists": root_exists,
            "accessible": False,  # Should not be accessible in session mode
            "note": "Files in root are from before session isolation was implemented"
        },
        "recommendation": (
            "✅ File accessible in current session" if session_exists
            else "❌ File not in current session. Upload and process again." if root_exists
            else "❌ File does not exist anywhere. Please upload."
        )
    }
