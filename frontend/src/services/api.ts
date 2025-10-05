import axios, { AxiosResponse } from 'axios';
import { ProcessingResult, HealthResponse, ModelInfo, FilesListResponse } from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 60000, // 60 seconds timeout for file uploads
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
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
    const base = `${API_BASE_URL}/api/v1/download/${filename}`;
    if (cacheBust === undefined || cacheBust === null) {
      return base;
    }

    const formatted = encodeURIComponent(String(cacheBust));
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}v=${formatted}`;
  }

  static getOutputImageUrl(filename: string): string {
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
}

export default ApiService;
