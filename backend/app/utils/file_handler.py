import os
from typing import Optional
import aiofiles
from PIL import Image
import cv2
import numpy as np
from app.core.config import settings

class FileHandler:
    """Handle file operations for image processing"""
    
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIRECTORY
        self.output_dir = settings.OUTPUT_DIRECTORY
        self.max_file_size = settings.MAX_FILE_SIZE
        self.allowed_extensions = settings.ALLOWED_EXTENSIONS
        # Ensure directories exist
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
    
    def validate_file(self, filename: str, file_size: int) -> bool:
        """Validate uploaded file"""
        # Check file size
        if file_size > self.max_file_size:
            return False
        
        # Check file extension
        extension = filename.lower().split('.')[-1]
        if extension not in self.allowed_extensions:
            return False
        
        return True
    
    async def save_upload_file(self, file_content: bytes, filename: str) -> str:
        """Save uploaded file to upload directory"""
        file_path = os.path.join(self.upload_dir, filename)
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        return file_path
    
    def load_image(self, file_path: str) -> Optional[np.ndarray]:
        """Load image using OpenCV"""
        try:
            image = cv2.imread(file_path)
            if image is not None:
                # Convert BGR to RGB
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            return image
        except Exception:
            return None
    
    def save_image(self, image: np.ndarray, filename: str) -> str:
        """Save processed image to output directory"""
        file_path = os.path.join(self.output_dir, filename)
        
        # Convert RGB back to BGR for saving
        bgr_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        cv2.imwrite(file_path, bgr_image)
        
        return file_path

    def save_image_to(self, image: np.ndarray, file_path: str) -> str:
        """Save processed image to an absolute path (ensures parent dirs)."""
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        bgr_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        cv2.imwrite(file_path, bgr_image)
        return file_path
    
    def cleanup_file(self, file_path: str):
        """Remove temporary file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass  # Ignore cleanup errors
    
    def generate_output_filename(self, original_filename: str, suffix: str = "_processed") -> str:
        """Generate output filename"""
        name, ext = os.path.splitext(original_filename)
        return f"{name}{suffix}{ext}"
    
    def get_file_size(self, file_path: str) -> int:
        """Get file size in bytes"""
        try:
            return os.path.getsize(file_path)
        except Exception:
            return 0
