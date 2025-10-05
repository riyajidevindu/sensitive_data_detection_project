from fastapi import APIRouter

from app.api.endpoints import detection, files, metadata, selective_blur

router = APIRouter()

router.include_router(detection.router, tags=["detection"])
router.include_router(files.router, tags=["files"])
router.include_router(metadata.router, tags=["metadata"])
router.include_router(selective_blur.router, prefix="/selective-blur", tags=["selective-blur"])
