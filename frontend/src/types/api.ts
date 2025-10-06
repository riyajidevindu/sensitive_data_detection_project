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
  blur_parameters: BlurParameters;
  session_id?: string;
}

export interface BlurParameters {
  min_kernel_size: number;
  max_kernel_size: number;
  blur_focus_exp: number;
  blur_base_weight: number;
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
  session_id?: string;
}

export interface SessionInfo {
  session_id: string;
  created_at: string;
  last_accessed?: string;
  file_count?: number;
  timeout_hours?: number;
}

export interface SessionCreateResponse {
  session_id: string;
  created_at: string;
  timeout_hours: number;
  message: string;
}
