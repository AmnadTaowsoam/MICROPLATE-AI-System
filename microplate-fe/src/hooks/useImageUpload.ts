import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { imageService } from '../services/image.service'
import logger from '../utils/logger'

export function useImageUpload() {
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null)

  const uploadMutation = useMutation({
    mutationFn: ({ file, sampleNo, submissionNo, description }: { 
      file: File
      sampleNo: string
      submissionNo?: string
      description?: string
    }) => imageService.uploadImage(file, sampleNo, submissionNo, description),
    onSuccess: (data) => {
      if (data.imageId) {
        setUploadedImageId(data.imageId)
      }
    },
    onError: (error) => {
      logger.error('Upload failed:', error)
    }
  })

  const predictionMutation = useMutation({
    mutationFn: ({ file, sampleNo, submissionNo, description }: { 
      file: File
      sampleNo: string
      submissionNo?: string
      description?: string
    }) => imageService.uploadAndPredict(file, sampleNo, submissionNo, description),
    onSuccess: (data) => {
      if (data.data?.run_id) {
        setUploadedImageId(data.data.run_id.toString())
      }
      logger.info('Prediction completed:', data)
    },
    onError: (error) => {
      logger.error('Prediction failed:', error)
    }
  })

  return {
    uploadedImageId,
    uploadImage: uploadMutation.mutate,
    runPrediction: predictionMutation.mutate,
    isUploading: uploadMutation.isPending,
    isPredicting: predictionMutation.isPending,
    uploadError: uploadMutation.error,
    predictionError: predictionMutation.error,
    uploadSuccess: uploadMutation.isSuccess,
    predictionSuccess: predictionMutation.isSuccess,
    predictionData: predictionMutation.data,
    // Additional state for better control
    isUploadingPending: uploadMutation.isPending,
    isPredictionPending: predictionMutation.isPending,
  }
}
