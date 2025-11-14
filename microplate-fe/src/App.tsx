import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import logger from './utils/logger';
import AuthGuard from './components/AuthGuard';
import ResultsPage from './pages/ResultsPage';
import Results from './pages/Results';
import AuthPage from './pages/AuthPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotificationsPage from './pages/NotificationsPage';
import UserGuidePage from './pages/UserGuidePage';
import { ThemeProvider } from './contexts/ThemeContext';
import ImageUpload from './components/capture/ImageUpload';
import LogsPanel from './components/capture/LogsPanel';
import { useImageUpload } from './hooks/useImageUpload';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MdQrCodeScanner } from 'react-icons/md';
import { useSampleResult } from './hooks/useResults';
import { authService } from './services/auth.service';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Input from './components/ui/Input';
import Button from './components/ui/Button';
import Card from './components/ui/Card';
import PredictionResults from './components/capture/PredictionResults'
import {
  calibrationService,
  type CalibrationConfig,
  type CalibrationBounds,
} from './services/calibration.service'

const GRID_ROWS = 8
const GRID_COLS = 12

type CalibrationStatusMessage = {
  type: 'info' | 'success' | 'error'
  messageKey: string
  messageParams?: Record<string, unknown>
}

function AppShell({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {isAuthenticated && <Navbar />}
      <main className="w-full flex-1">
        <div className={isAuthenticated ? "container-page py-6 lg:py-8" : ""}>
          {children}
        </div>
      </main>
      {isAuthenticated && <Footer />}
    </div>
  );
}

