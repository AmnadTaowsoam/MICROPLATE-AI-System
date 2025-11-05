import React, { useState } from 'react';
import { useImageUpload } from '../hooks/useImageUpload';
import { useWebSocketLogs } from '../hooks/useWebSocketLogs';
import { useCapture } from '../hooks/useCapture';
import SampleInformation from '../components/capture/SampleInformation';
import ImageCapture from '../components/capture/ImageCapture';
import PredictionResults from '../components/capture/PredictionResults';
import SystemLogs from '../components/capture/SystemLogs';
// LiveStream is now embedded inside ImageCapture when no image selected

export default function CapturePage() {
  const [sampleNo, setSampleNo] = useState('');
  const [submissionNo, setSubmissionNo] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeSampleNo, setActiveSampleNo] = useState('');
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  
  logger.debug('CapturePage rendered with description:', description);
  
  const { 
    uploadImage, 
    runPrediction, 
    isPredicting, 
    uploadError, 
    predictionError,
    predictionData 
  } = useImageUpload();

  // Camera capture hook
  const {
    isConnected: isCameraConnected,
    isCapturing: isCameraCapturing,
    error: cameraError,
    checkConnection: checkCameraConnection
  } = useCapture();

  // Update annotated image URL when prediction completes
  React.useEffect(() => {
    logger.debug('Prediction data changed:', predictionData);
    if (predictionData?.data?.annotated_image_url) {
      let imageUrl = predictionData.data.annotated_image_url;
      logger.debug('Raw annotated image URL:', imageUrl);
      
      // If it's a MinIO URL, convert to accessible URL
      if (imageUrl.includes('minio:9000')) {
        // Replace minio:9000 with localhost:9000 for frontend access
        imageUrl = imageUrl.replace('minio:9000', 'localhost:9000');
        logger.debug('Converted MinIO URL for frontend access:', imageUrl);
        
        // Test the URL accessibility
        fetch(imageUrl, { method: 'HEAD' })
          .then(response => {
            logger.debug('URL accessibility test:', response.status, response.statusText);
            if (response.ok) {
              logger.debug('✅ URL is accessible');
            } else {
              logger.warn('❌ URL is not accessible:', response.status);
            }
          })
          .catch(error => {
            logger.error('❌ URL test failed:', error);
          });
      }
      // If it's a relative URL, make it absolute
      else if (imageUrl.startsWith('/')) {
        const visionServiceUrl = process.env.VITE_VISION_SERVICE_URL || 'http://localhost:6403';
        imageUrl = `${visionServiceUrl}${imageUrl}`;
        logger.debug('Converted to absolute URL:', imageUrl);
      }
      
      logger.debug('Setting annotated image URL:', imageUrl);
      setAnnotatedImageUrl(imageUrl);
    } else {
      logger.debug('No annotated_image_url found in prediction data');
    }
  }, [predictionData]);

  // Cleanup object URL on unmount
  React.useEffect(() => {
    return () => {
      if (capturedImageUrl && capturedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(capturedImageUrl);
      }
    };
  }, [capturedImageUrl]);
  
  const { logs } = useWebSocketLogs();

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
    // Create URL for preview immediately
    setCapturedImageUrl(URL.createObjectURL(file));
    if (sampleNo) {
      uploadImage({ file, sampleNo, submissionNo: submissionNo || undefined, description: description || undefined });
    }
  };

  const handleRunPrediction = () => {
    if (selectedFile && sampleNo) {
      runPrediction({ 
        file: selectedFile,
        sampleNo, 
        submissionNo: submissionNo || undefined,
        description: description || undefined
      });
    }
  };

  const handleReset = () => {
    setSampleNo('');
    setSubmissionNo('');
    setDescription('');
    setSelectedFile(null);
    // Clean up object URL to prevent memory leaks
    if (capturedImageUrl && capturedImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(capturedImageUrl);
    }
    setCapturedImageUrl(null);
    setAnnotatedImageUrl(null);
  };

  const handleSampleEnter = (sampleNo: string) => {
    setActiveSampleNo(sampleNo);
  };

  return (
    <div className="grid grid-cols-12 gap-4 lg:gap-6 xl:gap-8">
      <SampleInformation
        sampleNo={sampleNo}
        setSampleNo={setSampleNo}
        submissionNo={submissionNo}
        setSubmissionNo={setSubmissionNo}
        description={description}
        setDescription={setDescription}
        onSampleEnter={handleSampleEnter}
        uploadError={uploadError}
      />
      
      <ImageCapture
        selectedFile={selectedFile}
        capturedImageUrl={capturedImageUrl}
        annotatedImageUrl={annotatedImageUrl}
        onImageSelect={handleImageSelect}
        onCapture={(url) => {
          logger.debug('onCapture from CapturePage:', url)
          setCapturedImageUrl(url)
        }}
        onReset={handleReset}
        onRunPrediction={handleRunPrediction}
        isPredicting={isPredicting}
        predictionError={predictionError}
        sampleNo={sampleNo}
        submissionNo={submissionNo}
        description={description}
        canRunPrediction={!!(selectedFile && sampleNo)}
      />
      
      <PredictionResults
        sampleNo={activeSampleNo}
        predictionData={predictionData}
        isPredicting={isPredicting}
        annotatedImageUrl={annotatedImageUrl}
      />
      
      <SystemLogs 
        logs={logs} 
        cameraStatus={{
          isConnected: isCameraConnected,
          isCapturing: isCameraCapturing,
          error: cameraError,
          onCheckConnection: checkCameraConnection
        }}
      />
    </div>
  );
}
