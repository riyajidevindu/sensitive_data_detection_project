from fastapi import APIRouter

from app.api.endpoints import detection, files, metadata, selective_blur, session, debug

router = APIRouter()

router.include_router(detection.router, tags=["detection"])
router.include_router(files.router, tags=["files"])
router.include_router(metadata.router, tags=["metadata"])
router.include_router(selective_blur.router, prefix="/selective-blur", tags=["selective-blur"])
router.include_router(session.router, prefix="/session", tags=["session"])
router.include_router(debug.router, prefix="/debug", tags=["debug"])
