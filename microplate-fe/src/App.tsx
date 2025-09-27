import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import AuthGuard from './components/AuthGuard';
import ResultsPage from './pages/ResultsPage';
import Results from './pages/Results';
import SampleHistoryPage from './pages/SampleHistoryPage';
import AuthPage from './pages/AuthPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ImageUpload from './components/capture/ImageUpload';
import LogsPanel from './components/capture/LogsPanel';
import { useImageUpload } from './hooks/useImageUpload';
import { useSampleSummary } from './hooks/useResults';
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
  const [description, setDescription] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // Use a dedicated state to trigger fetch only when user presses Enter
  const [activeSampleNo, setActiveSampleNo] = useState('')
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'prediction' | 'summary'>('prediction')
  
  
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
  
  
  // Get sample summary data for Summary tab
  const { data: sampleSummaryResponse, isLoading: isSummaryLoading, error: summaryError } = useSampleSummary(sampleNo)
  
  // Extract the actual data from the response
  const sampleSummary = sampleSummaryResponse?.data
  

  // Update annotated image URL when prediction completes
  useEffect(() => {
    console.log('App.tsx: Prediction data changed:', predictionData);
    if (predictionData?.data?.annotated_image_url) {
      let imageUrl = predictionData.data.annotated_image_url;
      console.log('App.tsx: Raw annotated image URL:', imageUrl);
      
      // If it's a MinIO URL, convert to accessible URL
      if (imageUrl.includes('minio:9000')) {
        // Replace minio:9000 with localhost:9000 for frontend access
        imageUrl = imageUrl.replace('minio:9000', 'localhost:9000');
        console.log('App.tsx: Converted MinIO URL for frontend access:', imageUrl);
        
        // If it's a signed URL, convert to direct URL immediately
        if (imageUrl.includes('?')) {
          const directUrl = imageUrl.split('?')[0];
          console.log('App.tsx: Converting signed URL to direct URL:', directUrl);
          imageUrl = directUrl; // Use direct URL immediately
        }
      }
      // If it's a relative URL, make it absolute
      else if (imageUrl.startsWith('/')) {
        const visionServiceUrl = import.meta.env.VITE_VISION_SERVICE_URL || 'http://localhost:6403';
        imageUrl = `${visionServiceUrl}${imageUrl}`;
        console.log('App.tsx: Converted to absolute URL:', imageUrl);
      }
      
      console.log('App.tsx: Setting annotated image URL:', imageUrl);
      setAnnotatedImageUrl(imageUrl);
      
      // Test the URL accessibility (async, but don't wait for it)
      fetch(imageUrl, { method: 'HEAD' })
        .then(response => {
          console.log('App.tsx: URL accessibility test:', response.status, response.statusText);
          if (response.ok) {
            console.log('App.tsx: ✅ URL is accessible');
          } else {
            console.log('App.tsx: ❌ URL is not accessible:', response.status);
          }
        })
        .catch(error => {
          console.log('App.tsx: ❌ URL test failed:', error);
        });
    } else {
      console.log('App.tsx: No annotated_image_url found in prediction data');
    }
  }, [predictionData]);

  const handleImageSelect = (file: File) => {
    setSelectedFile(file)
    if (sampleNo) {
      uploadImage({ file, sampleNo, submissionNo: submissionNo || undefined, description: description || undefined })
    }
  }

  const handleRunPrediction = () => {
    if (selectedFile && sampleNo) {
      runPrediction({ 
        file: selectedFile,
        sampleNo, 
        submissionNo: submissionNo || undefined,
        description: description || undefined
      })
    }
  }

  const handleReset = () => {
    setSampleNo('')
    setSubmissionNo('')
    setDescription('')
    setBarcodeInput('')
    setSelectedFile(null)
    setCapturedImageUrl(null)
    setAnnotatedImageUrl(null)
  }

  const handleScanQR = () => {
    if (barcodeInput.trim()) {
      // Parse barcode input - assuming format like "SAMPLE123,SUBMISSION456,DESCRIPTION" or "SAMPLE123|SUBMISSION456|DESCRIPTION"
      const parts = barcodeInput.split(/[,|]/).map(part => part.trim())
      if (parts.length >= 1) {
        setSampleNo(parts[0])
      }
      if (parts.length >= 2) {
        setSubmissionNo(parts[1])
      }
      if (parts.length >= 3) {
        setDescription(parts[2])
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
            placeholder="Description (Optional)" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          annotatedImageUrl={annotatedImageUrl}
        />
      </div>
      
      <Card className="col-span-12 md:col-span-3 xl:col-span-2">
        <div className="border-b border-gray-200 px-5">
          <nav className="flex gap-8">
            <button 
              className={`py-4 text-sm ${activeTab === 'prediction' 
                ? 'border-b-2 border-primary-500 text-primary-600' 
                : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('prediction')}
            >
              Prediction Results
            </button>
            <button 
              className={`py-4 text-sm ${activeTab === 'summary' 
                ? 'border-b-2 border-primary-500 text-primary-600' 
                : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
          </nav>
        </div>
        <div className="p-5">
          {/* Prediction Results Tab */}
          {activeTab === 'prediction' && (
            <>
              {predictionData ? (
            <div className="space-y-4">
              {/* Combined Status & Statistics Card */}
              <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-blue-900/20 dark:to-indigo-900/20 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4">
                {/* Status Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">✓ Complete</span>
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-800/30 px-2 py-1 rounded-full">
                    {predictionData.data?.status}
                  </div>
                </div>

                {/* Statistics Grid with Icons */}
                {predictionData.data && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-lg mb-1">🧪</div>
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{predictionData.data.statistics.total_detections}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Wells</div>
                    </div>
                    
                    <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-lg mb-1">🔍</div>
                      <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{predictionData.data.statistics.wells_analyzed}</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">Analyzed</div>
                    </div>
                    
                    <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-lg mb-1">📊</div>
                      <div className="text-lg font-bold text-orange-700 dark:text-orange-300">{(predictionData.data.statistics.average_confidence * 100).toFixed(1)}%</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">Confidence</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Distribution Chart */}
              {predictionData.data?.inference_results?.distribution && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">📈</div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Row Distribution</span>
                  </div>
                  
                  <div className="space-y-2">
                    {Object.entries(predictionData.data.inference_results.distribution)
                      .filter(([key]) => key !== 'total')
                      .map(([row, count]) => (
                        <div key={row} className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{row}</span>
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400">Row {row}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${(Number(count) / (predictionData.data?.inference_results?.distribution?.total || 1)) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[2rem] text-right">
                              {String(count)}
                            </span>
                          </div>
                        </div>
                      ))}
                    
                    {/* Total Row */}
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-sm">Σ</div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total</span>
                        </div>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {predictionData.data?.inference_results?.distribution?.total || 0}
                        </span>
                      </div>
                    </div>
                  </div>
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
            </>
          )}
          
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <>
              {sampleSummary ? (
            <div className="space-y-4">
              {/* Sample Summary Header */}
              <div className="bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 dark:from-slate-800 dark:via-emerald-900/20 dark:to-teal-900/20 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="text-lg">📊</div>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Sample Summary</span>
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-800/30 px-2 py-1 rounded-full">
                    {sampleSummary.totalRuns} runs
                  </div>
                </div>

                {/* Summary Statistics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-lg mb-1">🔄</div>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{sampleSummary.totalRuns}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Total Runs</div>
                  </div>
                  
                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-lg mb-1">📅</div>
                    <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                      {sampleSummary.lastRunAt ? new Date(sampleSummary.lastRunAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Last Run</div>
                  </div>
                </div>
              </div>

              {/* Distribution Summary */}
              {sampleSummary.summary?.distribution && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">📈</div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Aggregated Distribution</span>
                  </div>
                  
                  <div className="space-y-2">
                    {Object.entries(sampleSummary.summary.distribution)
                      .filter(([key]) => key !== 'total')
                      .map(([row, count]) => (
                        <div key={row} className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{row}</span>
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400">Row {row}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${(Number(count) / (sampleSummary.summary.distribution.total || 1)) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[2rem] text-right">
                              {String(count)}
                            </span>
                          </div>
                        </div>
                      ))}
                    
                    {/* Total Row */}
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-sm">Σ</div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {sampleSummary.summary.distribution.total || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
              ) : isSummaryLoading ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
                  Loading summary...
                </div>
              ) : summaryError ? (
                <div className="text-center text-red-500 py-8">
                  <div className="text-sm">Error loading summary:</div>
                  <div className="text-xs mt-1">{summaryError.message}</div>
                </div>
              ) : sampleNo ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No summary data available for sample {sampleNo}.
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Enter a sample number to view summary.
                </div>
              )}
            </>
          )}
        </div>
      </Card>
      
      <div className="col-span-12">
        <LogsPanel />
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
      
      // Ensure token is set for all services
      if (token && isValid) {
        console.log('App: Setting token for all services...');
        authService.setTokensForAllServices(token);
      }
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
              element={<AuthGuard><Results /></AuthGuard>} 
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