function CapturePage() {
  const { t } = useTranslation()
  const [sampleNo, setSampleNo] = useState('')
  const [submissionNo, setSubmissionNo] = useState('')
  const [description, setDescription] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // Use a dedicated state to trigger fetch only when user presses Enter
  const [activeSampleNo, setActiveSampleNo] = useState('')
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null)
  const [isPreparingCaptureFile, setIsPreparingCaptureFile] = useState(false)
  const [isCalibrationMode, setIsCalibrationMode] = useState(false)
  const [calibrationImageMeta, setCalibrationImageMeta] = useState<{ width: number; height: number } | null>(null)
  const [calibrationStatus, setCalibrationStatus] = useState<CalibrationStatusMessage | null>(null)
  const [isSavingCalibration, setIsSavingCalibration] = useState(false)
  const [calibrationConfig, setCalibrationConfig] = useState<CalibrationConfig | null>(null)
  const [calibrationBounds, setCalibrationBounds] = useState<CalibrationBounds | null>(null)
  const [calibrationColumns, setCalibrationColumns] = useState<number[]>([])
  const [calibrationRows, setCalibrationRows] = useState<number[]>([])
  const hasImage = useMemo(() => Boolean(selectedFile || capturedImageUrl), [selectedFile, capturedImageUrl])
  const captureActionText = useMemo(() => {
    if (isPreparingCaptureFile) {
      return t('capture.uploadCard.status.preparing')
    }
    if (hasImage) {
      return t('capture.uploadCard.status.ready')
    }
    return t('capture.uploadCard.status.prompt')
  }, [hasImage, isPreparingCaptureFile, t])
  
  const isCalibrationReady = useMemo(() => {
    return Boolean(
      calibrationBounds &&
        calibrationColumns.length === GRID_COLS + 1 &&
        calibrationRows.length === GRID_ROWS + 1 &&
        calibrationImageMeta,
    )
  }, [calibrationBounds, calibrationColumns, calibrationRows, calibrationImageMeta])

  const generateDefaultGrid = useCallback(
    (width: number, height: number) => {
      // เริ่มจากเต็มภาพเลย ไม่มี padding ให้ user ปรับเอง
      logger.debug('generateDefaultGrid: no padding variant enabled')
      const bounds: CalibrationBounds = {
        left: 0,
        right: width,
        top: 0,
        bottom: height,
      }
      logger.debug(
        'generateDefaultGrid: bounds computed',
        { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom },
      )
      const columns = Array.from({ length: GRID_COLS + 1 }, (_, index) =>
        Math.round(bounds.left + ((bounds.right - bounds.left) * index) / GRID_COLS),
      )
      const rows = Array.from({ length: GRID_ROWS + 1 }, (_, index) =>
        Math.round(bounds.top + ((bounds.bottom - bounds.top) * index) / GRID_ROWS),
      )
      return { bounds, columns, rows }
    },
    [],
  )

  
  const { 
    uploadImage, 
    runPrediction, 
    // isUploading, 
    isPredicting, 
    uploadError, 
    predictionError,
    predictionData 
  } = useImageUpload()
  
  
  // Update annotated image URL when prediction completes
  useEffect(() => {
    logger.debug('App.tsx: Prediction data changed:', predictionData);
    if (predictionData?.data?.annotated_image_url) {
      let imageUrl = predictionData.data.annotated_image_url;
      logger.debug('App.tsx: Raw annotated image URL:', imageUrl);

      if (imageUrl.includes('minio:9000')) {
        imageUrl = imageUrl.replace('minio:9000', 'localhost:9000');
        logger.debug('App.tsx: Converted MinIO host for frontend access:', imageUrl);
      } else if (imageUrl.startsWith('/')) {
        const visionServiceUrl = process.env.VITE_VISION_SERVICE_URL || 'http://localhost:6403';
        imageUrl = `${visionServiceUrl}${imageUrl}`;
        logger.debug('App.tsx: Converted relative URL to absolute:', imageUrl);
      }

      logger.debug('App.tsx: Setting annotated image URL:', imageUrl);
      setAnnotatedImageUrl(imageUrl);
    } else {
      logger.debug('App.tsx: No annotated_image_url found in prediction data');
    }

    const metadata = predictionData?.data?.grid_metadata;
    if (metadata) {
      logger.debug('App.tsx: Received grid metadata from backend', metadata);
      if (
        Array.isArray(metadata.columns) &&
        metadata.columns.length === GRID_COLS + 1
      ) {
        setCalibrationColumns(metadata.columns.slice());
      }
      if (
        Array.isArray(metadata.rows) &&
        metadata.rows.length === GRID_ROWS + 1
      ) {
        setCalibrationRows(metadata.rows.slice());
      }
      if (metadata.bounds) {
        setCalibrationBounds({
          left: metadata.bounds.left,
          right: metadata.bounds.right,
          top: metadata.bounds.top,
          bottom: metadata.bounds.bottom,
        });
      }
      if (
        Array.isArray(metadata.original_size) &&
        metadata.original_size.length === 2
      ) {
        setCalibrationImageMeta({
          width: metadata.original_size[0],
          height: metadata.original_size[1],
        });
      }
    }
  }, [predictionData]);

  useEffect(() => {
    const loadCalibration = async () => {
      try {
        const config = await calibrationService.getCalibrationConfig()
        setCalibrationConfig(config)
        if (config.bounds) {
          setCalibrationBounds({
            left: config.bounds.left,
            right: config.bounds.right,
            top: config.bounds.top,
            bottom: config.bounds.bottom,
          })
        } else {
          setCalibrationBounds(null)
        }
        if (Array.isArray(config.columns) && config.columns.length === GRID_COLS + 1) {
          setCalibrationColumns(config.columns.slice())
        } else {
          setCalibrationColumns([])
        }
        if (Array.isArray(config.rows) && config.rows.length === GRID_ROWS + 1) {
          setCalibrationRows(config.rows.slice())
        } else {
          setCalibrationRows([])
        }
      } catch (error) {
        logger.error('Failed to load calibration config:', error)
      }
    }
    loadCalibration()
  }, [])

  useEffect(() => {
    if (!isCalibrationMode || !calibrationImageMeta) {
      return
    }
    if (
      !calibrationBounds ||
      calibrationColumns.length !== GRID_COLS + 1 ||
      calibrationRows.length !== GRID_ROWS + 1
    ) {
      const defaults = generateDefaultGrid(calibrationImageMeta.width, calibrationImageMeta.height)
      setCalibrationBounds(defaults.bounds)
      setCalibrationColumns(defaults.columns)
      setCalibrationRows(defaults.rows)
    }
  }, [isCalibrationMode, calibrationImageMeta, calibrationBounds, calibrationColumns, calibrationRows, generateDefaultGrid])

  const handleImageSelect = (file: File) => {
    setSelectedFile(file)
    setCapturedImageUrl(null)
    setAnnotatedImageUrl(null)
    if (sampleNo) {
      uploadImage({ file, sampleNo, submissionNo: submissionNo || undefined, description: description || undefined })
    }
  }

  const fetchCapturedImageAsFile = async (url: string): Promise<File | null> => {
    try {
      const response = await fetch(url, { mode: 'cors' })
      if (!response.ok) {
        logger.error('Failed to fetch captured image for prediction:', response.status, response.statusText)
        return null
      }
      const blob = await response.blob()
      const contentType = blob.type || 'image/jpeg'
      const extension = contentType.split('/')[1] || 'jpg'
      const filename = url.split('/').pop()?.split('?')[0] || `capture_${Date.now()}.${extension}`
      return new File([blob], filename, { type: contentType })
    } catch (error) {
      logger.error('Failed to convert captured image to file:', error)
      return null
    }
  }

  const handleRunPrediction = () => {
    if (!selectedFile) {
      logger.warn('Run prediction requested but image file is not ready.')
      return
    }
    if (!sampleNo) {
      logger.warn('Run prediction requested but sample number is missing.')
      return
    }
    runPrediction({ 
      file: selectedFile,
      sampleNo, 
      submissionNo: submissionNo || undefined,
      description: description || undefined
    })
  }

  const handleReset = () => {
    setSampleNo('')
    setSubmissionNo('')
    setDescription('')
    setBarcodeInput('')
    setSelectedFile(null)
    setCapturedImageUrl(null)
    setAnnotatedImageUrl(null)
    setIsPreparingCaptureFile(false)
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

  const handleCaptureComplete = async (url: string) => {
    setCapturedImageUrl(url)
    setAnnotatedImageUrl(null)
    setIsPreparingCaptureFile(true)
    const file = await fetchCapturedImageAsFile(url)
    if (file) {
      setSelectedFile(file)
      if (sampleNo) {
        uploadImage({ file, sampleNo, submissionNo: submissionNo || undefined, description: description || undefined })
      }
    } else {
      logger.error('Unable to prepare captured image for prediction')
    }
    setIsPreparingCaptureFile(false)
  }

  const handleEnterCalibration = () => {
    setIsCalibrationMode(true)
    setCalibrationStatus({
      type: 'info',
      messageKey: 'capture.calibration.infoMessageDefault',
    })
    const width =
      calibrationConfig?.imageWidth ??
      calibrationImageMeta?.width ??
      null
    const height =
      calibrationConfig?.imageHeight ??
      calibrationImageMeta?.height ??
      null

    if (calibrationConfig?.imageWidth && calibrationConfig?.imageHeight && !calibrationImageMeta) {
      setCalibrationImageMeta({
        width: calibrationConfig.imageWidth,
        height: calibrationConfig.imageHeight,
      })
    }

    if (
      width &&
      height &&
      (!calibrationBounds ||
        calibrationColumns.length !== GRID_COLS + 1 ||
        calibrationRows.length !== GRID_ROWS + 1)
    ) {
      const defaults = generateDefaultGrid(width, height)
      setCalibrationBounds(defaults.bounds)
      setCalibrationColumns(defaults.columns)
      setCalibrationRows(defaults.rows)
    }
  }

  const handleExitCalibration = () => {
    setIsCalibrationMode(false)
    setCalibrationImageMeta(null)
    setCalibrationStatus(null)
  }

  const handleBoundsChange = useCallback((updatedBounds: CalibrationBounds) => {
    setCalibrationBounds(updatedBounds)
    setCalibrationColumns((prev) => {
      if (prev.length !== GRID_COLS + 1) {
        return prev
      }
      const next = [...prev]
      next[0] = updatedBounds.left
      next[next.length - 1] = updatedBounds.right
      for (let i = 1; i < next.length - 1; i += 1) {
        next[i] = Math.min(Math.max(next[i], updatedBounds.left), updatedBounds.right)
      }
      return next
    })
    setCalibrationRows((prev) => {
      if (prev.length !== GRID_ROWS + 1) {
        return prev
      }
      const next = [...prev]
      next[0] = updatedBounds.top
      next[next.length - 1] = updatedBounds.bottom
      for (let i = 1; i < next.length - 1; i += 1) {
        next[i] = Math.min(Math.max(next[i], updatedBounds.top), updatedBounds.bottom)
      }
      return next
    })
    setCalibrationStatus({
      type: 'info',
      messageKey: 'capture.calibration.status.boundsAdjusted',
    })
  }, [])

  const handleColumnChange = useCallback(
    (index: number, value: number) => {
      setCalibrationColumns((prev) => {
        if (!calibrationBounds || prev.length !== GRID_COLS + 1) {
          return prev
        }
        const next = [...prev]
        const min = index === 0 ? 0 : next[index - 1] + 1
        const max = index === next.length - 1 ? (calibrationImageMeta?.width ?? calibrationBounds.right) : next[index + 1] - 1
        next[index] = Math.min(Math.max(value, min), max)
        
        // อัปเดต bounds เมื่อลากเส้นขอบ
        if (index === 0 && calibrationBounds) {
          setCalibrationBounds({
            ...calibrationBounds,
            left: next[0]
          })
        } else if (index === next.length - 1 && calibrationBounds) {
          setCalibrationBounds({
            ...calibrationBounds,
            right: next[next.length - 1]
          })
        }
        
        return next
      })
      setCalibrationStatus({
        type: 'info',
        messageKey: 'capture.calibration.status.columnsAdjusted',
      })
    },
    [calibrationBounds, calibrationImageMeta]
  )

  const handleRowChange = useCallback(
    (index: number, value: number) => {
      setCalibrationRows((prev) => {
        if (!calibrationBounds || prev.length !== GRID_ROWS + 1) {
          return prev
        }
        const next = [...prev]
        const min = index === 0 ? 0 : next[index - 1] + 1
        const max = index === next.length - 1 ? (calibrationImageMeta?.height ?? calibrationBounds.bottom) : next[index + 1] - 1
        next[index] = Math.min(Math.max(value, min), max)
        
        // อัปเดต bounds เมื่อลากเส้นขอบ
        if (index === 0 && calibrationBounds) {
          setCalibrationBounds({
            ...calibrationBounds,
            top: next[0]
          })
        } else if (index === next.length - 1 && calibrationBounds) {
          setCalibrationBounds({
            ...calibrationBounds,
            bottom: next[next.length - 1]
          })
        }
        
        return next
      })
      setCalibrationStatus({
        type: 'info',
        messageKey: 'capture.calibration.status.rowsAdjusted',
      })
    },
    [calibrationBounds, calibrationImageMeta]
  )

  const handleResetGrid = useCallback(() => {
    if (!calibrationImageMeta) {
      return
    }
    const defaults = generateDefaultGrid(calibrationImageMeta.width, calibrationImageMeta.height)
    setCalibrationBounds(defaults.bounds)
    setCalibrationColumns(defaults.columns)
    setCalibrationRows(defaults.rows)
    setCalibrationStatus({
      type: 'info',
      messageKey: 'capture.calibration.status.gridReset',
    })
  }, [calibrationImageMeta, generateDefaultGrid])

  const handleCalibrationSave = async () => {
    if (
      !calibrationBounds ||
      calibrationColumns.length !== GRID_COLS + 1 ||
      calibrationRows.length !== GRID_ROWS + 1 ||
      !calibrationImageMeta
    ) {
      setCalibrationStatus({
        type: 'error',
        messageKey: 'capture.calibration.status.saveInvalid',
      })
      return
    }

    setIsSavingCalibration(true)
    try {
      const payload = {
        imageWidth: Math.round(calibrationImageMeta.width),
        imageHeight: Math.round(calibrationImageMeta.height),
        bounds: {
          left: Math.round(calibrationBounds.left),
          right: Math.round(calibrationBounds.right),
          top: Math.round(calibrationBounds.top),
          bottom: Math.round(calibrationBounds.bottom),
        },
        columns: calibrationColumns.map((value) => Math.round(value)),
        rows: calibrationRows.map((value) => Math.round(value)),
      }
      
      // Debug: แสดงค่าที่จะส่งไป backend
      logger.debug('Calibration payload', {
        imageWidth: payload.imageWidth,
        imageHeight: payload.imageHeight,
        bounds: payload.bounds,
        columnsSample: payload.columns.slice(0, 4),
        rowsSample: payload.rows.slice(0, 4),
        imageMeta: calibrationImageMeta,
      })
      logger.debug('=== Calibration Save Debug ===')
      logger.debug('Image size:', payload.imageWidth, 'x', payload.imageHeight)
      logger.debug('Bounds:', payload.bounds)
      logger.debug('Columns (pixel):', payload.columns)
      logger.debug('Rows (pixel):', payload.rows)
      
      const saved = await calibrationService.saveCalibrationConfig(payload)
      setCalibrationConfig(saved)
      if (saved.bounds) {
        setCalibrationBounds({
          left: saved.bounds.left,
          right: saved.bounds.right,
          top: saved.bounds.top,
          bottom: saved.bounds.bottom,
        })
      }
      if (Array.isArray(saved.columns) && saved.columns.length === GRID_COLS + 1) {
        setCalibrationColumns(saved.columns.slice())
      }
      if (Array.isArray(saved.rows) && saved.rows.length === GRID_ROWS + 1) {
        setCalibrationRows(saved.rows.slice())
      }
      setCalibrationStatus({
        type: 'success',
        messageKey: 'capture.calibration.status.saveSuccess',
      })
      setIsCalibrationMode(false)
    } catch (error) {
      logger.error('Failed to save calibration:', error)
      setCalibrationStatus({
        type: 'error',
        messageKey: 'capture.calibration.status.saveFailed',
        messageParams: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
    } finally {
      setIsSavingCalibration(false)
    }
  }

  const handleCalibrationResetConfig = async () => {
    setIsSavingCalibration(true)
    try {
      const cleared = await calibrationService.clearCalibrationConfig()
      setCalibrationConfig(cleared)
      setCalibrationImageMeta(null)
      setCalibrationBounds(null)
      setCalibrationColumns([])
      setCalibrationRows([])
      setCalibrationStatus({
        type: 'info',
        messageKey: 'capture.calibration.status.cleared',
      })
    } catch (error) {
      logger.error('Failed to clear calibration config:', error)
      setCalibrationStatus({
        type: 'error',
        messageKey: 'capture.calibration.status.clearFailed',
        messageParams: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
    } finally {
      setIsSavingCalibration(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4 lg:gap-6 xl:gap-8">
      <Card className="col-span-12 md:col-span-3 xl:col-span-2 2xl:col-span-2 p-5">
        <h2 className="text-lg font-semibold mb-6">{t('capture.sampleInformation.title')}</h2>
        <div className="space-y-4">
          <Input 
            placeholder={t('capture.sampleInformation.sampleNumber')}
            value={sampleNo}
            onChange={(e) => setSampleNo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && sampleNo) {
                setActiveSampleNo(sampleNo)
              }
            }}
          />
          <Input 
            placeholder={t('capture.sampleInformation.submissionNumber')}
            value={submissionNo}
            onChange={(e) => setSubmissionNo(e.target.value)}
          />
          <Input 
            placeholder={t('capture.sampleInformation.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input 
            placeholder={t('capture.sampleInformation.barcodeInput')}
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
      
      <div className="col-span-12 lg:col-span-5 xl:col-span-6 2xl:col-span-7">
        <ImageUpload 
          onSelect={handleImageSelect} 
          onCaptured={handleCaptureComplete}
          sampleNo={sampleNo}
          submissionNo={submissionNo}
          description={description}
          className="p-4" 
          onRunPrediction={handleRunPrediction}
          onReset={handleReset}
          canRunPrediction={Boolean(selectedFile && sampleNo) && !isPreparingCaptureFile}
          isPredicting={isPredicting || isPreparingCaptureFile}
          actionText={captureActionText}
          annotatedImageUrl={annotatedImageUrl}
          isCalibrationMode={isCalibrationMode}
          calibrationBounds={calibrationBounds}
          calibrationColumns={calibrationColumns}
          calibrationRows={calibrationRows}
          onBoundsChange={handleBoundsChange}
          onColumnChange={handleColumnChange}
          onRowChange={handleRowChange}
          onCalibrationImageMetaChange={setCalibrationImageMeta}
          calibrationInfoMessage={
            calibrationStatus?.type === 'info'
              ? t(calibrationStatus.messageKey, calibrationStatus.messageParams)
              : undefined
          }
        />
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {!isCalibrationMode ? (
              <Button
                variant="outline"
                onClick={handleEnterCalibration}
                disabled={!hasImage}
                className="border-blue-500 text-blue-600 dark:text-blue-300"
                title={hasImage ? undefined : t('capture.calibration.requireImage')}
              >
                {t('capture.calibration.start')}
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  onClick={handleCalibrationSave}
                  disabled={isSavingCalibration || !isCalibrationReady}
                  className={`${isCalibrationReady ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'} text-white`}
                >
                  {isSavingCalibration ? t('capture.calibration.saving') : t('capture.calibration.save')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExitCalibration}
                  className="border-gray-500 text-gray-700 dark:text-gray-200"
                  disabled={isSavingCalibration}
                >
                  {t('common.cancel')}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={handleCalibrationResetConfig}
              className="border-red-500 text-red-600 dark:text-red-400"
              disabled={isSavingCalibration || !calibrationConfig?.enabled}
            >
              {t('capture.calibration.resetConfig')}
            </Button>
          </div>
          {isCalibrationMode && (
            <div className="bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <p className="font-semibold text-gray-700 dark:text-gray-200">{t('capture.calibration.instructionsTitle')}</p>
                  <p>{t('capture.calibration.instructions.line1')}</p>
                  <p>{t('capture.calibration.instructions.line2')}</p>
                  <p>{t('capture.calibration.instructions.line3')}</p>
                  <p>{t('capture.calibration.instructions.line4')}</p>
                </div>
                <Button
                  variant="outline"
                  className="text-xs px-3 py-1 border-gray-400 dark:border-gray-600 whitespace-nowrap"
                  onClick={handleResetGrid}
                  disabled={!calibrationImageMeta}
                >
                  {t('capture.calibration.resetGridButton')}
                </Button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('capture.calibration.tip')}
              </div>
            </div>
          )}
          {calibrationStatus && (
            <div
              className={`text-sm rounded-md px-4 py-2 ${
                calibrationStatus.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
                  : calibrationStatus.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
                    : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800'
              }`}
            >
              {t(calibrationStatus.messageKey, calibrationStatus.messageParams)}
            </div>
          )}
          {isCalibrationMode && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('capture.calibration.infoHint')}
            </div>
          )}
        </div>
      </div>
      
      {predictionData ? (
        <PredictionResults
          className="col-span-12 lg:col-span-4 xl:col-span-4 2xl:col-span-3"
          sampleNo={sampleNo}
          predictionData={predictionData}
          isPredicting={isPredicting || isPreparingCaptureFile}
        />
      ) : (
        <Card className="col-span-12 lg:col-span-4 xl:col-span-4 2xl:col-span-3 p-5 flex flex-col gap-4">
          {predictionError ? (
            <div className="text-red-500 text-sm">
              {t('capture.resultsPanel.predictionFailed', { message: predictionError.message })}
            </div>
          ) : isLoadingSample ? (
            <div className="text-gray-500 text-center">{t('capture.resultsPanel.loading')}</div>
          ) : sampleResult?.lastRun ? (
            <div className="text-sm space-y-3">
              <div className="text-gray-900 font-medium">{t('capture.resultsPanel.latestTitle')}</div>
              <div>{t('capture.resultsPanel.status')}: {sampleResult.lastRun.status}</div>
              <div className="space-y-1">
                <div>{t('capture.resultsPanel.totalWells')}: {sampleResult.lastRun.statistics.totalDetections}</div>
                <div>{t('capture.resultsPanel.positive')}: {sampleResult.lastRun.statistics.positiveCount}</div>
                <div>{t('capture.resultsPanel.negative')}: {sampleResult.lastRun.statistics.negativeCount}</div>
                <div>{t('capture.resultsPanel.confidence')}: {(sampleResult.lastRun.statistics.averageConfidence * 100).toFixed(1)}%</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center">{t('capture.resultsPanel.pressEnter')}</div>
          )}
        </Card>
      )}
 
      <div className="col-span-12">
        <LogsPanel />
      </div>
    </div>
  )
}

function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="text-center text-gray-500 py-24">{t('common.pageNotFound')}</div>
  )
}

export default function App() {
  const queryClient = new QueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check authentication status on app load
    const checkAuth = () => {
      logger.debug('App: Checking authentication...');
      const token = authService.loadTokenFromStorage();
      const isValid = authService.isTokenValid();
      const authenticated = !!token && isValid;
      logger.debug('App: Token present:', !!token);
      logger.debug('App: Token valid:', isValid);
      logger.debug('App: Authenticated:', authenticated);
      setIsAuthenticated(authenticated);
      setIsCheckingAuth(false);
      
      // Ensure token is set for all services
      if (token && isValid) {
        logger.debug('App: Setting token for all services...');
        authService.setTokensForAllServices(token);
      }
    };

    checkAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      logger.debug('App: Storage change detected:', e.key, e.newValue ? 'Present' : 'Missing');
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

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppShell isAuthenticated={!!isAuthenticated}>
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
                path="/profile" 
                element={<AuthGuard><ProfilePage /></AuthGuard>} 
              />
             <Route 
              path="/settings" 
              element={<AuthGuard><SettingsPage /></AuthGuard>} 
            />
            <Route 
              path="/notifications" 
              element={<AuthGuard><NotificationsPage /></AuthGuard>} 
            />
            <Route 
              path="/user-guide" 
              element={<AuthGuard><UserGuidePage /></AuthGuard>} 
            />
              {/* Legacy route for backward compatibility */}
              <Route 
                path="/profile-settings" 
              element={<AuthGuard><ProfileSettingsPage /></AuthGuard>} 
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
    </ThemeProvider>
  );
}
