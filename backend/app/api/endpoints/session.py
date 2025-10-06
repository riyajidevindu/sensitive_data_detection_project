"""
Session management endpoints
"""
import logging
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Depends

from app.core.session_manager import get_session_manager
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/session/create")
async def create_session():
    """
    Create a new user session
    
    Returns:
        Session ID and metadata
    """
    session_manager = get_session_manager()
    session_id = session_manager.create_session()
    session_info = session_manager.get_session_info(session_id)
    
    return {
        "session_id": session_id,
        "created_at": session_info["created_at"],
        "timeout_hours": settings.SESSION_TIMEOUT_HOURS,
        "message": "Session created successfully. Include X-Session-ID header in future requests."
    }


@router.get("/session/info")
async def get_session_info(x_session_id: Optional[str] = Header(None)):
    """
    Get current session information
    
    Args:
        x_session_id: Session ID from header
        
    Returns:
        Session metadata
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="No session ID provided")
    
    session_manager = get_session_manager()
    
    if not session_manager.validate_session(x_session_id):
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    session_info = session_manager.get_session_info(x_session_id)
    
    if not session_info:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_info["session_id"],
        "created_at": session_info["created_at"],
        "last_accessed": session_info["last_accessed"],
        "file_count": session_info.get("file_count", 0),
        "timeout_hours": settings.SESSION_TIMEOUT_HOURS
    }


@router.post("/session/cleanup")
async def cleanup_expired_sessions():
    """
    Manually trigger cleanup of expired sessions
    
    Note: This is automatically run periodically by the background task
    
    Returns:
        Number of sessions cleaned up
    """
    session_manager = get_session_manager()
    cleaned = session_manager.cleanup_expired_sessions(
        settings.UPLOAD_DIRECTORY,
        settings.OUTPUT_DIRECTORY
    )
    
    return {
        "message": f"Cleaned up {cleaned} expired session(s)",
        "sessions_cleaned": cleaned
    }


@router.delete("/session/delete")
async def delete_session(x_session_id: Optional[str] = Header(None)):
    """
    Delete current session and all associated files
    
    Args:
        x_session_id: Session ID from header
        
    Returns:
        Confirmation message
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="No session ID provided")
    
    session_manager = get_session_manager()
    
    # Delete session files and metadata
    session_manager._cleanup_session_files(
        x_session_id,
        settings.UPLOAD_DIRECTORY,
        settings.OUTPUT_DIRECTORY
    )
    session_manager.delete_session(x_session_id)
    
    return {
        "message": "Session deleted successfully",
        "session_id": x_session_id
    }
