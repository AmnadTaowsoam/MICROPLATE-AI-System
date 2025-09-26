import { useState } from 'react';
import { useImageUpload } from '../hooks/useImageUpload';
import { useWebSocketLogs } from '../hooks/useWebSocketLogs';
import SampleInformation from '../components/capture/SampleInformation';
import ImageCapture from '../components/capture/ImageCapture';
import PredictionResults from '../components/capture/PredictionResults';
import SystemLogs from '../components/capture/SystemLogs';

export default function CapturePage() {
  const [sampleNo, setSampleNo] = useState('');
  const [submissionNo, setSubmissionNo] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeSampleNo, setActiveSampleNo] = useState('');
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  
  const { 
    uploadedImageId,
    uploadImage, 
    runPrediction, 
    isPredicting, 
    uploadError, 
    predictionError,
    predictionData 
  } = useImageUpload();
  
  const { logs } = useWebSocketLogs();

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
    if (sampleNo) {
      uploadImage({ file, sampleNo, submissionNo: submissionNo || undefined });
    }
  };

  const handleRunPrediction = () => {
    if (selectedFile && sampleNo) {
      runPrediction({ 
        file: selectedFile,
        sampleNo, 
        submissionNo: submissionNo || undefined
      });
    }
  };

  const handleReset = () => {
    setSampleNo('');
    setSubmissionNo('');
    setSelectedFile(null);
    setCapturedImageUrl(null);
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
        onSampleEnter={handleSampleEnter}
        uploadError={uploadError}
      />
      
      <ImageCapture
        selectedFile={selectedFile}
        capturedImageUrl={capturedImageUrl}
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
        submissionNo={submissionNo}
        canRunPrediction={!!(selectedFile && sampleNo)}
      />
      
      <PredictionResults
        sampleNo={activeSampleNo}
        predictionData={predictionData}
        isPredicting={isPredicting}
      />
      
      <SystemLogs logs={logs} />
    </div>
  );
}
