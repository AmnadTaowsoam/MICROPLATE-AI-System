import { z } from 'zod';

// =========================
// Request/Response Types
// =========================

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =========================
// Sample Types
// =========================

export interface SampleSummary {
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

export interface SampleDetails extends SampleSummary {
  submissionNo?: string;
  firstRunAt: Date | null;
  status: 'active' | 'completed' | 'failed';
  runs: PredictionRunSummary[];
}

export interface PredictionRunSummary {
  runId: number;
  sampleNo?: string; // เพิ่ม sampleNo field
  predictAt: Date;
  modelVersion?: string;
  status: string;
  processingTimeMs?: number;
  statistics: {
    totalDetections: number;
    positiveCount: number;
    negativeCount: number;
    averageConfidence: number;
  };
  inferenceResults?: any[];
  wellPredictions?: any[];
  // เพิ่มข้อมูลรูปภาพ
  rawImagePath?: string;
  annotatedImagePath?: string;
}

// =========================
// Run Types
// =========================

export interface PredictionRunDetails {
  runId: number;
  sampleNo: string;
  submissionNo?: string;
  description?: string;
  predictAt: Date;
  modelVersion?: string;
  status: string;
  processingTimeMs?: number;
  errorMsg?: string | null;
  rawImageUrl?: string;
  annotatedImageUrl?: string;
  statistics: {
    totalDetections: number;
    positiveCount: number;
    negativeCount: number;
    invalidCount: number;
    averageConfidence: number;
  };
  rowCounts: Record<string, number>;
  inferenceResults: {
    distribution: Record<string, number>;
    concentration?: {
      positive_percentage: number;
      negative_percentage: number;
    };
    quality_metrics?: {
      image_quality_score: number;
      well_detection_accuracy: number;
      overall_confidence: number;
    };
  };
  wellPredictions: WellPrediction[];
}

export interface WellPrediction {
  wellId: string;
  label: string;
  class: string;
  confidence: number;
  bbox: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

// =========================
// Statistics Types
// =========================

export interface SystemStatistics {
  totalSamples: number;
  totalRuns: number;
  activeSamples: number;
  completedRuns: number;
  failedRuns: number;
  averageProcessingTimeMs: number;
  successRate: number;
  dailyStats: DailyStatistics[];
  modelPerformance: Record<string, ModelPerformance>;
}

export interface DailyStatistics {
  date: string;
  samplesProcessed: number;
  runsCompleted: number;
  averageConfidence: number;
}

export interface ModelPerformance {
  totalRuns: number;
  successRate: number;
  averageConfidence: number;
}

export interface SampleTrends {
  sampleNo: string;
  trends: {
    confidenceTrend: ConfidenceTrendPoint[];
    distributionTrend: DistributionTrendPoint[];
  };
}

export interface ConfidenceTrendPoint {
  runId: number;
  predictAt: Date;
  averageConfidence: number;
}

export interface DistributionTrendPoint {
  runId: number;
  predictAt: Date;
  positiveCount: number;
  negativeCount: number;
}

// =========================
// WebSocket Types
// =========================

export interface WebSocketMessage {
  type: string;
  data?: any;
}

export interface WebSocketSubscription {
  type: 'subscribe' | 'unsubscribe';
  channel: 'sample' | 'run' | 'system';
  sampleNo?: string;
  runId?: number;
}

export interface WebSocketNotification {
  type: 'sample_updated' | 'run_completed' | 'run_failed' | 'system_stats_updated';
  data: any;
  timestamp: Date;
}

// =========================
// Error Types
// =========================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  requestId?: string;
  timestamp: Date;
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// =========================
// Zod Schemas for Validation
// =========================

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const SampleNoSchema = z.string().min(1).max(50);

export const RunIdSchema = z.coerce.number().positive();

export const SampleFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'completed', 'failed']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const RunFiltersSchema = z.object({
  status: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const StatisticsFiltersSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

// =========================
// Cache Types
// =========================

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<void>;
}

// =========================
// Service Types
// =========================

export interface ResultService {
  getSampleSummary(sampleNo: string): Promise<SampleSummary>;
  getSampleDetails(sampleNo: string): Promise<SampleDetails>;
  getSampleRuns(sampleNo: string, options: PaginationOptions): Promise<PaginatedResult<PredictionRunSummary>>;
  getRunDetails(runId: number): Promise<PredictionRunDetails>;
  getLastRun(sampleNo: string): Promise<PredictionRunSummary>;
  getSamples(options: PaginationOptions & { filters?: any }): Promise<PaginatedResult<SampleSummary>>;
  getSystemStatistics(filters?: any): Promise<SystemStatistics>;
  getSampleTrends(sampleNo: string): Promise<SampleTrends>;
  getInterfaceFiles(sampleNo: string): Promise<any[]>;
}

export interface AggregationService {
  updateSampleSummary(sampleNo: string): Promise<void>;
  calculateDistribution(inferenceResults: any[]): Record<string, number>;
  calculateStatistics(runs: any[]): any;
}

export interface WebSocketService {
  addConnection(connectionId: string, ws: WebSocket): void;
  removeConnection(connectionId: string, ws: WebSocket): void;
  subscribeToSample(connectionId: string, sampleNo: string): void;
  unsubscribeFromSample(connectionId: string, sampleNo: string): void;
  subscribeToRun(connectionId: string, runId: number): void;
  unsubscribeFromRun(connectionId: string, runId: number): void;
  broadcastSampleUpdate(sampleNo: string, data: any): Promise<void>;
  broadcastRunUpdate(runId: number, data: any): Promise<void>;
  broadcastSystemUpdate(data: any): Promise<void>;
  getConnectionStats(): {
    totalConnections: number;
    totalWebSockets: number;
    sampleSubscriptions: number;
    runSubscriptions: number;
    systemSubscriptions: number;
  };
  isHealthy(): boolean;
}

// =========================
// Database Types
// =========================

export interface DatabaseNotification {
  channel: string;
  payload: string;
}

export interface NotificationHandler {
  handleNotification(notification: DatabaseNotification): Promise<void>;
}

// =========================
// Worker Types
// =========================

export interface AggregationWorker {
  start(): Promise<void>;
  stop(): Promise<void>;
  processNotification(notification: DatabaseNotification): Promise<void>;
}

export interface WorkerConfig {
  enabled: boolean;
  batchSize: number;
  pollInterval: number;
  retryAttempts: number;
  retryDelay: number;
}
