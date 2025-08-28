import onnxruntime as ort
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any
import logging
from app.core.config import settings
from app.models.schemas import Detection, BoundingBox

logger = logging.getLogger(__name__)

class YOLOv8Detector:
    """YOLOv8 ONNX model inference class"""

    def __init__(self, model_path: str = None):
        self.model_path = model_path or settings.MODEL_PATH
        self.confidence_threshold = settings.CONFIDENCE_THRESHOLD
        self.iou_threshold = settings.IOU_THRESHOLD

        # Class names for sensitive data detection
        self.class_names = {
            0: "face",
            1: "license_plate",
        }

        self.session = None
        self.input_name = None
        self.output_names = None
        self.input_shape = None
        self.input_height = None
        self.input_width = None

        self._load_model()
    
    def _load_model(self):
        """Load the ONNX model"""
        try:
            # Create ONNX Runtime session
            providers = ['CPUExecutionProvider']
            if ort.get_device() == 'GPU':
                providers.insert(0, 'CUDAExecutionProvider')
            
            self.session = ort.InferenceSession(self.model_path, providers=providers)
            
            # Get model input/output info
            self.input_name = self.session.get_inputs()[0].name
            self.output_names = [output.name for output in self.session.get_outputs()]
            self.input_shape = self.session.get_inputs()[0].shape
            # Resolve input height/width even if dynamic or symbolic
            self.input_height = self._resolve_dim(self.input_shape[2], default=640)
            self.input_width = self._resolve_dim(self.input_shape[3], default=640)
            
            logger.info(f"Model loaded successfully from {self.model_path}")
            logger.info(f"Input shape: {self.input_shape} -> resolved to HxW: {self.input_height}x{self.input_width}")
            logger.info(f"Available providers: {self.session.get_providers()}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise RuntimeError(f"Failed to load model: {str(e)}")

    @staticmethod
    def _resolve_dim(dim: Any, default: int = 640) -> int:
        """Resolve a possibly dynamic/symbolic dimension to an int.
        Falls back to default if None, string, negative, or not castable.
        """
        try:
            # Handle None or symbolic strings
            if dim is None:
                return default
            # Some ONNX shapes may be strings like 'height'/'width'
            if isinstance(dim, str):
                return default
            # Negative indicates dynamic in some exports
            val = int(dim)
            if val <= 0:
                return default
            return val
        except Exception:
            return default
    
    def preprocess_image(self, image: np.ndarray) -> Tuple[np.ndarray, float, Tuple[int, int]]:
        """Preprocess image for inference.
        Returns: (batched_input, scale, (x_offset, y_offset))
        """
        original_height, original_width = image.shape[:2]

        # Get target size from resolved model input shape
        target_height, target_width = self.input_height, self.input_width

        # Resize image while maintaining aspect ratio
        scale = min(target_width / original_width, target_height / original_height)
        new_width = int(original_width * scale)
        new_height = int(original_height * scale)

        resized = cv2.resize(image, (new_width, new_height))

        # Create padded image
        padded = np.full((target_height, target_width, 3), 128, dtype=np.uint8)

        # Calculate padding offsets
        y_offset = (target_height - new_height) // 2
        x_offset = (target_width - new_width) // 2

        # Place resized image in center
        padded[y_offset:y_offset + new_height, x_offset:x_offset + new_width] = resized

        # Normalize and transpose for ONNX model
        normalized = padded.astype(np.float32) / 255.0
        transposed = np.transpose(normalized, (2, 0, 1))  # HWC to CHW
        batched = np.expand_dims(transposed, axis=0)  # Add batch dimension

        return batched, scale, (x_offset, y_offset)
    
    def postprocess_outputs(self, outputs: List[np.ndarray], scale: float, 
                          offsets: Tuple[int, int], original_shape: Tuple[int, int]) -> List[Detection]:
        """Postprocess model outputs to get detections"""
        detections = []
        
        # Assuming YOLOv8 output format: [batch, num_detections, 6] 
        # where 6 = [x_center, y_center, width, height, confidence, class_id]
        predictions = outputs[0][0]  # Remove batch dimension
        
        x_offset, y_offset = offsets
        original_height, original_width = original_shape
        
        for prediction in predictions:
            if len(prediction) >= 6:
                x_center, y_center, width, height, confidence, class_id = prediction[:6]
                
                # Ensure all values are float
                x_center = float(x_center)
                y_center = float(y_center)
                width = float(width)
                height = float(height)
                confidence = float(confidence)
                class_id = int(float(class_id))
                
                if confidence >= self.confidence_threshold:
                    # Convert from normalized coordinates to original image coordinates
                    x_center = (x_center - x_offset) / scale
                    y_center = (y_center - y_offset) / scale
                    width = width / scale
                    height = height / scale
                    
                    # Convert to top-left corner coordinates
                    x = x_center - width / 2
                    y = y_center - height / 2
                    
                    # Ensure coordinates are within image bounds
                    x = max(0, min(x, original_width))
                    y = max(0, min(y, original_height))
                    width = min(width, original_width - x)
                    height = min(height, original_height - y)
                    
                    class_name = self.class_names.get(class_id, f"class_{class_id}")
                    
                    detection = Detection(
                        class_name=class_name,
                        confidence=float(confidence),
                        bbox=BoundingBox(x=float(x), y=float(y), width=float(width), height=float(height))
                    )
                    detections.append(detection)
        
        # Apply Non-Maximum Suppression
        detections = self._apply_nms(detections)
        
        return detections
    
    def _apply_nms(self, detections: List[Detection]) -> List[Detection]:
        """Apply Non-Maximum Suppression to remove overlapping detections"""
        if not detections:
            return detections
        
        # Convert to format expected by cv2.dnn.NMSBoxes
        boxes = []
        scores = []
        class_ids = []
        
        for detection in detections:
            bbox = detection.bbox
            boxes.append([bbox.x, bbox.y, bbox.width, bbox.height])
            scores.append(detection.confidence)
            class_ids.append(detection.class_name)
        
        boxes = np.array(boxes, dtype=np.float32)
        scores = np.array(scores, dtype=np.float32)
        
        # Apply NMS
        indices = cv2.dnn.NMSBoxes(
            boxes.tolist(), 
            scores.tolist(), 
            self.confidence_threshold, 
            self.iou_threshold
        )
        
        if len(indices) > 0:
            indices = indices.flatten()
            return [detections[i] for i in indices]
        
        return []
    
    def detect(self, image: np.ndarray) -> List[Detection]:
        """Perform detection on an image"""
        if self.session is None:
            raise RuntimeError("Model not loaded")
        
        try:
            # Preprocess image
            preprocessed, scale, offsets = self.preprocess_image(image)
            
            # Run inference
            outputs = self.session.run(self.output_names, {self.input_name: preprocessed})
            
            # Postprocess outputs
            detections = self.postprocess_outputs(outputs, scale, offsets, image.shape[:2])
            
            return detections
            
        except Exception as e:
            logger.error(f"Detection failed: {str(e)}")
            raise RuntimeError(f"Detection failed: {str(e)}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "model_name": "YOLOv8 Sensitive Data Detector",
            "model_path": self.model_path,
            "confidence_threshold": self.confidence_threshold,
            "iou_threshold": self.iou_threshold,
            "supported_classes": list(self.class_names.values()),
            "input_shape": self.input_shape,
            "providers": self.session.get_providers() if self.session else []
        }
