import { z } from 'zod';

// =========================
// Common Schemas
// =========================

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const SampleNoSchema = z.string().min(1).max(50);
export const RunIdSchema = z.coerce.number().positive();

// =========================
// Sample Schemas
// =========================

export const SampleFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'completed', 'failed']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const SampleListQuerySchema = PaginationSchema.merge(SampleFiltersSchema);

export const SampleSummaryResponseSchema = z.object({
  sampleNo: z.string(),
  summary: z.object({
    distribution: z.record(z.string(), z.number()),
    concentration: z.object({
      positive_percentage: z.number(),
      negative_percentage: z.number(),
    }).optional(),
    quality_metrics: z.object({
      average_confidence: z.number(),
      high_confidence_percentage: z.number(),
      well_detection_accuracy: z.number(),
    }).optional(),
  }),
  totalRuns: z.number(),
  lastRunAt: z.string().datetime().nullable(),
  lastRunId: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const SampleDetailsResponseSchema = SampleSummaryResponseSchema.extend({
  submissionNo: z.string().optional(),
  firstRunAt: z.string().datetime().nullable(),
  status: z.enum(['active', 'completed', 'failed']),
  runs: z.array(z.object({
    runId: z.number(),
    predictAt: z.string().datetime(),
    modelVersion: z.string().optional(),
    status: z.string(),
    processingTimeMs: z.number().optional(),
    statistics: z.object({
      totalDetections: z.number(),
      positiveCount: z.number(),
      negativeCount: z.number(),
      averageConfidence: z.number(),
    }),
  })),
});

// =========================
// Run Schemas
// =========================

export const RunFiltersSchema = z.object({
  status: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const RunListQuerySchema = PaginationSchema.merge(RunFiltersSchema);

export const WellPredictionSchema = z.object({
  wellId: z.string(),
  label: z.string(),
  class: z.string(),
  confidence: z.number().min(0).max(1),
  bbox: z.object({
    xmin: z.number(),
    ymin: z.number(),
    xmax: z.number(),
    ymax: z.number(),
  }),
});

export const RunSummaryResponseSchema = z.object({
  runId: z.number(),
  predictAt: z.string().datetime(),
  modelVersion: z.string().optional(),
  status: z.string(),
  processingTimeMs: z.number().optional(),
  statistics: z.object({
    totalDetections: z.number(),
    positiveCount: z.number(),
    negativeCount: z.number(),
    averageConfidence: z.number(),
  }),
});

export const RunDetailsResponseSchema = z.object({
  runId: z.number(),
  sampleNo: z.string(),
  submissionNo: z.string().optional(),
  description: z.string().optional(),
  predictAt: z.string().datetime(),
  modelVersion: z.string().optional(),
  status: z.string(),
  processingTimeMs: z.number().optional(),
  errorMsg: z.string().nullable(),
  rawImageUrl: z.string().url().optional(),
  annotatedImageUrl: z.string().url().optional(),
  statistics: z.object({
    totalDetections: z.number(),
    positiveCount: z.number(),
    negativeCount: z.number(),
    invalidCount: z.number(),
    averageConfidence: z.number(),
  }),
  rowCounts: z.record(z.string(), z.number()),
  inferenceResults: z.object({
    distribution: z.record(z.string(), z.number()),
    concentration: z.object({
      positive_percentage: z.number(),
      negative_percentage: z.number(),
    }).optional(),
    quality_metrics: z.object({
      image_quality_score: z.number(),
      well_detection_accuracy: z.number(),
      overall_confidence: z.number(),
    }).optional(),
  }),
  wellPredictions: z.array(WellPredictionSchema),
});

export const LastRunResponseSchema = RunSummaryResponseSchema.extend({
  sampleNo: z.string(),
  annotatedImageUrl: z.string().url().optional(),
});

// =========================
// Statistics Schemas
// =========================

export const StatisticsFiltersSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

export const DailyStatisticsSchema = z.object({
  date: z.string(),
  samplesProcessed: z.number(),
  runsCompleted: z.number(),
  averageConfidence: z.number(),
});

export const ModelPerformanceSchema = z.object({
  totalRuns: z.number(),
  successRate: z.number(),
  averageConfidence: z.number(),
});

export const SystemStatisticsResponseSchema = z.object({
  totalSamples: z.number(),
  totalRuns: z.number(),
  activeSamples: z.number(),
  completedRuns: z.number(),
  failedRuns: z.number(),
  averageProcessingTimeMs: z.number(),
  successRate: z.number(),
  dailyStats: z.array(DailyStatisticsSchema),
  modelPerformance: z.record(z.string(), ModelPerformanceSchema),
});

export const ConfidenceTrendPointSchema = z.object({
  runId: z.number(),
  predictAt: z.string().datetime(),
  averageConfidence: z.number(),
});

export const DistributionTrendPointSchema = z.object({
  runId: z.number(),
  predictAt: z.string().datetime(),
  positiveCount: z.number(),
  negativeCount: z.number(),
});

export const SampleTrendsResponseSchema = z.object({
  sampleNo: z.string(),
  trends: z.object({
    confidenceTrend: z.array(ConfidenceTrendPointSchema),
    distributionTrend: z.array(DistributionTrendPointSchema),
  }),
});

// =========================
// WebSocket Schemas
// =========================

export const WebSocketSubscriptionSchema = z.object({
  type: z.enum(['subscribe', 'unsubscribe']),
  channel: z.enum(['sample', 'run', 'system']),
  sampleNo: z.string().optional(),
  runId: z.number().optional(),
});

export const WebSocketMessageSchema = z.object({
  type: z.string(),
  data: z.any().optional(),
});

export const WebSocketNotificationSchema = z.object({
  type: z.enum(['sample_updated', 'run_completed', 'run_failed', 'system_stats_updated']),
  data: z.any(),
  timestamp: z.string().datetime(),
});

// =========================
// Error Schemas
// =========================

export const ErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  requestId: z.string().optional(),
  timestamp: z.string().datetime(),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
});

export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

// =========================
// Pagination Response Schema
// =========================

export const PaginationResponseSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: PaginationResponseSchema,
});

