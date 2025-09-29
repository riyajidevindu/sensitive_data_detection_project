from fastapi import APIRouter

from app.api.endpoints import detection, files, metadata

router = APIRouter()

router.include_router(detection.router, tags=["detection"])
router.include_router(files.router, tags=["files"])
router.include_router(metadata.router, tags=["metadata"])
