import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import AuthGuard from './components/AuthGuard';
import ResultsPage from './pages/ResultsPage';
import SampleHistoryPage from './pages/SampleHistoryPage';
import AuthPage from './pages/AuthPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ImageUpload from './components/capture/ImageUpload';
import LogsPanel from './components/capture/LogsPanel';
import { useImageUpload } from './hooks/useImageUpload';
import { useWebSocketLogs } from './hooks/useWebSocketLogs';
import { useState, useEffect } from 'react';
import { MdQrCodeScanner } from 'react-icons/md';
import { useSampleResult } from './hooks/useResults';
import { authService } from './services/auth.service';
import Navbar from './components/layout/Navbar';
import Input from './components/ui/Input';
import Button from './components/ui/Button';
import Card from './components/ui/Card';

function AppShell({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {isAuthenticated && <Navbar />}
      <main className="w-full">
        <div className={isAuthenticated ? "container-page py-6 lg:py-8" : ""}>
          {children}
        </div>
      </main>
    </div>
  );
}

function CapturePage() {
  const [sampleNo, setSampleNo] = useState('')
  const [submissionNo, setSubmissionNo] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // Use a dedicated state to trigger fetch only when user presses Enter
  const [activeSampleNo, setActiveSampleNo] = useState('')
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  
  const { 
    uploadedImageId,
    uploadImage, 
    runPrediction, 
    // isUploading, 
    isPredicting, 
    uploadError, 
    predictionError,
    predictionData 
  } = useImageUpload()
  
  const { logs } = useWebSocketLogs()

  const handleImageSelect = (file: File) => {
    setSelectedFile(file)
    if (sampleNo) {
      uploadImage({ file, sampleNo, submissionNo: submissionNo || undefined })
    }
  }

  const handleRunPrediction = () => {
    if (selectedFile && sampleNo) {
      runPrediction({ 
        file: selectedFile,
        sampleNo, 
        submissionNo: submissionNo || undefined
      })
    }
  }

  const handleReset = () => {
    setSampleNo('')
    setSubmissionNo('')
    setBarcodeInput('')
    setSelectedFile(null)
    setCapturedImageUrl(null)
  }

  const handleScanQR = () => {
    if (barcodeInput.trim()) {
      // Parse barcode input - assuming format like "SAMPLE123,SUBMISSION456" or "SAMPLE123|SUBMISSION456"
      const parts = barcodeInput.split(/[,|]/).map(part => part.trim())
      if (parts.length >= 1) {
        setSampleNo(parts[0])
      }
      if (parts.length >= 2) {
        setSubmissionNo(parts[1])
      }
      // Clear barcode input after processing
      setBarcodeInput('')
    }
  }

  const { data: sampleResult, isLoading: isLoadingSample } = useSampleResult(activeSampleNo || undefined)

  return (
    <div className="grid grid-cols-12 gap-4 lg:gap-6 xl:gap-8">
      <Card className="col-span-12 md:col-span-3 xl:col-span-2 p-5">
        <h2 className="text-lg font-semibold mb-6">Sample Information</h2>
        <div className="space-y-4">
          <Input 
            placeholder="Sample Number" 
            value={sampleNo}
            onChange={(e) => setSampleNo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && sampleNo) {
                setActiveSampleNo(sampleNo)
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
                handleScanQR()
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
      
      <div className="col-span-12 md:col-span-6 xl:col-span-8">
        <ImageUpload 
          onSelect={handleImageSelect} 
          onCaptured={(url) => setCapturedImageUrl(url)}
          sampleNo={sampleNo}
          className="p-4" 
          onRunPrediction={handleRunPrediction}
          onReset={handleReset}
          canRunPrediction={(!!uploadedImageId || !!selectedFile || !!capturedImageUrl) && !!sampleNo}
          isPredicting={isPredicting}
          actionText={(uploadedImageId || selectedFile || capturedImageUrl) ? 'Image is ready. You can run prediction now.' : 'Upload or capture an image to enable prediction.'}
        />
      </div>
      
      <Card className="col-span-12 md:col-span-3 xl:col-span-2">
        <div className="border-b border-gray-200 px-5">
          <nav className="flex gap-8">
            <button className="py-4 text-sm border-b-2 border-primary-500 text-primary-600">Prediction Results</button>
            <button className="py-4 text-sm text-gray-500">Summary</button>
          </nav>
        </div>
        <div className="p-5">
          {predictionData ? (
            <div className="text-sm">
              <div className="text-green-600 font-medium mb-2">Prediction Complete</div>
              <div>Status: {predictionData.status}</div>
              {predictionData.results && (
                <div className="mt-2">
                  <div>Total Wells: {predictionData.results.statistics.totalDetections}</div>
                  <div>Positive: {predictionData.results.statistics.positiveCount}</div>
                  <div>Negative: {predictionData.results.statistics.negativeCount}</div>
                </div>
              )}
            </div>
          ) : predictionError ? (
            <div className="text-red-500 text-sm">
              Prediction failed: {predictionError.message}
            </div>
          ) : isLoadingSample ? (
            <div className="text-gray-500 text-center">Loading results...</div>
          ) : sampleResult?.lastRun ? (
            <div className="text-sm">
              <div className="text-gray-900 font-medium mb-2">Latest Results</div>
              <div>Status: {sampleResult.lastRun.status}</div>
              <div className="mt-2">
                <div>Total Wells: {sampleResult.lastRun.statistics.totalDetections}</div>
                <div>Positive: {sampleResult.lastRun.statistics.positiveCount}</div>
                <div>Negative: {sampleResult.lastRun.statistics.negativeCount}</div>
                <div>Confidence: {(sampleResult.lastRun.statistics.averageConfidence * 100).toFixed(1)}%</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center">Press Enter to load sample results</div>
          )}
        </div>
      </Card>
      
      <div className="col-span-12">
        <LogsPanel logs={logs} />
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="text-center text-gray-500 py-24">Page not found</div>
  )
}

export default function App() {
  const queryClient = new QueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check authentication status on app load
    const checkAuth = () => {
      console.log('App: Checking authentication...');
      const token = authService.loadTokenFromStorage();
      const isValid = authService.isTokenValid();
      const authenticated = !!token && isValid;
      console.log('App: Token present:', !!token);
      console.log('App: Token valid:', isValid);
      console.log('App: Authenticated:', authenticated);
      setIsAuthenticated(authenticated);
    };

    checkAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      console.log('App: Storage change detected:', e.key, e.newValue ? 'Present' : 'Missing');
      if (e.key === 'access_token') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppShell isAuthenticated={isAuthenticated}>
          <Routes>
            <Route path="/" element={<Navigate to={isAuthenticated ? '/capture' : '/auth'} replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route 
              path="/capture" 
              element={<AuthGuard><CapturePage /></AuthGuard>} 
            />
            <Route 
              path="/results" 
              element={<AuthGuard><ResultsPage /></AuthGuard>} 
            />
            <Route 
              path="/results/:sampleNo" 
              element={<AuthGuard><ResultsPage /></AuthGuard>} 
            />
            <Route 
              path="/samples" 
              element={<AuthGuard><SampleHistoryPage /></AuthGuard>} 
            />
             <Route 
              path="/settings" 
              element={<AuthGuard><ProfileSettingsPage /></AuthGuard>} 
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
