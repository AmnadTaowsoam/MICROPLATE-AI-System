import { MdCameraAlt, MdRefresh } from 'react-icons/md';
import ImageUpload from './ImageUpload';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface ImageCaptureProps {
  selectedFile: File | null;
  capturedImageUrl: string | null;
  annotatedImageUrl?: string | null;
  onImageSelect: (file: File) => void;
  onCapture: (url: string) => void;
  onReset: () => void;
  onRunPrediction: () => void;
  isPredicting: boolean;
  predictionError?: Error | null;
  sampleNo: string;
  submissionNo?: string;
  description?: string;
  canRunPrediction?: boolean;
}

export default function ImageCapture({
  selectedFile,
  capturedImageUrl,
  annotatedImageUrl,
  onImageSelect,
  onCapture,
  onReset,
  onRunPrediction,
  isPredicting,
  predictionError,
  sampleNo,
  submissionNo,
  description,
  canRunPrediction = false
}: ImageCaptureProps) {
  console.log('ImageCapture render - annotatedImageUrl:', annotatedImageUrl);
  console.log('ImageCapture render - capturedImageUrl:', capturedImageUrl);
  console.log('ImageCapture render - selectedFile:', selectedFile?.name);
  
  return (
    <div className="col-span-12 md:col-span-6 xl:col-span-8">
      <Card className="p-6 h-full">
        <div className="h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg mb-6">
            {selectedFile || capturedImageUrl || annotatedImageUrl ? (
              <div className="text-center">
                <img 
                  src={annotatedImageUrl || capturedImageUrl || URL.createObjectURL(selectedFile!)} 
                  alt={annotatedImageUrl ? "Annotated Result" : "Original Image"} 
                  className="max-h-96 max-w-full object-contain rounded-lg"
                  onLoad={() => {
                    const currentSrc = annotatedImageUrl || capturedImageUrl || URL.createObjectURL(selectedFile!);
                    console.log('Image loaded successfully:', currentSrc);
                    console.log('Is annotated image?', !!annotatedImageUrl);
                  }}
                  onError={(e) => {
                    console.error('Image failed to load:', e.currentTarget.src);
                    console.error('Annotated URL:', annotatedImageUrl);
                    console.error('Captured URL:', capturedImageUrl);
                  }}
                />
                {annotatedImageUrl ? (
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                    ✓ Prediction Complete - Showing Annotated Result
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                    📸 Image Ready for Prediction
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p className="text-lg">No image selected</p>
                <p className="text-sm mt-2">Upload or capture an image to enable prediction</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center">
            <ImageUpload 
              onSelect={onImageSelect}
              onCaptured={onCapture}
              onRunPrediction={onRunPrediction}
              onReset={onReset}
              canRunPrediction={canRunPrediction}
              isPredicting={isPredicting}
              sampleNo={sampleNo}
              submissionNo={submissionNo}
              description={description}
            />
          </div>
          
          {predictionError && (
            <div className="text-red-500 text-sm mt-4 text-center">
              Prediction failed: {predictionError.message}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
