import { labwareApi } from './api';
import { authService } from './auth.service';

// Interface types based on labware-interface-service
export interface InterfaceRequest {
  sampleNo: string;
}

export interface InterfaceResponse {
  success: boolean;
  data: {
    id: string;
    sampleNo: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    status: string;
    generatedAt: string;
    downloadUrl: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface InterfaceFileData {
  id: string;
  sampleNo: string;
  fileName: string;
  filePath: string;
  fileSize: string | undefined;
  status: 'pending' | 'generated' | 'delivered' | 'failed';
  generatedAt: Date | undefined;
  deliveredAt: Date | undefined;
  errorMsg: string | undefined;
  createdAt: Date;
  downloadUrl?: string;
}

export interface CsvPreviewData {
  headers: string[];
  rows: string[][];
  rawContent: string;
}

export const labwareService = {
  // Generate interface CSV
  async generateInterfaceCsv(sampleNo: string): Promise<InterfaceResponse> {
    console.log('🚀 labwareService: generateInterfaceCsv called for sample:', sampleNo);
    try {
      const token = authService.loadTokenFromStorage();
      console.log('🔑 labwareService: Token loaded:', token ? `Token exists (${token.substring(0, 20)}...)` : 'No token');
      
      if (token) {
        // Decode JWT to check expiration and payload
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);
          console.log('🕒 Token expiration:', new Date(payload.exp * 1000).toISOString());
          console.log('🕒 Current time:', new Date(now * 1000).toISOString());
          console.log('🕒 Token expired:', payload.exp < now ? 'YES' : 'NO');
          console.log('🏷️ Token issuer (iss):', payload.iss);
          console.log('🎯 Token audience (aud):', payload.aud);
          console.log('👤 Token subject (sub):', payload.sub);
        } catch (e) {
          console.warn('⚠️ Could not decode token:', e);
        }
        
        labwareApi.setAccessToken(token);
        console.log('✅ labwareService: Token set to labwareApi');
      } else {
        console.warn('❌ labwareService: No token available - user needs to login');
      }
      
      // Check the actual token being sent
      const currentToken = (labwareApi as any).accessToken;
      console.log('📤 labwareService: Token being sent:', currentToken ? `${currentToken.substring(0, 20)}...` : 'No token');
      
      const response = await labwareApi.post<InterfaceResponse>('/api/v1/labware/interface/generate', {
        sampleNo,
      });
      
      console.log('labwareService: Interface CSV generated:', response);
      return response;
    } catch (error) {
      console.error('labwareService: Failed to generate interface CSV:', error);
      throw error;
    }
  },

  // Get interface files
  async getInterfaceFiles(sampleNo?: string): Promise<{ success: boolean; data: InterfaceFileData[] }> {
    try {
      const token = authService.loadTokenFromStorage();
      if (token) {
        labwareApi.setAccessToken(token);
      }
      
      const params = sampleNo ? `?sampleNo=${sampleNo}` : '';
      const response = await labwareApi.get<{ success: boolean; data: InterfaceFileData[] }>(`/api/v1/labware/interface/files${params}`);
      
      console.log('labwareService: Interface files retrieved:', response);
      return response;
    } catch (error) {
      console.error('labwareService: Failed to get interface files:', error);
      throw error;
    }
  },

  // Get interface file details
  async getInterfaceFile(id: string): Promise<{ success: boolean; data: InterfaceFileData }> {
    try {
      const token = authService.loadTokenFromStorage();
      if (token) {
        labwareApi.setAccessToken(token);
      }
      
      const response = await labwareApi.get<{ success: boolean; data: InterfaceFileData }>(`/api/v1/labware/interface/files/${id}`);
      
      console.log('labwareService: Interface file details:', response);
      return response;
    } catch (error) {
      console.error('labwareService: Failed to get interface file:', error);
      throw error;
    }
  },

  // Download CSV file from URL
  async downloadCsvFile(downloadUrl: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('labwareService: Failed to download CSV file:', error);
      throw error;
    }
  },

  // Parse CSV content for preview
  parseCsvContent(csvContent: string): CsvPreviewData {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0]?.split(',') || [];
    const rows = lines.slice(1).map(line => line.split(','));
    
    return {
      headers,
      rows,
      rawContent: csvContent,
    };
  },

  // Download CSV file
  downloadCsv(csvContent: string, fileName: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  // Preview CSV in modal
  previewCsv(csvContent: string): CsvPreviewData {
    return this.parseCsvContent(csvContent);
  },
};

export default labwareService;
