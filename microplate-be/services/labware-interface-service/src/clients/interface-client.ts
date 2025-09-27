/**
 * Interface Client Library
 * Provides easy access to InterfaceFile data for other services
 * without requiring them to have the full Prisma model
 */

import axios, { AxiosInstance } from 'axios';
import { InterfaceFileData, InterfaceFileQuery } from '../types/shared.types';

export interface InterfaceClientConfig {
  baseUrl: string;
  token: string;
  timeout?: number;
}

export class InterfaceClient {
  private client: AxiosInstance;

  constructor(config: InterfaceClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get interface files with optional filtering
   */
  async getInterfaceFiles(query: InterfaceFileQuery = {}): Promise<InterfaceFileData[]> {
    try {
      const response = await this.client.get('/api/v1/labware/shared/interface-files', {
        params: query,
      });

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to get interface files');
    } catch (error) {
      console.error('Failed to get interface files:', error);
      throw error;
    }
  }

  /**
   * Get interface file by ID
   */
  async getInterfaceFile(id: string): Promise<InterfaceFileData | null> {
    try {
      const response = await this.client.get(`/api/v1/labware/shared/interface-files/${id}`);

      if (response.data.success) {
        return response.data.data;
      }
      if (response.status === 404) {
        return null;
      }
      throw new Error(response.data.error?.message || 'Failed to get interface file');
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Failed to get interface file:', error);
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  }

  /**
   * Get interface files by sample number
   */
  async getInterfaceFilesBySample(sampleNo: string): Promise<InterfaceFileData[]> {
    try {
      const response = await this.client.get(`/api/v1/labware/shared/interface-files/sample/${sampleNo}`);

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to get interface files by sample');
    } catch (error) {
      console.error('Failed to get interface files by sample:', error);
      throw error;
    }
  }

  /**
   * Get interface file statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySample: Record<string, number>;
  }> {
    try {
      const response = await this.client.get('/api/v1/labware/shared/interface-files/statistics');

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to get statistics');
    } catch (error) {
      console.error('Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * Check if interface file exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const file = await this.getInterfaceFile(id);
      return file !== null;
    } catch (error) {
      console.error('Failed to check if interface file exists:', error);
      return false;
    }
  }

  /**
   * Get interface files by status
   */
  async getInterfaceFilesByStatus(status: string): Promise<InterfaceFileData[]> {
    return this.getInterfaceFiles({ status });
  }

  /**
   * Count interface files
   */
  async countInterfaceFiles(query: InterfaceFileQuery = {}): Promise<number> {
    try {
      const files = await this.getInterfaceFiles(query);
      return files.length;
    } catch (error) {
      console.error('Failed to count interface files:', error);
      throw error;
    }
  }
}

/**
 * Create interface client instance
 */
export function createInterfaceClient(config: InterfaceClientConfig): InterfaceClient {
  return new InterfaceClient(config);
}

/**
 * Default interface client configuration
 */
export const defaultInterfaceClientConfig: Partial<InterfaceClientConfig> = {
  baseUrl: process.env['LABWARE_INTERFACE_SERVICE_URL'] || 'http://localhost:6405',
  timeout: 10000,
};
