import { PrismaClient } from '@prisma/client';
import { AggregationService } from '@/types/result.types';
import { logger } from '@/utils/logger';
import { createError } from '@/utils/errors';

export class AggregationServiceImpl implements AggregationService {
  constructor(private prisma: PrismaClient) {}

  async updateSampleSummary(sampleNo: string): Promise<void> {
    try {
      logger.info({ sampleNo }, 'Starting sample summary update');

      // Get all interface results for the sample
      const inferenceResults = await this.prisma.inferenceResult.findMany({
        where: {
          run: { sampleNo }
        },
        include: { run: true },
        orderBy: { run: { predictAt: 'desc' } }
      });

      if (inferenceResults.length === 0) {
        logger.warn({ sampleNo }, 'No inference results found for sample');
        return;
      }

      // Debug: Log inference results for TEST006
      if (sampleNo === 'TEST006') {
        logger.info({ sampleNo, inferenceResultsCount: inferenceResults.length }, 'Found inference results for TEST006');
        inferenceResults.forEach((result, index) => {
          logger.info({ 
            sampleNo, 
            index, 
            runId: result.runId, 
            results: result.results 
          }, `Inference result ${index + 1} for TEST006`);
        });
      }

      // Calculate aggregated distribution
      const distribution = this.calculateDistribution(inferenceResults);

      // Debug: Log calculated distribution for TEST006
      if (sampleNo === 'TEST006') {
        logger.info({ sampleNo, distribution }, 'Calculated distribution for TEST006');
      }

      // Get run statistics
      const runStats = await this.prisma.predictionRun.aggregate({
        where: { sampleNo },
        _count: { id: true },
        _max: { predictAt: true },
        _min: { predictAt: true }
      });

      // Get the latest run ID
      const latestRun = await this.prisma.predictionRun.findFirst({
        where: { sampleNo },
        orderBy: { predictAt: 'desc' },
        select: { id: true }
      });

      // Calculate additional metrics
      const qualityMetrics = await this.calculateQualityMetrics(sampleNo);
      const concentration = this.calculateConcentration(distribution);

      // Prepare summary data
      const summary = {
        distribution,
        concentration,
        quality_metrics: qualityMetrics,
      };

      // Update or create sample summary
      await this.prisma.sampleSummary.upsert({
        where: { sampleNo },
        update: {
          summary: summary as any,
          totalRuns: runStats._count.id,
          lastRunAt: runStats._max.predictAt,
          lastRunId: latestRun?.id ?? null,
        },
        create: {
          sampleNo,
          summary: summary as any,
          totalRuns: runStats._count.id,
          lastRunAt: runStats._max.predictAt,
          lastRunId: latestRun?.id ?? null,
        }
      });

      logger.info({ 
        sampleNo, 
        totalRuns: runStats._count.id,
        distribution 
      }, 'Sample summary updated successfully');

    } catch (error) {
      logger.error({ sampleNo, error }, 'Failed to update sample summary');
      throw createError.database('Failed to update sample summary', { sampleNo, error });
    }
  }

  calculateDistribution(inferenceResults: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    // Debug: Check if this is for TEST006
    const isTest006 = inferenceResults.length > 0 && inferenceResults[0].run?.sampleNo === 'TEST006';

    for (const result of inferenceResults) {
      const resultData = result.results as any;
      const resultDistribution = resultData?.distribution || {};
      
      // Debug: Log individual result for TEST006
      if (isTest006) {
        logger.info({ 
          runId: result.runId, 
          resultDistribution 
        }, 'Processing inference result for TEST006');
      }
      
      for (const [key, value] of Object.entries(resultDistribution)) {
        if (typeof value === 'number') {
          const oldValue = distribution[key] || 0;
          distribution[key] = oldValue + value;
          
          // Debug: Log calculation for TEST006
          if (isTest006) {
            logger.info({ 
              runId: result.runId,
              key, 
              oldValue, 
              value, 
              newValue: distribution[key] 
            }, `Distribution calculation for TEST006: ${key} = ${oldValue} + ${value} = ${distribution[key]}`);
          }
        }
      }
    }

    // Debug: Log final distribution for TEST006
    if (isTest006) {
      logger.info({ distribution }, 'Final calculated distribution for TEST006');
    }

    return distribution;
  }

