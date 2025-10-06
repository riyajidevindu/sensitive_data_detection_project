import axios, { AxiosResponse } from 'axios';
import { ProcessingResult, HealthResponse, ModelInfo, FilesListResponse, SessionInfo, SessionCreateResponse } from '../types/api';
import { SessionService } from './sessionService';

// Determine API base URL: prefer explicit env, else same-origin (for unified container), else localhost fallback.
const API_BASE_URL = (() => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (typeof window !== 'undefined') {
    return window.location.origin; // same-origin deployment (fullstack container)
  }
  return 'http://localhost:8000';
})();

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 60000, // 60 seconds timeout for file uploads
});

// Add request interceptor for logging and session management
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
    
    // Add session ID to headers if available
    const sessionId = SessionService.getSessionId();
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and session management
apiClient.interceptors.response.use(
  (response) => {
    // Store session ID from response if present
    if (response.data?.session_id) {
      SessionService.setSessionId(response.data.session_id);
    }
    return response;
  },
  (error) => {
    // Handle session expiration
    if (error.response?.status === 401 && error.response?.data?.detail?.includes('session')) {
      console.warn('Session expired or invalid, clearing local session');
      SessionService.clearSession();
    }
    console.error('Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface DetectionOptions {
  blurFaces?: boolean;
  blurPlates?: boolean;
  minKernel?: number;
  maxKernel?: number;
  focusExponent?: number;
  baseWeight?: number;
}

export class ApiService {
  static async detectSensitiveData(
    file: File,
    options: DetectionOptions = {}
  ): Promise<ProcessingResult> {
    const {
      blurFaces = true,
      blurPlates = true,
      minKernel,
      maxKernel,
      focusExponent,
      baseWeight,
    } = options;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('blur_faces', blurFaces.toString());
    formData.append('blur_plates', blurPlates.toString());

    if (minKernel !== undefined) {
      formData.append('min_kernel_size', minKernel.toString());
    }
    if (maxKernel !== undefined) {
      formData.append('max_kernel_size', maxKernel.toString());
    }
    if (focusExponent !== undefined) {
      formData.append('blur_focus_exp', focusExponent.toString());
    }
    if (baseWeight !== undefined) {
      formData.append('blur_base_weight', baseWeight.toString());
    }

    const response: AxiosResponse<ProcessingResult> = await apiClient.post(
      '/detect',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  static async getHealth(): Promise<HealthResponse> {
    const response: AxiosResponse<HealthResponse> = await apiClient.get('/health');
    return response.data;
  }

  static async getModelInfo(): Promise<ModelInfo> {
    const response: AxiosResponse<ModelInfo> = await apiClient.get('/models/info');
    return response.data;
  }

  static async getOutputFiles(): Promise<FilesListResponse> {
    const response: AxiosResponse<FilesListResponse> = await apiClient.get('/outputs');
    return response.data;
  }

  static async deleteOutputFile(filename: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/outputs/${filename}`);
    return response.data;
  }

  static getDownloadUrl(filename: string, cacheBust?: string | number): string {
    const sessionId = SessionService.getSessionId();
    const base = `${API_BASE_URL}/api/v1/download/${filename}`;
    
    // Build query params
    const params = new URLSearchParams();
    if (sessionId) {
      params.append('session_id', sessionId);
    }
    if (cacheBust !== undefined && cacheBust !== null) {
      params.append('v', String(cacheBust));
    }
    
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  }

  static getOutputImageUrl(filename: string): string {
    // Use download endpoint with session ID as query parameter
    const sessionId = SessionService.getSessionId();
    if (sessionId) {
      return `${API_BASE_URL}/api/v1/download/${filename}?session_id=${sessionId}`;
    }
    // Fallback to direct access (backward compatibility)
    return `${API_BASE_URL}/outputs/${filename}`;
  }

  // Selective Blur API methods
  static async uploadReferenceFace(file: File): Promise<{ message: string; encoding_shape: number[]; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/selective-blur/reference', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  static async applySelectiveBlur(
    file: File,
    tolerance: number = 0.75,
    blurKernel: number = 51
  ): Promise<ProcessingResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tolerance', tolerance.toString());
    formData.append('blur_kernel', blurKernel.toString());

    const response: AxiosResponse<ProcessingResult> = await apiClient.post(
      '/selective-blur/selective-blur',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  static async getReferenceStatus(): Promise<{ 
    has_reference: boolean; 
    uploaded_at?: number; 
    encoding_file_size?: number; 
  }> {
    const response = await apiClient.get('/selective-blur/reference/status');
    return response.data;
  }

  static async clearReferenceFace(): Promise<{ message: string }> {
    const response = await apiClient.delete('/selective-blur/reference');
    return response.data;
  }

  // Session Management API methods
  static async createSession(): Promise<SessionCreateResponse> {
    const response: AxiosResponse<SessionCreateResponse> = await apiClient.post('/session/create');
    // Store the session ID automatically
    if (response.data.session_id) {
      SessionService.setSessionId(response.data.session_id);
    }
    return response.data;
  }

  static async getSessionInfo(): Promise<SessionInfo> {
    const response: AxiosResponse<SessionInfo> = await apiClient.get('/session/info');
    return response.data;
  }

  static async deleteSession(): Promise<{ message: string; session_id: string }> {
    const response = await apiClient.delete('/session/delete');
    // Clear local session storage
    SessionService.clearSession();
    return response.data;
  }

  /**
   * Ensure user has a valid session, create if needed
   */
  static async ensureSession(): Promise<string> {
    const existingSession = SessionService.getSessionId();
    
    if (existingSession) {
      try {
        // Validate existing session
        await this.getSessionInfo();
        return existingSession;
      } catch (error) {
        console.warn('Existing session invalid, creating new one');
        SessionService.clearSession();
      }
    }
    
    // Create new session
    const response = await this.createSession();
    return response.session_id;
  }
}

export default ApiService;