// =========================
// Health Check Schemas
// =========================

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  timestamp: z.string().datetime(),
  version: z.string(),
  uptime: z.number(),
  dependencies: z.object({
    database: z.enum(['healthy', 'unhealthy']),
    cache: z.enum(['healthy', 'unhealthy']).optional(),
    websocket: z.enum(['healthy', 'unhealthy']).optional(),
  }),
});

// =========================
// Request/Response Type Inference
// =========================

export type PaginationQuery = z.infer<typeof PaginationSchema>;
export type SampleFilters = z.infer<typeof SampleFiltersSchema>;
export type SampleListQuery = z.infer<typeof SampleListQuerySchema>;
export type SampleSummaryResponse = z.infer<typeof SampleSummaryResponseSchema>;
export type SampleDetailsResponse = z.infer<typeof SampleDetailsResponseSchema>;

export type RunFilters = z.infer<typeof RunFiltersSchema>;
export type RunListQuery = z.infer<typeof RunListQuerySchema>;
export type RunSummaryResponse = z.infer<typeof RunSummaryResponseSchema>;
export type RunDetailsResponse = z.infer<typeof RunDetailsResponseSchema>;
export type LastRunResponse = z.infer<typeof LastRunResponseSchema>;

export type StatisticsFilters = z.infer<typeof StatisticsFiltersSchema>;
export type SystemStatisticsResponse = z.infer<typeof SystemStatisticsResponseSchema>;
export type SampleTrendsResponse = z.infer<typeof SampleTrendsResponseSchema>;

export type WebSocketSubscription = z.infer<typeof WebSocketSubscriptionSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
export type WebSocketNotification = z.infer<typeof WebSocketNotificationSchema>;

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse<T = any> = z.infer<typeof SuccessResponseSchema> & { data: T };
export type PaginatedResponse<T = any> = z.infer<typeof PaginatedResponseSchema> & { data: T[] };

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
