import cv2
import numpy as np
from typing import List
import logging
from app.core.config import settings
from app.models.schemas import Detection

logger = logging.getLogger(__name__)

class ImageProcessor:
    """Image processing utilities for blurring sensitive data"""
    
    def __init__(self):
        self.blur_kernel_size = settings.BLUR_KERNEL_SIZE
        self.enable_face_blur = settings.ENABLE_FACE_BLUR
        self.enable_plate_blur = settings.ENABLE_PLATE_BLUR
    
    def blur_detections(self, image: np.ndarray, detections: List[Detection]) -> np.ndarray:
        """Apply blur to detected sensitive areas"""
        processed_image = image.copy()
        
        for detection in detections:
            if self._should_blur_detection(detection):
                processed_image = self._apply_blur_to_region(
                    processed_image, detection.bbox
                )
        
        return processed_image
    
    def _should_blur_detection(self, detection: Detection) -> bool:
        """Determine if a detection should be blurred"""
        if detection.class_name == "face" and self.enable_face_blur:
            return True
        elif detection.class_name == "license_plate" and self.enable_plate_blur:
            return True
        return False
    
    def _apply_blur_to_region(self, image: np.ndarray, bbox) -> np.ndarray:
        """Apply Gaussian blur to a specific region"""
        x, y, w, h = int(bbox.x), int(bbox.y), int(bbox.width), int(bbox.height)
        
        # Ensure coordinates are within image bounds
        x = max(0, x)
        y = max(0, y)
        w = min(w, image.shape[1] - x)
        h = min(h, image.shape[0] - y)
        
        if w > 0 and h > 0:
            # Extract region
            region = image[y:y+h, x:x+w]
            
            # Apply Gaussian blur
            blurred_region = cv2.GaussianBlur(
                region, 
                (self.blur_kernel_size, self.blur_kernel_size), 
                0
            )
            
            # Replace original region with blurred version
            image[y:y+h, x:x+w] = blurred_region
        
        return image
    
    def draw_detections(self, image: np.ndarray, detections: List[Detection], 
                       draw_labels: bool = True) -> np.ndarray:
        """Draw bounding boxes and labels on image"""
        annotated_image = image.copy()
        
        # Color mapping for different classes
        colors = {
            "face": (0, 255, 0),  # Green
            "license_plate": (255, 0, 0)  # Blue
        }
        
        for detection in detections:
            bbox = detection.bbox
            x, y, w, h = int(bbox.x), int(bbox.y), int(bbox.width), int(bbox.height)
            
            # Get color for this class
            color = colors.get(detection.class_name, (0, 255, 255))
            
            # Draw bounding box
            cv2.rectangle(annotated_image, (x, y), (x + w, y + h), color, 2)
            
            if draw_labels:
                # Prepare label text
                label = f"{detection.class_name}: {detection.confidence:.2f}"
                
                # Calculate text size
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.6
                thickness = 1
                (text_width, text_height), _ = cv2.getTextSize(label, font, font_scale, thickness)
                
                # Draw label background
                cv2.rectangle(
                    annotated_image,
                    (x, y - text_height - 10),
                    (x + text_width, y),
                    color,
                    -1
                )
                
                # Draw label text
                cv2.putText(
                    annotated_image,
                    label,
                    (x, y - 5),
                    font,
                    font_scale,
                    (255, 255, 255),
                    thickness
                )
        
        return annotated_image
    
    def resize_image(self, image: np.ndarray, max_width: int = 1920, max_height: int = 1080) -> np.ndarray:
        """Resize image while maintaining aspect ratio"""
        height, width = image.shape[:2]
        
        if width <= max_width and height <= max_height:
            return image
        
        # Calculate scaling factor
        scale = min(max_width / width, max_height / height)
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    def validate_image(self, image: np.ndarray) -> bool:
        """Validate if image is valid for processing"""
        if image is None:
            return False
        
        if len(image.shape) not in [2, 3]:
            return False
        
        if image.shape[0] < 1 or image.shape[1] < 1:
            return False
        
        return True
