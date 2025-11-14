import { useState } from 'react';
import { MdQrCodeScanner } from 'react-icons/md';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';

interface SampleInformationProps {
  sampleNo: string;
  setSampleNo: (value: string) => void;
  submissionNo: string;
  setSubmissionNo: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  onSampleEnter: (sampleNo: string) => void;
  uploadError?: Error | null;
}

export default function SampleInformation({
  sampleNo,
  setSampleNo,
  submissionNo,
  setSubmissionNo,
  description,
  setDescription,
  onSampleEnter,
  uploadError
}: SampleInformationProps) {
  const { t } = useTranslation();
  const [barcodeInput, setBarcodeInput] = useState('');
  
  logger.debug('SampleInformation rendered with description:', description, 'at', new Date().toISOString());

  const handleScanQR = () => {
    if (barcodeInput.trim()) {
      const parts = barcodeInput.split(/[,|]/).map(part => part.trim());
      if (parts.length >= 1) {
        setSampleNo(parts[0]);
      }
      if (parts.length >= 2) {
        setSubmissionNo(parts[1]);
      }
      setBarcodeInput('');
    }
  };

  return (
    <Card className="col-span-12 md:col-span-3 xl:col-span-2 p-5">
      <h2 className="text-lg font-semibold mb-6">{t('capture.sampleInformation.title')}</h2>
      <div className="space-y-4">
        <Input 
          placeholder={t('capture.sampleInformation.sampleNumber')} 
          value={sampleNo}
          onChange={(e) => setSampleNo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && sampleNo) {
              onSampleEnter(sampleNo);
            }
          }}
        />
        <Input 
          placeholder={t('capture.sampleInformation.submissionNumber')} 
          value={submissionNo}
          onChange={(e) => setSubmissionNo(e.target.value)}
        />
        <Input 
          placeholder={t('capture.sampleInformation.descriptionPlaceholder')} 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input 
          placeholder={t('capture.sampleInformation.barcodeInput')} 
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
            {t('capture.sampleInformation.scanQr')}
          </Button>
        </div>
        {uploadError && (
          <div className="text-red-500 text-sm">
            {t('capture.sampleInformation.uploadError', { message: uploadError.message })}
          </div>
        )}
      </div>
    </Card>
  );
}
