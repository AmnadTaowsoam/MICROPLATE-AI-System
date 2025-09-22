import { PrismaClient } from '@prisma/client';
import { AggregationService } from '@/types/result.types';
import { logger } from '@/utils/logger';
import { createError } from '@/utils/errors';

export class AggregationServiceImpl implements AggregationService {
  constructor(private prisma: PrismaClient) {}

  async updateSampleSummary(sampleNo: string): Promise<void> {
    try {
      logger.info('Starting sample summary update', { sampleNo });

      // Get all interface results for the sample
      const interfaceResults = await this.prisma.inferenceResult.findMany({
        where: {
          run: { sampleNo }
        },
        include: { run: true },
        orderBy: { run: { predictAt: 'desc' } }
      });

      if (interfaceResults.length === 0) {
        logger.warn('No interface results found for sample', { sampleNo });
        return;
      }

      // Calculate aggregated distribution
      const distribution = this.calculateDistribution(interfaceResults);

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
          lastRunId: latestRun?.id,
        },
        create: {
          sampleNo,
          summary: summary as any,
          totalRuns: runStats._count.id,
          lastRunAt: runStats._max.predictAt,
          lastRunId: latestRun?.id,
        }
      });

      logger.info('Sample summary updated successfully', { 
        sampleNo, 
        totalRuns: runStats._count.id,
        distribution 
      });

    } catch (error) {
      logger.error('Failed to update sample summary', { sampleNo, error });
      throw createError.database('Failed to update sample summary', { sampleNo, error });
    }
  }

  calculateDistribution(interfaceResults: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const result of interfaceResults) {
      const resultData = result.results as any;
      const resultDistribution = resultData?.distribution || {};
      
      for (const [key, value] of Object.entries(resultDistribution)) {
        if (typeof value === 'number') {
          distribution[key] = (distribution[key] || 0) + value;
        }
      }
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
      const totalConfidence = wellPredictions.reduce((sum, wp) => sum + wp.confidence, 0);
      const averageConfidence = totalConfidence / wellPredictions.length;

      // Calculate high confidence percentage (confidence > 0.8)
      const highConfidenceCount = wellPredictions.filter(wp => wp.confidence > 0.8).length;
      const highConfidencePercentage = (highConfidenceCount / wellPredictions.length) * 100;

      // Calculate well detection accuracy (simplified - would need ground truth)
      const validDetections = wellPredictions.filter(wp => wp.class_ !== 'invalid').length;
      const wellDetectionAccuracy = (validDetections / wellPredictions.length) * 100;

      return {
        average_confidence: Math.round(averageConfidence * 1000) / 1000, // Round to 3 decimal places
        high_confidence_percentage: Math.round(highConfidencePercentage * 10) / 10, // Round to 1 decimal place
        well_detection_accuracy: Math.round(wellDetectionAccuracy * 10) / 10, // Round to 1 decimal place
      };

    } catch (error) {
      logger.error('Failed to calculate quality metrics', { sampleNo, error });
      return {
        average_confidence: 0,
        high_confidence_percentage: 0,
        well_detection_accuracy: 0,
      };
    }
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
    logger.info('Starting batch sample summary update', { count: sampleNos.length });

    const results = await Promise.allSettled(
      sampleNos.map(sampleNo => this.updateSampleSummary(sampleNo))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info('Batch sample summary update completed', { 
      total: sampleNos.length,
      successful,
      failed 
    });

    if (failed > 0) {
      const failedSamples = sampleNos.filter((_, index) => results[index].status === 'rejected');
      logger.error('Some sample summaries failed to update', { failedSamples });
    }
  }

  // Update all sample summaries (use with caution)
  async updateAllSampleSummaries(): Promise<void> {
    logger.info('Starting full sample summary update');

    try {
      // Get all unique sample numbers
      const samples = await this.prisma.predictionRun.findMany({
        select: { sampleNo: true },
        distinct: ['sampleNo']
      });

      const sampleNos = samples.map(s => s.sampleNo);
      
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

      logger.info('Full sample summary update completed', { totalSamples: sampleNos.length });

    } catch (error) {
      logger.error('Failed to update all sample summaries', { error });
      throw createError.database('Failed to update all sample summaries', { error });
    }
  }

  // Recalculate statistics for a specific time range
  async recalculateStatisticsForDateRange(startDate: Date, endDate: Date): Promise<void> {
    logger.info('Starting statistics recalculation for date range', { startDate, endDate });

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

      const sampleNos = samples.map(s => s.sampleNo);
      await this.updateMultipleSampleSummaries(sampleNos);

      logger.info('Statistics recalculation completed', { 
        sampleCount: sampleNos.length,
        startDate,
        endDate 
      });

    } catch (error) {
      logger.error('Failed to recalculate statistics for date range', { error });
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
        logger.warn('Sample summary inconsistency detected', { 
          sampleNo,
          storedRuns: summary.totalRuns,
          actualRuns: actualRunCount,
          storedLastRunId: summary.lastRunId,
          actualLastRunId: actualLastRun?.id,
        });
      }

      return isConsistent;

    } catch (error) {
      logger.error('Failed to validate sample summary', { sampleNo, error });
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
      logger.error('Failed to get aggregation stats', { error });
      throw createError.database('Failed to get aggregation stats', { error });
    }
  }

  private async getInconsistentSamples(): Promise<string[]> {
    // This would need to be implemented with a more efficient query
    // For now, we'll return an empty array
    return [];
  }
}
