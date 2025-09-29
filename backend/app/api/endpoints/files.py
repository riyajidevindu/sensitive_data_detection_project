import logging
import os
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


def _resolve_file_path(filename: str) -> str:
    return os.path.join(settings.OUTPUT_DIRECTORY, filename)


@router.get("/download/{filename}")
async def download_processed_image(filename: str):
    """Download processed image."""
    file_path = _resolve_file_path(filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path=file_path, filename=filename, media_type="image/jpeg")


@router.delete("/outputs/{filename}")
async def delete_output_file(filename: str):
    """Delete a processed output file."""
    file_path = _resolve_file_path(filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        os.remove(file_path)
        return {"message": f"File {filename} deleted successfully"}
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to delete file %s: %s", filename, exc)
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {exc}") from exc


@router.get("/outputs")
async def list_output_files():
    """List all processed output files."""
    try:
        files = []
        if os.path.exists(settings.OUTPUT_DIRECTORY):
            for filename in os.listdir(settings.OUTPUT_DIRECTORY):
                file_path = _resolve_file_path(filename)
                if os.path.isfile(file_path):
                    files.append(
                        {
                            "filename": filename,
                            "size": os.path.getsize(file_path),
                            "created": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                        }
                    )

        return {"files": files, "total": len(files)}
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to list files: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to list files: {exc}") from exc
