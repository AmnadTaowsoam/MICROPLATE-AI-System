import { resultsApi } from './api';
import { authService } from './auth.service';
import type { ApiResponse } from './api';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return authService.loadTokenFromStorage();
};

// Types
export interface InferenceResult {
  id: number;
  runId: number;
  results: {
    distribution: Record<string, number>;
    concentration?: {
      positive_percentage: number;
      negative_percentage: number;
    };
    quality_metrics?: {
      image_quality_score: number;
      well_detection_accuracy: number;
      overall_confidence: number;
    };
  };
  createdAt: string;
}

export interface SampleSummary {
  sampleNo: string;
  summary: {
    distribution: Record<string, number>;
    concentration?: {
      positive_percentage: number;
      negative_percentage: number;
    };
    quality_metrics?: {
      average_confidence: number;
      high_confidence_percentage: number;
    };
  };
  totalRuns: number;
  lastRunAt: Date | null;
  lastRunId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionRunSummary {
  runId: number;
  sampleNo?: string; // เพิ่ม sampleNo field
  predictAt: string;
  modelVersion?: string;
  status: string;
  processingTimeMs?: number;
  statistics: {
    totalDetections: number;
    positiveCount: number;
    negativeCount: number;
    averageConfidence: number;
  };
  inferenceResults: InferenceResult[];
  wellPredictions: any[];
  // เพิ่มข้อมูลรูปภาพ
  rawImagePath?: string;
  annotatedImagePath?: string;
}

export interface SampleSummary {
  sampleNo: string;
  summary: {
    distribution: Record<string, number>;
    concentration: {
      positive_percentage: number;
      negative_percentage: number;
    };
    quality_metrics: {
      image_quality_score: number;
      well_detection_accuracy: number;
      overall_confidence: number;
    };
  };
  totalRuns: number;
  lastRunAt: string;
  lastRunId: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Direct Results Service - ใช้ API endpoints ใหม่ที่ดึงข้อมูลตรงจาก database
export const resultsServiceDirect = {
  // Sample Operations
  async getSampleSummary(sampleNo: string): Promise<SampleSummary> {
    console.log('resultsServiceDirect: Getting sample summary for:', sampleNo);
    const token = getAuthToken();
    if (token) {
      resultsApi.setAccessToken(token);
    }
    
    try {
      const result = await resultsApi.get<SampleSummary>(`/api/v1/results/direct/samples/${sampleNo}/summary`);
      console.log('resultsServiceDirect: Sample summary response:', result);
      return result;
    } catch (error) {
      console.error('resultsServiceDirect: Failed to get sample summary:', error);
      throw error;
    }
  },

  async getSampleRuns(
    sampleNo: string, 
    options: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<PaginatedResult<PredictionRunSummary>> {
    console.log('resultsServiceDirect: Getting sample runs for:', sampleNo, options);
    const token = getAuthToken();
    if (token) {
      resultsApi.setAccessToken(token);
    }
    
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const result = await resultsApi.get<PaginatedResult<PredictionRunSummary>>(
        `/api/v1/results/direct/samples/${sampleNo}/runs?${params.toString()}`
      );
      console.log('resultsServiceDirect: Sample runs response:', result);
      return result;
    } catch (error) {
      console.error('resultsServiceDirect: Failed to get sample runs:', error);
      throw error;
    }
  },

  // Run Operations
  async getRunDetails(runId: number): Promise<any> {
    console.log('resultsServiceDirect: Getting run details for:', runId);
    const token = getAuthToken();
    if (token) {
      resultsApi.setAccessToken(token);
    }
    
    try {
      const result = await resultsApi.get<any>(`/api/v1/results/direct/runs/${runId}`);
      console.log('resultsServiceDirect: Run details response:', result);
      return result;
    } catch (error) {
      console.error('resultsServiceDirect: Failed to get run details:', error);
      throw error;
    }
  },

  // Helper method to extract inference results from run data
  extractInferenceResults(run: PredictionRunSummary): InferenceResult[] {
    return run.inferenceResults || [];
  },

  // Helper method to get distribution from inference results
  getDistributionFromInferenceResults(inferenceResults: InferenceResult[]): Record<string, number> {
    if (!inferenceResults || inferenceResults.length === 0) {
      return {};
    }
    
    // Use the first inference result's distribution
    return inferenceResults[0].results.distribution || {};
  },

  // Helper method to generate MinIO URLs
  getMinioImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    
    // ถ้า imagePath เป็น URL เต็มแล้ว ให้แปลงเป็น direct MinIO API URL
    if (imagePath.startsWith('http')) {
      // แปลง Docker internal URL เป็น localhost URL และลบ signed URL parameters
      let baseUrl = imagePath.replace('http://minio:9000', 'http://localhost:9000');
      baseUrl = baseUrl.split('?')[0]; // ลบ query parameters
      
      // ใช้ direct MinIO API URL (ไม่ต้องผ่าน Console)
      // จาก: http://localhost:9000/annotated-images/TEST005/10/image.jpg
      // เป็น: http://localhost:9000/annotated-images/TEST005/10/image.jpg (direct access)
      return baseUrl;
    }
    
    // ถ้าเป็น path ธรรมดา ให้สร้าง direct MinIO URL
    const minioBaseUrl = import.meta.env.VITE_MINIO_BASE_URL || 'http://localhost:9000';
    return `${minioBaseUrl}/${imagePath}`;
  },

  // Helper method to get raw image URL
  getRawImageUrl(run: PredictionRunSummary): string {
    return this.getMinioImageUrl(run.rawImagePath || '');
  },

  // Helper method to get annotated image URL
  getAnnotatedImageUrl(run: PredictionRunSummary): string {
    return this.getMinioImageUrl(run.annotatedImagePath || '');
  },

  // Get all samples
  async getSamples(): Promise<ApiResponse<SampleSummary[]>> {
    try {
      const result = await resultsApi.get<SampleSummary[]>('/api/v1/results/direct/samples');
      console.log('resultsServiceDirect: Samples response:', result);
      return result;
    } catch (error) {
      console.error('resultsServiceDirect: Failed to get samples:', error);
      throw error;
    }
  }
};
