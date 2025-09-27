import React, { useState } from 'react';
import { useImageUpload } from '../hooks/useImageUpload';
import { useWebSocketLogs } from '../hooks/useWebSocketLogs';
import SampleInformation from '../components/capture/SampleInformation';
import ImageCapture from '../components/capture/ImageCapture';
import PredictionResults from '../components/capture/PredictionResults';
import SystemLogs from '../components/capture/SystemLogs';

export default function CapturePage() {
  const [sampleNo, setSampleNo] = useState('');
  const [submissionNo, setSubmissionNo] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeSampleNo, setActiveSampleNo] = useState('');
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  
  console.log('CapturePage rendered with description:', description);
  
  const { 
    uploadImage, 
    runPrediction, 
    isPredicting, 
    uploadError, 
    predictionError,
    predictionData 
  } = useImageUpload();

  // Update annotated image URL when prediction completes
  React.useEffect(() => {
    console.log('Prediction data changed:', predictionData);
    if (predictionData?.data?.annotated_image_url) {
      let imageUrl = predictionData.data.annotated_image_url;
      console.log('Raw annotated image URL:', imageUrl);
      
      // If it's a MinIO URL, convert to accessible URL
      if (imageUrl.includes('minio:9000')) {
        // Replace minio:9000 with localhost:9000 for frontend access
        imageUrl = imageUrl.replace('minio:9000', 'localhost:9000');
        console.log('Converted MinIO URL for frontend access:', imageUrl);
        
        // Test the URL accessibility
        fetch(imageUrl, { method: 'HEAD' })
          .then(response => {
            console.log('URL accessibility test:', response.status, response.statusText);
            if (response.ok) {
              console.log('✅ URL is accessible');
            } else {
              console.log('❌ URL is not accessible:', response.status);
            }
          })
          .catch(error => {
            console.log('❌ URL test failed:', error);
          });
      }
      // If it's a relative URL, make it absolute
      else if (imageUrl.startsWith('/')) {
        const visionServiceUrl = import.meta.env.VITE_VISION_SERVICE_URL || 'http://localhost:6403';
        imageUrl = `${visionServiceUrl}${imageUrl}`;
        console.log('Converted to absolute URL:', imageUrl);
      }
      
      console.log('Setting annotated image URL:', imageUrl);
      setAnnotatedImageUrl(imageUrl);
    } else {
      console.log('No annotated_image_url found in prediction data');
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
        onCapture={() => {
          // TODO: Implement camera capture
          console.log('Camera capture not implemented yet');
        }}
        onReset={handleReset}
        onRunPrediction={handleRunPrediction}
        isPredicting={isPredicting}
        predictionError={predictionError}
        sampleNo={sampleNo}
        canRunPrediction={!!(selectedFile && sampleNo)}
      />
      
      <PredictionResults
        sampleNo={activeSampleNo}
        predictionData={predictionData}
        isPredicting={isPredicting}
        annotatedImageUrl={annotatedImageUrl}
      />
      
      <SystemLogs logs={logs} />
    </div>
  );
}
