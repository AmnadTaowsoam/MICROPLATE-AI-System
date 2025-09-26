import { useState } from 'react';
import { MdQrCodeScanner } from 'react-icons/md';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface SampleInformationProps {
  sampleNo: string;
  setSampleNo: (value: string) => void;
  submissionNo: string;
  setSubmissionNo: (value: string) => void;
  onSampleEnter: (sampleNo: string) => void;
  uploadError?: Error | null;
}

export default function SampleInformation({
  sampleNo,
  setSampleNo,
  submissionNo,
  setSubmissionNo,
  onSampleEnter,
  uploadError
}: SampleInformationProps) {
  const [barcodeInput, setBarcodeInput] = useState('');

  const handleScanQR = () => {
    if (barcodeInput.trim()) {
      // Parse barcode input - assuming format like "SAMPLE123,SUBMISSION456" or "SAMPLE123|SUBMISSION456"
      const parts = barcodeInput.split(/[,|]/).map(part => part.trim());
      if (parts.length >= 1) {
        setSampleNo(parts[0]);
      }
      if (parts.length >= 2) {
        setSubmissionNo(parts[1]);
      }
      // Clear barcode input after processing
      setBarcodeInput('');
    }
  };

  return (
    <Card className="col-span-12 md:col-span-3 xl:col-span-2 p-5">
      <h2 className="text-lg font-semibold mb-6">Sample Information</h2>
      <div className="space-y-4">
        <Input 
          placeholder="Sample Number" 
          value={sampleNo}
          onChange={(e) => setSampleNo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && sampleNo) {
              onSampleEnter(sampleNo);
            }
          }}
        />
        <Input 
          placeholder="Submission Number" 
          value={submissionNo}
          onChange={(e) => setSubmissionNo(e.target.value)}
        />
        <Input 
          placeholder="Barcode Scanner Input" 
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleScanQR();
            }
          }}
        />
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleScanQR}
            className="flex items-center gap-2"
          >
            <MdQrCodeScanner className="h-4 w-4" />
            Scan QR
          </Button>
        </div>
        {uploadError && (
          <div className="text-red-500 text-sm">
            Upload failed: {uploadError.message}
          </div>
        )}
      </div>
    </Card>
  );
}
