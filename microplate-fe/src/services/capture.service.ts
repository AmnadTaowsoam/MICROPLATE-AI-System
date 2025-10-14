import { captureApi } from './api';

// Define ApiResponse type locally since it's not exported from api module
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CaptureRequest {
  sampleNo: string;
  submissionNo: string;
  description?: string;
}

export interface CaptureResponse {
  success: boolean;
  imageUrl: string;
  imagePath: string;
  timestamp: number;
  sampleNo: string;
  submissionNo: string;
  description?: string;
}

export interface CaptureStatus {
  status: 'idle' | 'capturing' | 'processing' | 'success' | 'error';
  progress?: number;
  message?: string;
  error?: string;
}

class CaptureService {
  private baseUrl = import.meta.env.VITE_VISION_CAPTURE_SERVICE_URL || 'http://localhost:6407';

  /**
   * ส่งคำสั่งถ่ายภาพไปยัง vision-capture-service
   */
  async captureImage(request: CaptureRequest): Promise<ApiResponse<CaptureResponse>> {
    try {
      console.log('🎥 CaptureService: Sending capture request:', request);
      // Backend expects snake_case keys
      const payload = {
        sample_no: request.sampleNo,
        submission_no: request.submissionNo,
        description: request.description ?? 'Captured image'
      } as const;

      const resp = await captureApi.post<any>(`/api/v1/capture/image`, payload);

      // Map backend response to FE-friendly shape
      const filename: string | undefined = resp?.data?.image_data?.filename;
      const capturedAtIso: string | undefined = resp?.data?.image_data?.captured_at;
      const sampleNo: string | undefined = resp?.data?.sample_no;
      const submissionNo: string | undefined = resp?.data?.submission_no;

      if (!filename) {
        throw new Error('Missing filename in capture response');
      }

      const imageUrl = `${this.baseUrl}/api/v1/capture/image/${filename}`;
      const mapped: CaptureResponse = {
        success: true,
        imageUrl,
        imagePath: filename,
        timestamp: capturedAtIso ? Date.parse(capturedAtIso) : Date.now(),
        sampleNo: sampleNo || request.sampleNo,
        submissionNo: submissionNo || request.submissionNo,
        description: request.description
      };

      console.log('📸 CaptureService: Mapped capture response:', mapped);
      return { success: true, data: mapped };
    } catch (error) {
      console.error('❌ CaptureService: Failed to capture image:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบสถานะการถ่ายภาพ (WebSocket หรือ Polling)
   */
  async getCaptureStatus(): Promise<ApiResponse<CaptureStatus>> {
    try {
      const response = await captureApi.get<CaptureStatus>(`/api/v1/capture/status`);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('❌ CaptureService: Failed to get capture status:', error);
      throw error;
    }
  }

  /**
   * ดาวน์โหลดภาพที่ถ่ายได้
   */
  async downloadImage(imagePath: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/capture/image/${imagePath}`);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('❌ CaptureService: Failed to download image:', error);
      throw error;
    }
  }

  /**
   * สร้าง URL สำหรับแสดงภาพ
   */
  getImageUrl(imagePath: string): string {
    return `${this.baseUrl}/api/v1/capture/image/${imagePath}`;
  }

  /**
   * ตรวจสอบการเชื่อมต่อกับ vision-capture-service
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await captureApi.get(`/api/v1/capture/health`) as ApiResponse<unknown>;
      return (response as any)?.success ?? true;
    } catch (error) {
      console.error('❌ CaptureService: Connection check failed:', error);
      return false;
    }
  }

  /**
   * เริ่มการเชื่อมต่อ WebSocket สำหรับการแจ้งเตือนแบบ Real-time
   */
  connectWebSocket(onStatusUpdate: (status: CaptureStatus) => void): WebSocket | null {
    try {
      const wsUrl = this.baseUrl.replace('http', 'ws');
      const ws = new WebSocket(`${wsUrl}/ws/capture`);
      
      ws.onopen = () => {
        console.log('🔌 CaptureService: WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const status: CaptureStatus = JSON.parse(event.data);
          console.log('📡 CaptureService: Status update:', status);
          onStatusUpdate(status);
        } catch (error) {
          console.error('❌ CaptureService: Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('🔌 CaptureService: WebSocket disconnected');
      };
      
      ws.onerror = (error) => {
        console.error('❌ CaptureService: WebSocket error:', error);
      };
      
      return ws;
    } catch (error) {
      console.error('❌ CaptureService: Failed to connect WebSocket:', error);
      return null;
    }
  }

  /**
   * ปิดการเชื่อมต่อ WebSocket
   */
  disconnectWebSocket(ws: WebSocket | null): void {
    if (ws) {
      ws.close();
    }
  }
}

export const captureService = new CaptureService();