  private async calculateQualityMetrics(sampleNo: string): Promise<any> {
    try {
      // Get all well predictions for the sample
      const wellPredictions = await this.prisma.wellPrediction.findMany({
        where: {
          run: { sampleNo }
        },
        select: {
          confidence: true,
          class_: true,
        }
      });

      if (wellPredictions.length === 0) {
        return {
          average_confidence: 0,
          high_confidence_percentage: 0,
          well_detection_accuracy: 0,
        };
      }

      // Calculate average confidence
      const totalConfidence = wellPredictions.reduce((sum: number, wp: { confidence: number }) => sum + wp.confidence, 0);
      const averageConfidence = totalConfidence / wellPredictions.length;

      // Calculate high confidence percentage (confidence > 0.8)
      const highConfidenceCount = wellPredictions.filter((wp: { confidence: number }) => wp.confidence > 0.8).length;
      const highConfidencePercentage = (highConfidenceCount / wellPredictions.length) * 100;

      // Calculate well detection accuracy (simplified - would need ground truth)
      const validDetections = wellPredictions.filter((wp: { class_: string }) => wp.class_ !== 'invalid').length;
      const wellDetectionAccuracy = (validDetections / wellPredictions.length) * 100;

      return {
        average_confidence: Math.round(averageConfidence * 1000) / 1000, // Round to 3 decimal places
        high_confidence_percentage: Math.round(highConfidencePercentage * 10) / 10, // Round to 1 decimal place
        well_detection_accuracy: Math.round(wellDetectionAccuracy * 10) / 10, // Round to 1 decimal place
      };

    } catch (error) {
      logger.error({ sampleNo, error }, 'Failed to calculate quality metrics');
      return {
        average_confidence: 0,
        high_confidence_percentage: 0,
        well_detection_accuracy: 0,
      };
    }
  }

  // Calculate basic statistics from runs
  calculateStatistics(runs: any[]): any {
    const totalDetections = runs.reduce((sum, run) => sum + (run.wellPredictions?.length || 0), 0);
    const positiveCount = runs.reduce((sum, run) => sum + (run.wellPredictions?.filter((wp: any) => wp.class_ === 'positive').length || 0), 0);
    const negativeCount = runs.reduce((sum, run) => sum + (run.wellPredictions?.filter((wp: any) => wp.class_ === 'negative').length || 0), 0);
    const invalidCount = runs.reduce((sum, run) => sum + (run.wellPredictions?.filter((wp: any) => wp.class_ === 'invalid').length || 0), 0);
    const avgConfidenceNumerator = runs.reduce((sum, run) => sum + (run.wellPredictions?.reduce((s: number, wp: any) => s + (wp.confidence || 0), 0) || 0), 0);
    const avgConfidenceDenominator = runs.reduce((sum, run) => sum + (run.wellPredictions?.length || 0), 0);
    const averageConfidence = avgConfidenceDenominator > 0 ? avgConfidenceNumerator / avgConfidenceDenominator : 0;

    return {
      totalDetections,
      positiveCount,
      negativeCount,
      invalidCount,
      averageConfidence,
    };
  }

  private calculateConcentration(distribution: Record<string, number>): any {
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
      return {
        positive_percentage: 0,
        negative_percentage: 0,
      };
    }

    const positiveCount = distribution.positive || 0;
    const negativeCount = distribution.negative || 0;
    
