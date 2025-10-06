import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Depends, Query
from fastapi.responses import FileResponse

from app.core.config import settings
from app.utils.file_handler import FileHandler
from app.api.dependencies import get_file_handler

logger = logging.getLogger(__name__)

router = APIRouter()


def _resolve_file_path(filename: str, session_id: Optional[str] = None) -> str:
    """Resolve file path with optional session isolation"""
    if session_id:
        return os.path.join(settings.OUTPUT_DIRECTORY, session_id, filename)
    return os.path.join(settings.OUTPUT_DIRECTORY, filename)


@router.get("/download/{filename}")
async def download_processed_image(
    filename: str,
    x_session_id: Optional[str] = Header(None),
    session_id: Optional[str] = Query(None, description="Session ID as query parameter (fallback)")
):
    """
    Download processed image with session isolation.
    Session ID can be provided via header (X-Session-ID) or query parameter (session_id).
    """
    # Use header first, fallback to query parameter
    effective_session_id = x_session_id or session_id
    file_path = _resolve_file_path(filename, effective_session_id)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path=file_path, filename=filename, media_type="image/jpeg")


@router.delete("/outputs/{filename}")
async def delete_output_file(
    filename: str,
    handler: FileHandler = Depends(get_file_handler)
):
    """Delete a processed output file (session-aware)."""
    file_path = os.path.join(handler.output_dir, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        os.remove(file_path)
        return {"message": f"File {filename} deleted successfully"}
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to delete file %s: %s", filename, exc)
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {exc}") from exc


@router.get("/outputs")
async def list_output_files(handler: FileHandler = Depends(get_file_handler)):
    """List all processed output files for current session."""
    try:
        files = []
        if os.path.exists(handler.output_dir):
            for filename in os.listdir(handler.output_dir):
                file_path = os.path.join(handler.output_dir, filename)
                if os.path.isfile(file_path):
                    files.append(
                        {
                            "filename": filename,
                            "size": os.path.getsize(file_path),
                            "created": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                        }
                    )

        return {
            "files": files,
            "total": len(files),
            "session_id": handler.session_id
        }
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to list files: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to list files: {exc}") from exc
