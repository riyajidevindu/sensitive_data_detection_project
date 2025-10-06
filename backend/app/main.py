from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
import uvicorn
import asyncio
from app.core.config import settings
from app.api.routes import router as api_router
from app.core.logging_config import setup_logging
from app.core.session_manager import get_session_manager
import logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount static files for serving processed images
if os.path.exists(settings.OUTPUT_DIRECTORY):
    app.mount("/outputs", StaticFiles(directory=settings.OUTPUT_DIRECTORY), name="outputs")

# Optionally serve built frontend (multi-stage fullstack image) if directory exists
FRONTEND_BUILD_DIR = os.getenv("FRONTEND_BUILD_DIR", "frontend_build")
SERVE_FRONTEND = os.getenv("SERVE_FRONTEND", "false").lower() in {"1", "true", "yes"}

if SERVE_FRONTEND and os.path.isdir(FRONTEND_BUILD_DIR):
    # Mount at root; API still served under /api/v1
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD_DIR, html=True), name="frontend")
    logger.info(f"Mounted frontend build from '{FRONTEND_BUILD_DIR}' at '/'")
else:
    logger.info("Frontend build directory not served (SERVE_FRONTEND disabled or directory missing)")


# Background cleanup task
cleanup_task = None


async def cleanup_sessions_periodically():
    """Background task to cleanup expired sessions"""
    while True:
        try:
            await asyncio.sleep(settings.SESSION_CLEANUP_INTERVAL_MINUTES * 60)
            session_manager = get_session_manager()
            cleaned = session_manager.cleanup_expired_sessions(
                settings.UPLOAD_DIRECTORY,
                settings.OUTPUT_DIRECTORY
            )
            if cleaned > 0:
                logger.info(f"Background cleanup: Removed {cleaned} expired session(s)")
        except Exception as e:
            logger.error(f"Error in session cleanup task: {e}")


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    global cleanup_task
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    
    # Create necessary directories
    os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIRECTORY, exist_ok=True)
    os.makedirs(settings.SESSION_DIRECTORY, exist_ok=True)
    
    # Verify model exists
    if not os.path.exists(settings.MODEL_PATH):
        logger.error(f"Model file not found at {settings.MODEL_PATH}")
        raise RuntimeError(f"Model file not found at {settings.MODEL_PATH}")
    
    # Start background cleanup task
    cleanup_task = asyncio.create_task(cleanup_sessions_periodically())
    logger.info(f"Started session cleanup task (interval: {settings.SESSION_CLEANUP_INTERVAL_MINUTES} min)")
    
    logger.info("Application startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on application shutdown"""
    global cleanup_task
    if cleanup_task:
        cleanup_task.cancel()
        logger.info("Stopped session cleanup task")
    logger.info("Application shutting down")

@app.get("/")
async def root():
    """Root endpoint with basic API information"""
    return {
        "message": "Sensitive Data Detection API",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "model_loaded": os.path.exists(settings.MODEL_PATH)
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