    return {
      positive_percentage: Math.round((positiveCount / total) * 100 * 100) / 100, // Round to 2 decimal places
      negative_percentage: Math.round((negativeCount / total) * 100 * 100) / 100, // Round to 2 decimal places
    };
  }

  // Batch update multiple sample summaries
  async updateMultipleSampleSummaries(sampleNos: string[]): Promise<void> {
    logger.info({ count: sampleNos.length }, 'Starting batch sample summary update');

    const results = await Promise.allSettled(
      sampleNos.map(sampleNo => this.updateSampleSummary(sampleNo))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info({ 
      total: sampleNos.length,
      successful,
      failed 
    }, 'Batch sample summary update completed');

    if (failed > 0) {
      const failedSamples = sampleNos.filter((_: string, index: number) => (results[index] as PromiseSettledResult<void>).status === 'rejected');
      logger.error({ failedSamples }, 'Some sample summaries failed to update');
    }
  }

  // Update all sample summaries (use with caution)
  async updateAllSampleSummaries(): Promise<void> {
    logger.info({}, 'Starting full sample summary update');

    try {
      // Get all unique sample numbers
      const samples = await this.prisma.predictionRun.findMany({
        select: { sampleNo: true },
        distinct: ['sampleNo']
      });

      const sampleNos = samples.map((s: { sampleNo: string }) => s.sampleNo);
      
      // Process in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < sampleNos.length; i += batchSize) {
        const batch = sampleNos.slice(i, i + batchSize);
        await this.updateMultipleSampleSummaries(batch);
        
        // Small delay between batches
        if (i + batchSize < sampleNos.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info({ totalSamples: sampleNos.length }, 'Full sample summary update completed');

    } catch (error) {
      logger.error({ error }, 'Failed to update all sample summaries');
      throw createError.database('Failed to update all sample summaries', { error });
    }
  }

  // Recalculate statistics for a specific time range
  async recalculateStatisticsForDateRange(startDate: Date, endDate: Date): Promise<void> {
    logger.info({ startDate, endDate }, 'Starting statistics recalculation for date range');

    try {
      // Get samples that have runs in the date range
      const samples = await this.prisma.predictionRun.findMany({
        where: {
          predictAt: {
            gte: startDate,
            lte: endDate,
          }
        },
        select: { sampleNo: true },
        distinct: ['sampleNo']
      });

      const sampleNos = samples.map((s: { sampleNo: string }) => s.sampleNo);
      await this.updateMultipleSampleSummaries(sampleNos);

      logger.info({ 
        sampleCount: sampleNos.length,
        startDate,
        endDate 
      }, 'Statistics recalculation completed');

    } catch (error) {
      logger.error({ error }, 'Failed to recalculate statistics for date range');
      throw createError.database('Failed to recalculate statistics for date range', { error });
    }
  }

  // Validate sample summary consistency
  async validateSampleSummary(sampleNo: string): Promise<boolean> {
    try {
      const summary = await this.prisma.sampleSummary.findUnique({
        where: { sampleNo }
      });

      if (!summary) {
        return false;
      }

      // Get actual run count
      const actualRunCount = await this.prisma.predictionRun.count({
        where: { sampleNo }
      });

      // Get actual last run
      const actualLastRun = await this.prisma.predictionRun.findFirst({
        where: { sampleNo },
        orderBy: { predictAt: 'desc' },
        select: { id: true, predictAt: true }
      });

      // Validate consistency
      const isConsistent = 
        summary.totalRuns === actualRunCount &&
        summary.lastRunId === actualLastRun?.id &&
        summary.lastRunAt?.getTime() === actualLastRun?.predictAt.getTime();

      if (!isConsistent) {
        logger.warn({ 
          sampleNo,
          storedRuns: summary.totalRuns,
          actualRuns: actualRunCount,
          storedLastRunId: summary.lastRunId,
          actualLastRunId: actualLastRun?.id,
        }, 'Sample summary inconsistency detected');
      }

      return isConsistent;

    } catch (error) {
      logger.error({ sampleNo, error }, 'Failed to validate sample summary');
      return false;
    }
  }

  // Get aggregation statistics
  async getAggregationStats(): Promise<any> {
    try {
      const [
        totalSamples,
        totalRuns,
        lastUpdate,
        inconsistentSamples
      ] = await Promise.all([
        this.prisma.sampleSummary.count(),
        this.prisma.predictionRun.count(),
        this.prisma.sampleSummary.findFirst({
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        this.getInconsistentSamples()
      ]);

      return {
        totalSamples,
        totalRuns,
        lastUpdate: lastUpdate?.updatedAt,
        inconsistentSamples: inconsistentSamples.length,
        consistencyRate: totalSamples > 0 ? ((totalSamples - inconsistentSamples.length) / totalSamples) * 100 : 100,
      };

    } catch (error) {
      logger.error({ error }, 'Failed to get aggregation stats');
      throw createError.database('Failed to get aggregation stats', { error });
    }
  }

  private async getInconsistentSamples(): Promise<string[]> {
    // This would need to be implemented with a more efficient query
    // For now, we'll return an empty array
    return [];
  }
}
