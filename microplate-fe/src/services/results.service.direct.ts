import { resultsApi } from './api';
import { authService } from './auth.service';

// Define ApiResponse type locally since it's not exported from api module
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

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
  async getRunDetails(runId: number): Promise<unknown> {
    console.log('resultsServiceDirect: Getting run details for:', runId);
    const token = getAuthToken();
    if (token) {
      resultsApi.setAccessToken(token);
    }
    
    try {
      const result = await resultsApi.get<unknown>(`/api/v1/results/direct/runs/${runId}`);
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

  // Generate signed URL for an image
  async getSignedImageUrl(imagePath: string, isAnnotated: boolean = false): Promise<string> {
    if (!imagePath) {
      throw new Error('Image path is required');
    }

    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      const bucket = isAnnotated ? 'annotated-images' : 'raw-images';
      
      // Extract object key from path
      // imagePath can be either:
      // 1. A full URL: "http://minio:9000/annotated-images/TEST006/14/file.jpg"
      // 2. Just a path: "TEST006/14/file.jpg"
      let objectKey = imagePath;
      
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // Extract object key from full URL
        // Remove protocol, domain, port, and bucket name
        const urlParts = imagePath.split('/');
        const bucketIndex = urlParts.findIndex(part => part === bucket);
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          objectKey = urlParts.slice(bucketIndex + 1).join('/');
        } else {
          // Fallback: take everything after the domain/port
          const afterDomain = imagePath.split('/').slice(3); // Remove http://, domain:port
          // Skip bucket name if present
          if (afterDomain[0] === bucket || afterDomain[0] === 'raw-images' || afterDomain[0] === 'annotated-images') {
            objectKey = afterDomain.slice(1).join('/');
          } else {
            objectKey = afterDomain.join('/');
          }
        }
      }
      
      // Remove query parameters if any
      objectKey = objectKey.split('?')[0];
      
      console.log('Generating signed URL for:', { bucket, objectKey, originalPath: imagePath });
      
      // Call image-ingestion-service to generate signed URL
      const imageServiceBaseUrl = import.meta.env.VITE_IMAGE_SERVICE_URL || 'http://localhost:6402';
      
      const response = await fetch(`${imageServiceBaseUrl}/api/v1/signed-urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bucket,
          objectKey
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate signed URL: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.data?.signedUrl) {
        throw new Error('Invalid response from signed URL service');
      }

      return result.data.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  },

  // Get all samples
  async getSamples(): Promise<ApiResponse<SampleSummary[]>> {
    try {
      console.log('🔍 Using resultsApi for getSamples - result-api-service gets data from prediction_result.sample_summary');
      const result = await resultsApi.get<SampleSummary[]>('/api/v1/results/direct/samples');
      console.log('resultsServiceDirect: Samples response:', result);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('resultsServiceDirect: Failed to get samples:', error);
      throw error;
    }
  },

  // Delete a run
  async deleteRun(runId: number): Promise<boolean> {
    console.log('resultsServiceDirect: Deleting run:', runId);
    const token = getAuthToken();
    if (token) {
      resultsApi.setAccessToken(token);
    }
    
    try {
      await resultsApi.delete(`/api/v1/results/direct/runs/${runId}`);
      console.log('resultsServiceDirect: Run deleted successfully');
      return true;
    } catch (error) {
      console.error('resultsServiceDirect: Failed to delete run:', error);
      throw error;
    }
  }
};
