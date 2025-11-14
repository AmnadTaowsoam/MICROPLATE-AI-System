import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { 
  ResultService, 
  SampleSummary, 
  SampleDetails, 
  PredictionRunDetails, 
  PredictionRunSummary,
  PaginationOptions,
  PaginatedResult,
  SystemStatistics,
  SampleTrends
} from '@/types/result.types';
import { CacheService } from '@/utils/redis';
import { createError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { config } from '@/config/config';
import { AggregationServiceImpl } from '@/services/aggregation.service';

export class ResultServiceImpl implements ResultService {
  private predictionDbServiceUrl: string;

  constructor(
    private prisma: PrismaClient,
    private cache: CacheService
  ) {
    this.predictionDbServiceUrl = process.env.PREDICTION_DB_SERVICE_URL || 'http://localhost:6406';
  }

  async getSampleSummary(sampleNo: string): Promise<SampleSummary> {
    const cacheKey = `sample:${sampleNo}:summary`;
    
    // Check cache first
    if (config.features.caching) {
      const cached = await this.cache.get<SampleSummary>(cacheKey);
      if (cached) {
        logger.debug('Sample summary retrieved from cache', { sampleNo });
        return cached;
      }
    }

    // Query database
    let summary = await this.prisma.sampleSummary.findUnique({
      where: { sampleNo }
    });

    if (!summary) {
      const runCount = await this.prisma.predictionRun.count({ where: { sampleNo } });

      if (runCount > 0) {
        logger.warn({ sampleNo }, 'Sample summary missing despite existing runs, triggering aggregation');
        const aggregationService = new AggregationServiceImpl(this.prisma);
        await aggregationService.updateSampleSummary(sampleNo);

        summary = await this.prisma.sampleSummary.findUnique({
          where: { sampleNo }
        });
      }

      if (!summary) {
        const emptySummary = this.createEmptySampleSummary(sampleNo);
        logger.info({ sampleNo }, 'Returning empty sample summary');

        if (config.features.caching) {
          await this.cache.set(cacheKey, emptySummary, config.cache.ttl);
        }

        return emptySummary;
      }
    }

    // Transform to response format
    const result: SampleSummary = {
      sampleNo: summary.sampleNo,
      summary: summary.summary as any,
      totalRuns: summary.totalRuns,
      lastRunAt: summary.lastRunAt,
      lastRunId: summary.lastRunId,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    };

    // Cache result
    if (config.features.caching) {
      await this.cache.set(cacheKey, result, config.cache.ttl);
    }

    logger.info({ sampleNo, totalRuns: result.totalRuns }, 'Sample summary retrieved');
    return result;
  }

  private createEmptySampleSummary(sampleNo: string): SampleSummary {
    const now = new Date();
    return {
      sampleNo,
      summary: {
        distribution: { total: 0 },
        concentration: {
          positive_percentage: 0,
          negative_percentage: 0,
        },
        quality_metrics: {
          average_confidence: 0,
          high_confidence_percentage: 0,
        },
      },
      totalRuns: 0,
      lastRunAt: null,
      lastRunId: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getSampleDetails(sampleNo: string): Promise<SampleDetails> {
    const cacheKey = `sample:${sampleNo}:details`;
    
    // Check cache first
    if (config.features.caching) {
      const cached = await this.cache.get<SampleDetails>(cacheKey);
      if (cached) {
        logger.debug({ sampleNo }, 'Sample details retrieved from cache');
        return cached;
      }
    }

    // Get sample summary
    const summary = await this.getSampleSummary(sampleNo);

    // Get runs for the sample
    const runs = await this.prisma.predictionRun.findMany({
      where: { sampleNo },
      orderBy: { predictAt: 'desc' },
      take: 10, // Limit to recent runs for performance
      include: {
        wellPredictions: true,
        rowCounts: true,
        inferenceResults: true,
      }
    });

    // Calculate statistics
    const statistics = this.calculateRunStatistics(runs);

    // Transform to response format
    const result: SampleDetails = {
      ...summary,
      ...(runs[0]?.submissionNo ? { submissionNo: runs[0].submissionNo } : {}),
      firstRunAt: runs[runs.length - 1]?.predictAt || null,
      status: this.determineSampleStatus(runs),
      runs: runs.map((run: any) => this.transformRunSummary(run)),
    } as SampleDetails;

    // Cache result
    if (config.features.caching) {
      await this.cache.set(cacheKey, result, config.cache.ttl);
    }

    logger.info({ sampleNo, totalRuns: runs.length }, 'Sample details retrieved');
    return result;
  }

  async getSampleRuns(
    sampleNo: string, 
    options: PaginationOptions
  ): Promise<PaginatedResult<PredictionRunSummary>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    try {
      // Call prediction-db-service to get runs for specific sample
      const predictionResponse = await axios.get(`${this.predictionDbServiceUrl}/api/v1/predictions/sample/${sampleNo}`, {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
        },
      });

      if (!predictionResponse.data.success) {
        throw new Error('Failed to fetch sample runs');
      }

      const predictionData = predictionResponse.data.data;
      const runs = predictionData.runs || [];
      const pagination = predictionData.pagination || {};

      // Debug: Log the raw data from prediction-db-service
      logger.info({ sampleNo, runsCount: runs.length }, 'Raw runs data from prediction-db-service');
      if (runs.length > 0) {
        logger.info({ 
          sampleNo, 
          firstRun: {
            id: runs[0].id,
            runId: runs[0].id,
            hasInferenceResults: !!runs[0].inferenceResults,
            inferenceResultsCount: runs[0].inferenceResults?.length || 0,
            inferenceResults: runs[0].inferenceResults
          }
        }, 'First run details');
      }

      const data = runs.map((run: any) => this.transformRunSummary(run));

      const result: PaginatedResult<PredictionRunSummary> = {
        data,
        pagination: {
          page: pagination.page || page,
          limit: pagination.limit || limit,
          total: pagination.total || 0,
          totalPages: pagination.totalPages || 0,
          hasNext: pagination.hasNext || false,
          hasPrev: pagination.hasPrev || false,
        },
      };

      logger.info({ sampleNo, page, limit, total: result.pagination.total }, 'Sample runs retrieved from prediction-db-service');
      return result;
    } catch (error) {
      logger.error(`Failed to get runs for sample ${sampleNo}:`, String(error));
      throw new Error('Failed to fetch sample runs');
    }
  }

  async getRunDetails(runId: number): Promise<PredictionRunDetails> {
    const cacheKey = `run:${runId}:details`;
    
    // Check cache first
    if (config.features.caching) {
      const cached = await this.cache.get<PredictionRunDetails>(cacheKey);
      if (cached) {
        logger.debug({ runId }, 'Run details retrieved from cache');
        return cached;
      }
    }

    try {
      // Call prediction-db-service to get run details
      const predictionResponse = await axios.get(`${this.predictionDbServiceUrl}/api/v1/predictions/${runId}`);

      if (!predictionResponse.data.success) {
        throw new Error('Failed to fetch run details');
      }

      const run = predictionResponse.data.data;
      const result = this.transformRunDetails(run);

      // Cache result
      if (config.features.caching) {
        await this.cache.set(cacheKey, result, config.cache.ttl);
      }

      logger.info({ runId, sampleNo: run.sampleNo }, 'Run details retrieved from prediction-db-service');
      return result;
    } catch (error) {
      logger.error(`Failed to get run details for ${runId}:`, String(error));
      throw new Error('Failed to fetch run details');
    }
  }

  async getLastRun(sampleNo: string): Promise<PredictionRunSummary> {
    const cacheKey = `sample:${sampleNo}:last-run`;
    
    // Check cache first
    if (config.features.caching) {
      const cached = await this.cache.get<PredictionRunSummary>(cacheKey);
      if (cached) {
        logger.debug({ sampleNo }, 'Last run retrieved from cache');
        return cached;
      }
    }

    const run = await this.prisma.predictionRun.findFirst({
      where: { sampleNo },
      orderBy: { predictAt: 'desc' },
      include: {
        wellPredictions: true,
        rowCounts: true
      }
    });

    if (!run) {
      throw createError.notFound('Prediction run for sample', sampleNo);
    }

    const result = this.transformRunSummary(run);

    // Cache result
    if (config.features.caching) {
      await this.cache.set(cacheKey, result, config.cache.ttl);
    }

    logger.info({ sampleNo, runId: run.id }, 'Last run retrieved');
    return result;
  }

  async getSamples(
    options: PaginationOptions & { filters?: any }
  ): Promise<PaginatedResult<SampleSummary>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc', filters = {} } = options;

    try {
      // Call prediction-db-service to get prediction runs
      const predictionResponse = await axios.get(`${this.predictionDbServiceUrl}/api/v1/predictions`, {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
          ...(filters.search && { sampleNo: filters.search }),
          ...(filters.status && { status: filters.status }),
          ...(filters.dateFrom && { startDate: filters.dateFrom }),
          ...(filters.dateTo && { endDate: filters.dateTo }),
        },
      });

      if (!predictionResponse.data.success) {
        throw new Error('Failed to fetch prediction runs');
      }

      const predictionData = predictionResponse.data.data;
      const runs = predictionData.runs || [];
      const pagination = predictionData.pagination || {};

      // Group runs by sampleNo and create sample summaries
      const sampleMap = new Map<string, any>();
      
      for (const run of runs) {
        const sampleNo = run.sampleNo;
        if (!sampleMap.has(sampleNo)) {
          sampleMap.set(sampleNo, {
            sampleNo,
            summary: { distribution: {} },
            totalRuns: 0,
            lastRunAt: null,
            lastRunId: null,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
          });
        }
        
        const sample = sampleMap.get(sampleNo);
        sample.totalRuns++;
        
        // Update last run info
        if (!sample.lastRunAt || new Date(run.createdAt) > new Date(sample.lastRunAt)) {
          sample.lastRunAt = run.createdAt;
          sample.lastRunId = run.id;
        }
        
        // Update summary from inference results
        if (run.inferenceResults && run.inferenceResults.length > 0) {
          const inferenceResult = run.inferenceResults[0];
          if (inferenceResult.results && inferenceResult.results.distribution) {
            const dist = inferenceResult.results.distribution;
            for (const [key, value] of Object.entries(dist)) {
              if (key !== 'total') {
                sample.summary.distribution[key] = (sample.summary.distribution[key] || 0) + (value as number);
              }
            }
          }
        }
      }

      const data = Array.from(sampleMap.values());

      const result: PaginatedResult<SampleSummary> = {
        data,
        pagination: {
          page: pagination.page || page,
          limit: pagination.limit || limit,
          total: pagination.total || data.length,
          totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / limit),
          hasNext: pagination.hasNext || false,
          hasPrev: pagination.hasPrev || false,
        },
      };

      logger.info({ page, limit, total: result.pagination.total, filters }, 'Samples retrieved from prediction-db-service');
      return result;
    } catch (error) {
      logger.error('Failed to get samples from prediction-db-service:', String(error));
      throw new Error('Failed to fetch samples');
    }
  }

  async getSystemStatistics(filters?: any): Promise<SystemStatistics> {
    const cacheKey = 'system:statistics';
    
    // Check cache first
    if (config.features.caching) {
      const cached = await this.cache.get<SystemStatistics>(cacheKey);
      if (cached) {
        logger.debug({}, 'System statistics retrieved from cache');
        return cached;
      }
    }

    // Build date filter
    const dateFilter: any = {};
    if (filters?.dateFrom) {
      dateFilter.gte = new Date(filters.dateFrom);
    }
    if (filters?.dateTo) {
      dateFilter.lte = new Date(filters.dateTo);
    }

    // Get aggregated statistics
    const [
      totalSamples,
      totalRuns,
      completedRuns,
      failedRuns,
      runsWithTime,
      modelStats
    ] = await Promise.all([
      this.prisma.sampleSummary.count(),
      this.prisma.predictionRun.count({
        where: Object.keys(dateFilter).length > 0 ? { predictAt: dateFilter } : {}
      }),
      this.prisma.predictionRun.count({
        where: {
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 ? { predictAt: dateFilter } : {})
        }
      }),
      this.prisma.predictionRun.count({
        where: {
          status: 'failed',
          ...(Object.keys(dateFilter).length > 0 ? { predictAt: dateFilter } : {})
        }
      }),
      this.prisma.predictionRun.findMany({
        where: {
          status: 'completed',
          processingTimeMs: { not: null },
          ...(Object.keys(dateFilter).length > 0 ? { predictAt: dateFilter } : {})
        },
        select: { processingTimeMs: true }
      }),
      this.prisma.predictionRun.groupBy({
        by: ['modelVersion'],
        where: {
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 ? { predictAt: dateFilter } : {})
        },
        _count: { id: true },
        _avg: { processingTimeMs: true }
      })
    ]);

    // Calculate averages
    const averageProcessingTimeMs = runsWithTime.length > 0
      ? runsWithTime.reduce((sum: number, run: { processingTimeMs: number | null }) => sum + (run.processingTimeMs || 0), 0) / runsWithTime.length
      : 0;

    const successRate = totalRuns > 0 ? completedRuns / totalRuns : 0;

    // Get daily statistics (simplified)
    const dailyStats = await this.getDailyStatistics(filters);

    // Transform model performance data
    const modelPerformance: Record<string, any> = {};
    modelStats.forEach((stat: any) => {
      if (stat.modelVersion) {
        modelPerformance[stat.modelVersion] = {
          totalRuns: stat._count.id,
          successRate: 1.0, // Simplified - would need actual calculation
          averageConfidence: 0.85, // Simplified - would need actual calculation
        };
      }
    });

    const result: SystemStatistics = {
      totalSamples,
      totalRuns,
      activeSamples: totalSamples, // Simplified
      completedRuns,
      failedRuns,
      averageProcessingTimeMs,
      successRate,
      dailyStats,
      modelPerformance,
    };

    // Cache result
    if (config.features.caching) {
      await this.cache.set(cacheKey, result, config.cache.ttl);
    }

    logger.info({ totalSamples, totalRuns }, 'System statistics retrieved');
    return result;
  }

  async getSampleTrends(sampleNo: string): Promise<SampleTrends> {
    const cacheKey = `sample:${sampleNo}:trends`;
    
    // Check cache first
    if (config.features.caching) {
      const cached = await this.cache.get<SampleTrends>(cacheKey);
      if (cached) {
        logger.debug({ sampleNo }, 'Sample trends retrieved from cache');
        return cached;
      }
    }

    const runs = await this.prisma.predictionRun.findMany({
      where: { sampleNo },
      orderBy: { predictAt: 'asc' },
      include: {
        wellPredictions: true,
        inferenceResults: true,
      }
    });

    const confidenceTrend = runs.map((run: any) => ({
      runId: run.id,
      predictAt: run.predictAt,
      averageConfidence: this.calculateAverageConfidence(run.wellPredictions),
    }));

    const distributionTrend = runs.map((run: any) => {
      const inferenceResult = run.inferenceResults[0];
      const distribution = inferenceResult?.results as any;
      
      return {
        runId: run.id,
        predictAt: run.predictAt,
        positiveCount: distribution?.distribution?.positive || 0,
        negativeCount: distribution?.distribution?.negative || 0,
      };
    });

    const result: SampleTrends = {
      sampleNo,
      trends: {
        confidenceTrend,
        distributionTrend,
      }
    };

    // Cache result
    if (config.features.caching) {
      await this.cache.set(cacheKey, result, config.cache.ttl);
    }

    logger.info({ sampleNo, runCount: runs.length }, 'Sample trends retrieved');
    return result;
  }

  // Helper methods
  private transformRunSummary(run: any): PredictionRunSummary {
    // Debug: Log inference results transformation
    logger.info({ 
      runId: run.id,
      hasInferenceResults: !!run.inferenceResults,
      inferenceResultsCount: run.inferenceResults?.length || 0,
      inferenceResults: run.inferenceResults
    }, 'Transforming run summary');

    return {
      runId: run.id,
      predictAt: run.predictAt,
      modelVersion: run.modelVersion,
      status: run.status,
      processingTimeMs: run.processingTimeMs,
      statistics: this.calculateRunStatistics([run])[0] || {
        totalDetections: 0,
        positiveCount: 0,
        negativeCount: 0,
        averageConfidence: 0,
      },
      inferenceResults: run.inferenceResults || [],
      wellPredictions: run.wellPredictions || []
    };
  }

  private transformRunDetails(run: any): PredictionRunDetails {
    const rowCounts = run.rowCounts[0]?.counts || {};
    const inferenceResults = run.inferenceResults[0]?.results || {};

    return {
      runId: run.id,
      sampleNo: run.sampleNo,
      submissionNo: run.submissionNo,
      description: run.description,
      predictAt: run.predictAt,
      modelVersion: run.modelVersion,
      status: run.status,
      processingTimeMs: run.processingTimeMs,
      errorMsg: run.errorMsg,
      rawImageUrl: run.rawImagePath,
      annotatedImageUrl: run.annotatedImagePath,
      statistics: this.calculateRunStatistics([run])[0] || {
        totalDetections: 0,
        positiveCount: 0,
        negativeCount: 0,
        invalidCount: 0,
        averageConfidence: 0,
      },
      rowCounts: rowCounts as Record<string, number>,
      inferenceResults: inferenceResults as any,
      wellPredictions: run.wellPredictions.map((wp: any) => ({
        wellId: wp.wellId,
        label: wp.label,
        class: wp.class_,
        confidence: wp.confidence,
        bbox: wp.bbox,
      })),
    };
  }

  private calculateRunStatistics(runs: any[]): any[] {
    return runs.map(run => {
      const wellPredictions = run.wellPredictions || [];
      const totalDetections = wellPredictions.length;
      const positiveCount = wellPredictions.filter((wp: any) => wp.class_ === 'positive').length;
      const negativeCount = wellPredictions.filter((wp: any) => wp.class_ === 'negative').length;
      const invalidCount = wellPredictions.filter((wp: any) => wp.class_ === 'invalid').length;
      
      const averageConfidence = totalDetections > 0
        ? wellPredictions.reduce((sum: number, wp: any) => sum + wp.confidence, 0) / totalDetections
        : 0;

      return {
        totalDetections,
        positiveCount,
        negativeCount,
        invalidCount,
        averageConfidence,
      };
    });
  }

  private calculateAverageConfidence(wellPredictions: any[]): number {
    if (wellPredictions.length === 0) return 0;
    
    const totalConfidence = wellPredictions.reduce((sum: number, wp: any) => sum + wp.confidence, 0);
    return totalConfidence / wellPredictions.length;
  }

  private determineSampleStatus(runs: any[]): 'active' | 'completed' | 'failed' {
    if (runs.length === 0) return 'active';
    
    const latestRun = runs[0];
    if (latestRun.status === 'failed') return 'failed';
    if (latestRun.status === 'completed') return 'completed';
    return 'active';
  }

  private async getDailyStatistics(filters?: any): Promise<any[]> {
    // Simplified implementation - would need proper date grouping
    return [
      {
        date: new Date().toISOString().split('T')[0],
        samplesProcessed: 25,
        runsCompleted: 75,
        averageConfidence: 0.87,
      }
    ];
  }

  // Cache invalidation methods
  async invalidateSampleCache(sampleNo: string): Promise<void> {
    const keys = [
      `sample:${sampleNo}:summary`,
      `sample:${sampleNo}:details`,
      `sample:${sampleNo}:last-run`,
      `sample:${sampleNo}:trends`,
    ];

    await Promise.all(keys.map(key => this.cache.del(key)));
    logger.info({ sampleNo }, 'Sample cache invalidated');
  }

  async invalidateRunCache(runId: number): Promise<void> {
    await this.cache.del(`run:${runId}:details`);
    logger.info({ runId }, 'Run cache invalidated');
  }

  async invalidateSystemCache(): Promise<void> {
    await this.cache.del('system:statistics');
    logger.info({}, 'System cache invalidated');
  }

  async getInterfaceFiles(sampleNo: string): Promise<any[]> {
    try {
      // Call labware-interface-service to get interface files
      const labwareResponse = await axios.get(`${process.env.LABWARE_SERVICE_URL || 'http://localhost:6405'}/api/v1/interface/files/${sampleNo}`);

      if (!labwareResponse.data.success) {
        throw new Error('Failed to fetch interface files');
      }

      const files = labwareResponse.data.data || [];
      logger.info({ sampleNo, fileCount: files.length }, 'Interface files retrieved from labware-service');
      return files;
    } catch (error) {
      logger.error(`Failed to get interface files for sample ${sampleNo}:`, String(error));
      // Return empty array if service is not available
      return [];
    }
  }
}
