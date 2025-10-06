"""
Session Management for Multi-User Isolation
Provides session-based user isolation without database requirements
"""
import os
import uuid
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict
from pathlib import Path

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages user sessions with file-based storage"""
    
    def __init__(self, session_dir: str = "../sessions", session_timeout_hours: int = 24):
        """
        Initialize session manager
        
        Args:
            session_dir: Directory to store session metadata
            session_timeout_hours: Hours before session expires
        """
        self.session_dir = Path(session_dir)
        self.session_timeout = timedelta(hours=session_timeout_hours)
        self.session_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"SessionManager initialized with dir: {self.session_dir}")
    
    def create_session(self) -> str:
        """
        Create a new session with unique ID
        
        Returns:
            Session ID (UUID)
        """
        session_id = str(uuid.uuid4())
        session_data = {
            "session_id": session_id,
            "created_at": datetime.now().isoformat(),
            "last_accessed": datetime.now().isoformat(),
            "file_count": 0
        }
        
        self._save_session(session_id, session_data)
        logger.info(f"Created new session: {session_id}")
        return session_id
    
    def validate_session(self, session_id: str) -> bool:
        """
        Check if session exists and is not expired
        
        Args:
            session_id: Session ID to validate
            
        Returns:
            True if session is valid, False otherwise
        """
        if not session_id:
            return False
        
        session_data = self._load_session(session_id)
        if not session_data:
            return False
        
        # Check if session is expired
        last_accessed = datetime.fromisoformat(session_data["last_accessed"])
        if datetime.now() - last_accessed > self.session_timeout:
            logger.info(f"Session expired: {session_id}")
            self.delete_session(session_id)
            return False
        
        # Update last accessed time
        session_data["last_accessed"] = datetime.now().isoformat()
        self._save_session(session_id, session_data)
        
        return True
    
    def get_session_info(self, session_id: str) -> Optional[Dict]:
        """
        Get session metadata
        
        Args:
            session_id: Session ID
            
        Returns:
            Session data dictionary or None
        """
        return self._load_session(session_id)
    
    def increment_file_count(self, session_id: str):
        """Increment processed file count for session"""
        session_data = self._load_session(session_id)
        if session_data:
            session_data["file_count"] = session_data.get("file_count", 0) + 1
            session_data["last_accessed"] = datetime.now().isoformat()
            self._save_session(session_id, session_data)
    
    def delete_session(self, session_id: str):
        """
        Delete session metadata and associated files
        
        Args:
            session_id: Session ID to delete
        """
        # Delete session metadata file
        session_file = self.session_dir / f"{session_id}.json"
        if session_file.exists():
            session_file.unlink()
            logger.info(f"Deleted session metadata: {session_id}")
    
    def cleanup_expired_sessions(self, upload_dir: str, output_dir: str) -> int:
        """
        Clean up expired sessions and their files
        
        Args:
            upload_dir: Base upload directory
            output_dir: Base output directory
            
        Returns:
            Number of sessions cleaned up
        """
        cleaned = 0
        
        for session_file in self.session_dir.glob("*.json"):
            try:
                with open(session_file, 'r') as f:
                    session_data = json.load(f)
                
                session_id = session_data["session_id"]
                last_accessed = datetime.fromisoformat(session_data["last_accessed"])
                
                if datetime.now() - last_accessed > self.session_timeout:
                    # Delete session files
                    self._cleanup_session_files(session_id, upload_dir, output_dir)
                    
                    # Delete session metadata
                    session_file.unlink()
                    
                    cleaned += 1
                    logger.info(f"Cleaned up expired session: {session_id}")
            
            except Exception as e:
                logger.error(f"Error cleaning up session {session_file}: {e}")
        
        if cleaned > 0:
            logger.info(f"Total expired sessions cleaned: {cleaned}")
        
        return cleaned
    
    def _save_session(self, session_id: str, session_data: Dict):
        """Save session metadata to file"""
        session_file = self.session_dir / f"{session_id}.json"
        with open(session_file, 'w') as f:
            json.dump(session_data, f, indent=2)
    
    def _load_session(self, session_id: str) -> Optional[Dict]:
        """Load session metadata from file"""
        session_file = self.session_dir / f"{session_id}.json"
        if not session_file.exists():
            return None
        
        try:
            with open(session_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading session {session_id}: {e}")
            return None
    
    def _cleanup_session_files(self, session_id: str, upload_dir: str, output_dir: str):
        """Delete all files associated with a session"""
        # Clean upload directory
        upload_session_dir = Path(upload_dir) / session_id
        if upload_session_dir.exists():
            import shutil
            shutil.rmtree(upload_session_dir)
            logger.debug(f"Deleted uploads for session: {session_id}")
        
        # Clean output directory
        output_session_dir = Path(output_dir) / session_id
        if output_session_dir.exists():
            import shutil
            shutil.rmtree(output_session_dir)
            logger.debug(f"Deleted outputs for session: {session_id}")


# Global session manager instance
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get or create global session manager instance"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
