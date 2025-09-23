import { PrismaClient } from '@prisma/client';
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

export class ResultServiceImpl implements ResultService {
  constructor(
    private prisma: PrismaClient,
    private cache: CacheService
  ) {}

  async getSampleSummary(sampleNo: string): Promise<SampleSummary> {
    const cacheKey = `sample:${sampleNo}:summary`;
    
    // Check cache first
    if (config.features.caching) {
      const cached = await this.cache.get<SampleSummary>(cacheKey);
      if (cached) {
        logger.debug({ sampleNo }, 'Sample summary retrieved from cache');
        return cached;
      }
    }

    // Query database
    const summary = await this.prisma.sampleSummary.findUnique({
      where: { sampleNo }
    });

    if (!summary) {
      throw createError.notFound('Sample', sampleNo);
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
    const { page, limit, sortBy = 'predictAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      this.prisma.predictionRun.findMany({
        where: { sampleNo },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          wellPredictions: true,
          rowCounts: true,
        }
      }),
      this.prisma.predictionRun.count({
        where: { sampleNo }
      })
    ]);

    const data = runs.map((run: any) => this.transformRunSummary(run));

    const result: PaginatedResult<PredictionRunSummary> = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      }
    };

    logger.info({ sampleNo, page, limit, total }, 'Sample runs retrieved');
    return result;
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

    const run = await this.prisma.predictionRun.findUnique({
      where: { id: runId },
      include: {
        wellPredictions: true,
        rowCounts: true,
        inferenceResults: true,
        imageFiles: {
          select: {
            fileType: true,
            signedUrl: true,
            urlExpiresAt: true,
          }
        }
      }
    });

    if (!run) {
      throw createError.notFound('Prediction run', runId);
    }

    // Transform to response format
    const result = this.transformRunDetails(run);

    // Cache result
    if (config.features.caching) {
      await this.cache.set(cacheKey, result, config.cache.ttl);
    }

    logger.info({ runId, sampleNo: run.sampleNo }, 'Run details retrieved');
    return result;
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
        rowCounts: true,
        imageFiles: {
          where: { fileType: 'annotated' },
          select: {
            signedUrl: true,
            urlExpiresAt: true,
          }
        }
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
    const { page, limit, sortBy = 'lastRunAt', sortOrder = 'desc', filters = {} } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (filters.search) {
      where.sampleNo = {
        contains: filters.search,
        mode: 'insensitive'
      };
    }

    if (filters.status) {
      // This would need to be implemented based on business logic
      // For now, we'll skip status filtering
    }

    if (filters.dateFrom || filters.dateTo) {
      where.lastRunAt = {};
      if (filters.dateFrom) {
        where.lastRunAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.lastRunAt.lte = new Date(filters.dateTo);
      }
    }

    const [samples, total] = await Promise.all([
      this.prisma.sampleSummary.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.sampleSummary.count({ where })
    ]);

    const data = samples.map((sample: any) => ({
      sampleNo: sample.sampleNo,
      summary: sample.summary as any,
      totalRuns: sample.totalRuns,
      lastRunAt: sample.lastRunAt,
      lastRunId: sample.lastRunId,
      createdAt: sample.createdAt,
      updatedAt: sample.updatedAt,
    }));

    const result: PaginatedResult<SampleSummary> = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      }
    };

    logger.info({ page, limit, total, filters }, 'Samples retrieved');
    return result;
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
      }
    };
  }

  private transformRunDetails(run: any): PredictionRunDetails {
    const rowCounts = run.rowCounts[0]?.counts || {};
    const inferenceResults = run.inferenceResults[0]?.results || {};
    
    const rawImage = run.imageFiles.find((img: any) => img.fileType === 'raw');
    const annotatedImage = run.imageFiles.find((img: any) => img.fileType === 'annotated');

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
      rawImageUrl: rawImage?.signedUrl,
      annotatedImageUrl: annotatedImage?.signedUrl,
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
}
