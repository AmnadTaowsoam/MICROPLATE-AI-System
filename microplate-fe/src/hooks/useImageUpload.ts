import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { imageService } from '../services/image.service'

export function useImageUpload() {
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null)

  const uploadMutation = useMutation({
    mutationFn: ({ file, sampleNo, submissionNo }: { 
      file: File
      sampleNo: string
      submissionNo?: string 
    }) => imageService.uploadImage(file, sampleNo, submissionNo),
    onSuccess: (data) => {
      if (data.imageId) {
        setUploadedImageId(data.imageId)
      }
    },
  })

  const predictionMutation = useMutation({
    mutationFn: ({ file, sampleNo, submissionNo }: { 
      file: File
      sampleNo: string
      submissionNo?: string 
    }) => imageService.uploadAndPredict(file, sampleNo, submissionNo),
    onSuccess: (data) => {
      if (data.data?.run_id) {
        setUploadedImageId(data.data.run_id.toString())
      }
    },
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
  }
}
