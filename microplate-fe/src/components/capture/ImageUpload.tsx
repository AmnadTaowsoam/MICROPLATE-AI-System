import { useRef, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { FolderOpenIcon, CameraIcon, ArrowPathIcon, PlayCircleIcon } from '@heroicons/react/24/outline'
import { useCapture } from '../../hooks/useCapture'
import CameraStatus from './CameraStatus'

type Props = {
  onSelect: (file: File) => void
  onCaptured?: (url: string) => void
  className?: string
  sampleNo?: string
  submissionNo?: string
  description?: string
  disabled?: boolean
  onRunPrediction?: () => void
  onReset?: () => void
  canRunPrediction?: boolean
  isPredicting?: boolean
  actionText?: string
  annotatedImageUrl?: string | null
}

export default function ImageUpload({ 
  onSelect, 
  onCaptured, 
  className, 
  sampleNo, 
  submissionNo, 
  description, 
  disabled, 
  onRunPrediction, 
  onReset, 
  canRunPrediction, 
  isPredicting, 
  actionText, 
  annotatedImageUrl 
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  
  // ใช้ capture hook
  const {
    isCapturing,
    captureStatus,
    error: captureError,
    isConnected: isServiceConnected,
    captureImage,
    clearError,
    checkConnection
  } = useCapture({
    onSuccess: (response) => {
      console.log('✅ Capture successful:', response);
      // แสดงผลทันทีในการ์ดด้วย preview และส่งขึ้น parent
      if (response?.imageUrl) {
        // เพิ่ม cache-buster เพื่อบังคับโหลดใหม่ในบางเบราว์เซอร์
        const bustUrl = `${response.imageUrl}${response.imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
        setPreview(bustUrl);
        if (onCaptured) {
          onCaptured(bustUrl)
        }
      }
    },
    onError: (error) => {
      console.error('❌ Capture failed:', error);
    }
  });
  
  console.log('ImageUpload render - annotatedImageUrl:', annotatedImageUrl);
  console.log('ImageUpload render - preview:', preview);

  const handleChoose = () => inputRef.current?.click()

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    onSelect(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
    // preview only; parent will upload
  }
  
  // upload handled by parent when file chosen; no separate button

  const handleCapture = async () => {
    if (disabled) {
      return;
    }
    
    try {
      // ใช้ข้อมูลที่มี หรือใช้ค่า default
      const captureData = {
        sampleNo: sampleNo || 'UNKNOWN',
        submissionNo: submissionNo || 'UNKNOWN',
        description: description || 'Captured image'
      };
      
      console.log('🎥 Starting capture with data:', captureData);
      
      await captureImage(captureData);
      // เมื่อ capture สำเร็จ hook จะตั้งค่า capturedImageUrl ให้เอง
      // เราจะดึงจาก hook แล้วแจ้ง parent เพื่อแสดงทันที
      setTimeout(() => {
        if (onCaptured && captureStatus.status === 'success') {
          // ใช้ล่าสุดจาก hook ถ้ามี
          // หมายเหตุ: useCapture ไม่ expose url ตรงๆ ในที่นี้ parent จะฟังผ่าน onCaptured จาก capture.service
        }
      }, 0);
      
    } catch (err) {
      console.error('❌ Capture failed:', err);
    }
  }

  const handleResetClick = () => {
    onReset?.()
    setPreview(null)
  }

  return (
    <Card className={`p-0 overflow-hidden ${className || ''}`}>
      <div className="bg-gray-50 dark:bg-gray-700 flex items-center justify-center" style={{ height: '640px' }}>
        {annotatedImageUrl || preview ? (
          <img 
            src={annotatedImageUrl || preview || undefined} 
            alt={annotatedImageUrl ? "Annotated Result" : "Original Image"} 
            className="w-full h-full object-contain"
            onLoad={() => {
              const currentSrc = annotatedImageUrl || preview;
              console.log('ImageUpload: Image loaded successfully:', currentSrc);
              console.log('ImageUpload: Is annotated image?', !!annotatedImageUrl);
            }}
            onError={(e) => {
              console.error('ImageUpload: Image failed to load:', e.currentTarget.src);
              console.error('ImageUpload: Annotated URL:', annotatedImageUrl);
              console.error('ImageUpload: Preview URL:', preview);
            }}
          />)
          : (<div className="text-gray-400 dark:text-gray-500 text-sm">No image selected</div>)}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </div>
      <div className="flex flex-col items-center py-4">
        {/* Capture Status */}
        {isCapturing && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">
                {captureStatus.message || 'กำลังถ่ายภาพ...'}
              </span>
            </div>
            {captureStatus.progress && (
              <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${captureStatus.progress}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {/* Capture Error */}
        {captureError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <span className="text-sm font-medium">❌ {captureError}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleChoose} className="border-gray-500 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
            <FolderOpenIcon className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCapture} 
            disabled={!!disabled || isCapturing} 
            className="border-gray-500 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            {isCapturing ? 'Capturing...' : 'Capture'}
          </Button>
          
          {/* Camera Status */}
          <CameraStatus
            isConnected={isServiceConnected}
            isCapturing={isCapturing}
            error={captureError}
            onCheckConnection={checkConnection}
            className="ml-4"
          />
          {onReset && (
            <Button 
              variant="outline" 
              onClick={handleResetClick} 
              disabled={!preview}
              title={!preview ? 'Nothing to reset' : 'Clear current image and inputs'}
              className="border-gray-500 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          {onRunPrediction && (
            <Button 
              variant="primary"
              onClick={onRunPrediction} 
              disabled={isPredicting || !canRunPrediction}
              title={isPredicting ? 'Prediction is running' : (!sampleNo ? 'Please enter Sample Number' : (!canRunPrediction ? 'Please upload or capture an image first' : undefined))}
              className={`flex items-center gap-2 ${
                (isPredicting || !canRunPrediction) 
                  ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <PlayCircleIcon className="h-4 w-4" />
              {isPredicting ? 'Running...' : 'Run Prediction'}
            </Button>
          )}
        </div>
        {actionText && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center px-4">{actionText}</div>
        )}
      </div>
    </Card>
  )
}


