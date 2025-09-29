import cv2
import numpy as np
from typing import List, Optional, Dict
import logging
from app.core.config import settings
from app.models.schemas import Detection

logger = logging.getLogger(__name__)

class ImageProcessor:
    """Image processing utilities for blurring sensitive data"""
    
    def __init__(self):
        # Normalize kernel size bounds (must be odd and >= 3, with max >= min)
        min_kernel = max(3, settings.MIN_BLUR_KERNEL_SIZE)
        max_kernel = max(min_kernel, settings.MAX_BLUR_KERNEL_SIZE)

        if min_kernel % 2 == 0:
            min_kernel += 1
        if max_kernel % 2 == 0:
            max_kernel += 1

        self.min_kernel_size = min_kernel
        self.max_kernel_size = max_kernel
        self.enable_face_blur = settings.ENABLE_FACE_BLUR
        self.enable_plate_blur = settings.ENABLE_PLATE_BLUR
        self.blur_focus_exp = max(0.1, float(getattr(settings, "BLUR_FOCUS_EXP", 2.5)))
        base_weight = float(getattr(settings, "BLUR_BASE_WEIGHT", 0.35))
        self.blur_base_weight = float(np.clip(base_weight, 0.0, 1.0))
    
    def blur_detections(
        self,
        image: np.ndarray,
        detections: List[Detection],
        runtime_overrides: Optional[Dict[str, Optional[float]]] = None,
        runtime_settings: Optional[Dict[str, float]] = None,
    ) -> np.ndarray:
        """Apply blur to detected sensitive areas using optional runtime overrides."""
        settings = runtime_settings or self.get_runtime_settings(runtime_overrides)
        processed_image = image.copy()
        
        for detection in detections:
            if self._should_blur_detection(detection):
                processed_image = self._apply_blur_to_region(
                    processed_image, detection, settings
                )
        
        return processed_image

    def get_runtime_settings(
        self, overrides: Optional[Dict[str, Optional[float]]] = None
    ) -> Dict[str, float]:
        """Resolve runtime blur settings, applying optional overrides."""
        overrides = overrides or {}

        def to_int(value, default):
            try:
                return int(value)
            except (TypeError, ValueError):
                return default

        def to_float(value, default):
            try:
                return float(value)
            except (TypeError, ValueError):
                return default

        min_kernel = to_int(overrides.get("min_kernel_size"), self.min_kernel_size)
        max_kernel = to_int(overrides.get("max_kernel_size"), self.max_kernel_size)

        min_kernel = max(3, min_kernel)
        max_kernel = max(min_kernel, max_kernel)

        if min_kernel % 2 == 0:
            min_kernel += 1
        if max_kernel % 2 == 0:
            max_kernel += 1

        focus_exp = max(0.1, to_float(overrides.get("blur_focus_exp"), self.blur_focus_exp))
        base_weight = float(np.clip(to_float(overrides.get("blur_base_weight"), self.blur_base_weight), 0.0, 1.0))

        return {
            "min_kernel_size": min_kernel,
            "max_kernel_size": max_kernel,
            "blur_focus_exp": focus_exp,
            "blur_base_weight": base_weight,
        }
    
    def _should_blur_detection(self, detection: Detection) -> bool:
        """Determine if a detection should be blurred"""
        if detection.class_name == "face" and self.enable_face_blur:
            return True
        elif detection.class_name == "license_plate" and self.enable_plate_blur:
            return True
        return False
    
    def _apply_blur_to_region(
        self,
        image: np.ndarray,
        detection: Detection,
        settings: Dict[str, float]
    ) -> np.ndarray:
        """Apply Gaussian blur to a specific region"""
        bbox = detection.bbox
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
            kernel_size = self._calculate_kernel_size(detection.confidence, w, h, settings)
            blurred_region = cv2.GaussianBlur(
                region, 
                (kernel_size, kernel_size), 
                0
            )

            focus_strength = settings["blur_focus_exp"] + (
                detection.confidence * settings["blur_focus_exp"]
            )
            blurred_region = self._blend_with_radial_mask(
                region,
                blurred_region,
                focus_strength,
                settings["blur_base_weight"],
            )
            
            # Replace original region with blurred version
            image[y:y+h, x:x+w] = blurred_region
        
        return image

    def _calculate_kernel_size(
        self,
        confidence: float,
        region_width: int,
        region_height: int,
        settings: Dict[str, float]
    ) -> int:
        """Determine an adaptive Gaussian kernel size based on detection confidence."""
        # Clamp confidence to [0, 1]
        confidence = max(0.0, min(1.0, confidence))

        # Scale between configured min/max kernel sizes
        min_kernel = settings["min_kernel_size"]
        max_kernel = settings["max_kernel_size"]

        scaled_kernel = min_kernel + (
            (max_kernel - min_kernel) * confidence
        )

        # Ensure odd integer kernel (required by GaussianBlur)
        kernel = int(round(scaled_kernel))
        if kernel % 2 == 0:
            kernel += 1

        # Cap kernel so it does not exceed the region size (and stays >= 3)
        max_region_kernel = max(3, ((min(region_width, region_height) // 2) * 2 + 1))
        kernel = max(3, min(kernel, max_region_kernel))

        return kernel

    def _blend_with_radial_mask(
        self,
        original: np.ndarray,
        blurred: np.ndarray,
        focus_strength: float,
        base_weight: float,
    ) -> np.ndarray:
        """Blend blurred region with original using a radial weighting mask."""
        if focus_strength <= 0:
            focus_strength = 0.1

        height, width = original.shape[:2]
        if height == 0 or width == 0:
            return blurred

        yy = np.linspace(-1.0, 1.0, height, dtype=np.float32)
        xx = np.linspace(-1.0, 1.0, width, dtype=np.float32)
        grid_y, grid_x = np.meshgrid(yy, xx, indexing="ij")
        distance = np.sqrt(grid_x ** 2 + grid_y ** 2)
        max_distance = np.max(distance) + 1e-6
        radial_weight = 1.0 - (distance / max_distance)
        radial_weight = np.clip(radial_weight, 0.0, 1.0)
        radial_weight = np.power(radial_weight, focus_strength)

        # Blend toward a baseline blur weight so the entire region remains at least partially blurred
        weight = base_weight + (1.0 - base_weight) * radial_weight
        weight = weight[..., np.newaxis]

        original_f = original.astype(np.float32)
        blurred_f = blurred.astype(np.float32)

        blended = (blurred_f * weight) + (original_f * (1.0 - weight))
        return np.clip(blended, 0, 255).astype(original.dtype)
    
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
