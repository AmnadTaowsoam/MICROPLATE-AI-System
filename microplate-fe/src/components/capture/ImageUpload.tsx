import { useRef, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { FolderOpenIcon, CameraIcon, ArrowPathIcon, PlayCircleIcon } from '@heroicons/react/24/outline'
import { imageService } from '../../services/image.service'

type Props = {
  onSelect: (file: File) => void
  onCaptured?: (url: string) => void
  className?: string
  sampleNo?: string
  disabled?: boolean
  onRunPrediction?: () => void
  onReset?: () => void
  canRunPrediction?: boolean
  isPredicting?: boolean
  actionText?: string
}

export default function ImageUpload({ onSelect, onCaptured, className, sampleNo, disabled, onRunPrediction, onReset, canRunPrediction, isPredicting, actionText }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  // Keep only preview; parent manages upload state
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (disabled) return
    try {
      setIsCapturing(true)
      const res = await imageService.captureImage(sampleNo)
      if (res.imageUrl) {
        setPreview(res.imageUrl)
        onCaptured?.(res.imageUrl)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Capture failed'
      setError(message)
    } finally {
      setIsCapturing(false)
    }
  }

  const handleResetClick = () => {
    onReset?.()
    setPreview(null)
  }

  return (
    <Card className={`p-0 overflow-hidden ${className || ''}`}>
      <div className="bg-gray-50 dark:bg-gray-700 flex items-center justify-center" style={{ height: '640px' }}>
        {preview ? (
          <img src={preview} alt="preview" className="w-full h-full object-contain" />)
          : (<div className="text-gray-400 dark:text-gray-500 text-sm">No image selected</div>)}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </div>
      <div className="flex flex-col items-center py-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleChoose} className="border-gray-500 text-gray-900">
            <FolderOpenIcon className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
          <Button variant="outline" onClick={handleCapture} disabled={!!disabled || isCapturing} className="border-gray-500 text-gray-900">
            <CameraIcon className="h-4 w-4 mr-2" />
            {isCapturing ? 'Capturing...' : 'Capture'}
          </Button>
          {onReset && (
            <Button 
              variant="outline" 
              onClick={handleResetClick} 
              disabled={!preview}
              title={!preview ? 'Nothing to reset' : 'Clear current image and inputs'}
              className="border-gray-500 text-gray-900"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          {onRunPrediction && (
            <Button 
              onClick={onRunPrediction} 
              disabled={isPredicting || !canRunPrediction}
              title={isPredicting ? 'Prediction is running' : (!sampleNo ? 'Please enter Sample Number' : (!canRunPrediction ? 'Please upload or capture an image first' : undefined))}
              className={(isPredicting || !canRunPrediction) ? 'bg-gray-300 text-white cursor-not-allowed' : ''}
            >
              <PlayCircleIcon className="h-4 w-4 mr-2" />
              {isPredicting ? 'Running...' : 'Run Prediction'}
            </Button>
          )}
        </div>
        {actionText && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center px-4">{actionText}</div>
        )}
      </div>
      {error && <div className="p-3 text-sm text-red-500">{error}</div>}
    </Card>
  )
}


