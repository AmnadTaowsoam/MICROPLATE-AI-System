/**
 * Sample Summary Service
 * Provides access to SampleSummary data from result-api-service
 * This service handles the communication with result-api-service
 */

import axios, { AxiosInstance } from 'axios';

export interface SampleSummaryData {
  sampleNo: string;
  summary: {
    distribution: Record<string, number>;
    concentration?: {
      positive_percentage: number;
      negative_percentage: number;
    };
    quality_metrics?: {
      average_confidence: number;
      high_confidence_percentage: number;
    };
  };
  totalRuns: number;
  lastRunAt: Date | null;
  lastRunId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SampleSummaryServiceConfig {
  resultApiServiceUrl: string;
  token: string;
  timeout?: number;
}

export class SampleSummaryService {
  private client: AxiosInstance;

  constructor(config: SampleSummaryServiceConfig) {
    this.client = axios.create({
      baseURL: config.resultApiServiceUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get sample summary by sample number
   */
  async getSampleSummary(sampleNo: string): Promise<SampleSummaryData> {
    try {
      const response = await this.client.get(`/api/v1/result/samples/${sampleNo}/summary`);

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to get sample summary');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error(`Sample ${sampleNo} not found`);
      }
      console.error('Failed to get sample summary:', error);
      throw error;
    }
  }

  /**
   * Check if sample exists
   */
  async exists(sampleNo: string): Promise<boolean> {
    try {
      await this.getSampleSummary(sampleNo);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get sample summary with fallback to direct database access
   * This method tries API first, then falls back to direct database if needed
   */
  async getSampleSummaryWithFallback(sampleNo: string): Promise<SampleSummaryData> {
    try {
      // Try API first
      return await this.getSampleSummary(sampleNo);
    } catch (error) {
      console.warn('API call failed, falling back to direct database access:', error);
      
      // Fallback to direct database access
      // This requires the SampleSummary model to be available
      const { prisma } = await import('../server');
      
      const summary = await prisma.sampleSummary.findUnique({
        where: { sampleNo },
      });

      if (!summary) {
        throw new Error(`Sample ${sampleNo} not found`);
      }

      return {
        sampleNo: summary.sampleNo,
        summary: summary.summary as any,
        totalRuns: summary.totalRuns,
        lastRunAt: summary.lastRunAt,
        lastRunId: summary.lastRunId,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
      };
    }
  }
}

/**
 * Create sample summary service instance
 */
export function createSampleSummaryService(config: SampleSummaryServiceConfig): SampleSummaryService {
  return new SampleSummaryService(config);
}

/**
 * Default configuration
 */
export const defaultSampleSummaryConfig: Partial<SampleSummaryServiceConfig> = {
  resultApiServiceUrl: process.env['RESULT_API_SERVICE_URL'] || 'http://localhost:6403',
  timeout: 10000,
};
