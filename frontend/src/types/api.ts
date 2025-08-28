export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  class_name: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface ProcessingResult {
  original_filename: string;
  processed_filename: string;
  detections: Detection[];
  processing_time: number;
  timestamp: string;
  total_detections: number;
  face_count: number;
  plate_count: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  model_loaded: boolean;
}

export interface ModelInfo {
  model_name: string;
  model_path: string;
  confidence_threshold: number;
  iou_threshold: number;
  supported_classes: string[];
  model_size: string;
}

export interface ApiError {
  error: string;
  detail?: string;
  status_code: number;
}

export interface FileInfo {
  filename: string;
  size: number;
  created: string;
}

export interface FilesListResponse {
  files: FileInfo[];
  total: number;
}
