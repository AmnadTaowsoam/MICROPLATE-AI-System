import { imageApi, visionApi } from './api'

export type ImageUploadResponse = {
  success: boolean
  message: string
  imageId?: string
  imageUrl?: string
}

export type PredictionRequest = {
  sampleNo: string
  submissionNo?: string
  imageId?: string
  imageUrl?: string
}

export type GridMetadata = {
  bounds?: {
    left: number
    right: number
    top: number
    bottom: number
  }
  columns?: number[]
  rows?: number[]
  original_size?: [number, number]
}

export type PredictionResponse = {
  success: boolean
  data?: {
    run_id: number
    sample_no: string
    submission_no?: string
    predict_at?: string
    model_version: string
    status: 'completed' | 'failed' | 'pending' | 'processing'
    processing_time_ms: number
    annotated_image_url: string
    statistics: {
      total_detections: number
      wells_analyzed: number
      average_confidence: number
    }
    well_predictions: Array<{
      wellId: string
      label: string
      class: string
      confidence: number
      bbox: any
    }>
    row_counts: any
    inference_results: {
      distribution: any
    }
    grid_metadata?: GridMetadata
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

export type CaptureResponse = {
  success: boolean
  message: string
  imageUrl?: string
}

export const imageService = {
  // Upload image to image-ingestion-service directly
  async uploadImage(file: File, sampleNo: string, submissionNo?: string, description?: string): Promise<ImageUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sample_no', sampleNo)
    if (submissionNo) {
      formData.append('submission_no', submissionNo)
    }
    if (description) {
      formData.append('description', description)
    }
    formData.append('file_type', 'raw')

    return imageApi.postFormData<ImageUploadResponse>('/api/v1/images', formData)
  },

  // Run prediction via vision-inference-service directly
  async runPrediction(): Promise<PredictionResponse> {
    // For prediction, we need to send the image file directly to vision-inference-service
    // This should be called after image upload, but we need the file to send to prediction endpoint
    throw new Error('runPrediction should be called with file upload directly to vision-inference-service')
  },

  // Upload image and run prediction in one call to vision-inference-service
  async uploadAndPredict(file: File, sampleNo: string, submissionNo?: string, description?: string): Promise<PredictionResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sample_no', sampleNo)
    if (submissionNo) {
      formData.append('submission_no', submissionNo)
    }
    if (description) {
      formData.append('description', description)
    }

    return visionApi.postFormData<PredictionResponse>('/api/v1/inference/predict', formData)
  },

  // Trigger camera capture via vision-capture-service (if available)
  async captureImage(sampleNo?: string): Promise<CaptureResponse> {
    // Optional: include sampleNo to tag capture session if backend supports it
    return visionApi.post<CaptureResponse>('/api/v1/capture/snap', sampleNo ? { sampleNo } : undefined)
  }
}
