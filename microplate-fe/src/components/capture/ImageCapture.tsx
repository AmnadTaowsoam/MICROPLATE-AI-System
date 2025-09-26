import { useState } from 'react';
import { MdCameraAlt, MdCloudUpload, MdRefresh, MdPlayArrow } from 'react-icons/md';
import ImageUpload from './ImageUpload';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface ImageCaptureProps {
  selectedFile: File | null;
  capturedImageUrl: string | null;
  onImageSelect: (file: File) => void;
  onCapture: () => void;
  onReset: () => void;
  onRunPrediction: () => void;
  isPredicting: boolean;
  predictionError?: Error | null;
  sampleNo: string;
  submissionNo: string;
  canRunPrediction?: boolean;
}

export default function ImageCapture({
  selectedFile,
  capturedImageUrl,
  onImageSelect,
  onCapture,
  onReset,
  onRunPrediction,
  isPredicting,
  predictionError,
  sampleNo,
  submissionNo,
  canRunPrediction = false
}: ImageCaptureProps) {
  return (
    <div className="col-span-12 md:col-span-6 xl:col-span-8">
      <Card className="p-6 h-full">
        <div className="h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg mb-6">
            {selectedFile || capturedImageUrl ? (
              <div className="text-center">
                <img 
                  src={capturedImageUrl || URL.createObjectURL(selectedFile!)} 
                  alt="Selected" 
                  className="max-h-96 max-w-full object-contain rounded-lg"
                />
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
              onImageSelect={onImageSelect}
              onRunPrediction={onRunPrediction}
              canRunPrediction={canRunPrediction}
              isPredicting={isPredicting}
              sampleNo={sampleNo}
            />
            <Button 
              variant="outline" 
              onClick={onCapture}
              className="flex items-center gap-2"
            >
              <MdCameraAlt className="h-4 w-4" />
              Capture
            </Button>
            <Button 
              variant="outline" 
              onClick={onReset}
              className="flex items-center gap-2"
            >
              <MdRefresh className="h-4 w-4" />
              Reset
            </Button>
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
