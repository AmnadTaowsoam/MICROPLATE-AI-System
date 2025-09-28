import { useState, useCallback, useRef } from 'react';
import { captureService, type CaptureRequest, type CaptureResponse, type CaptureStatus } from '../services/capture.service';

export interface UseCaptureOptions {
  onSuccess?: (response: CaptureResponse) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: CaptureStatus) => void;
}

export interface UseCaptureReturn {
  // State
  isCapturing: boolean;
  captureStatus: CaptureStatus;
  capturedImageUrl: string | null;
  error: string | null;
  
  // Actions
  captureImage: (request: CaptureRequest) => Promise<void>;
  clearError: () => void;
  resetCapture: () => void;
  
  // Connection
  isConnected: boolean;
  checkConnection: () => Promise<void>;
}

export function useCapture(options: UseCaptureOptions = {}): UseCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>({
    status: 'idle'
  });
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const { onSuccess, onError, onStatusChange } = options;

  // ตรวจสอบการเชื่อมต่อ
  const checkConnection = useCallback(async () => {
    try {
      const connected = await captureService.checkConnection();
      setIsConnected(connected);
      if (!connected) {
        setError('ไม่สามารถเชื่อมต่อกับ Vision Capture Service ได้');
      }
    } catch (err) {
      setIsConnected(false);
      setError('ไม่สามารถเชื่อมต่อกับ Vision Capture Service ได้');
    }
  }, []);

  // ถ่ายภาพ
  const captureImage = useCallback(async (request: CaptureRequest) => {
    try {
      setIsCapturing(true);
      setError(null);
      setCaptureStatus({ status: 'capturing', message: 'กำลังถ่ายภาพ...' });
      
      // แจ้งเตือน status change
      if (onStatusChange) {
        onStatusChange({ status: 'capturing', message: 'กำลังถ่ายภาพ...' });
      }

      // ตรวจสอบการเชื่อมต่อก่อน
      await checkConnection();
      if (!isConnected) {
        throw new Error('ไม่สามารถเชื่อมต่อกับ Vision Capture Service ได้');
      }

      // ส่งคำสั่งถ่ายภาพ
      const response = await captureService.captureImage(request);
      
      if (response.data) {
        const captureResponse = response.data;
        
        // อัปเดตสถานะ
        setCaptureStatus({ 
          status: 'success', 
          message: 'ถ่ายภาพสำเร็จ',
          progress: 100 
        });
        
        // ตั้งค่า URL ของภาพ
        const imageUrl = captureService.getImageUrl(captureResponse.imagePath);
        setCapturedImageUrl(imageUrl);
        
        // แจ้งเตือน success
        if (onSuccess) {
          onSuccess(captureResponse);
        }
        
        if (onStatusChange) {
          onStatusChange({ 
            status: 'success', 
            message: 'ถ่ายภาพสำเร็จ',
            progress: 100 
          });
        }
        
        console.log('✅ Capture successful:', captureResponse);
      } else {
        throw new Error('ไม่ได้รับข้อมูลภาพจาก Vision Capture Service');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการถ่ายภาพ';
      setError(errorMessage);
      setCaptureStatus({ 
        status: 'error', 
        error: errorMessage,
        message: 'ถ่ายภาพล้มเหลว'
      });
      
      // แจ้งเตือน error
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
      
      if (onStatusChange) {
        onStatusChange({ 
          status: 'error', 
          error: errorMessage,
          message: 'ถ่ายภาพล้มเหลว'
        });
      }
      
      console.error('❌ Capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [isConnected, onSuccess, onError, onStatusChange, checkConnection]);

  // ล้าง error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // รีเซ็ต capture
  const resetCapture = useCallback(() => {
    setIsCapturing(false);
    setCaptureStatus({ status: 'idle' });
    setCapturedImageUrl(null);
    setError(null);
  }, []);

  return {
    // State
    isCapturing,
    captureStatus,
    capturedImageUrl,
    error,
    isConnected,
    
    // Actions
    captureImage,
    clearError,
    resetCapture,
    checkConnection
  };
}
