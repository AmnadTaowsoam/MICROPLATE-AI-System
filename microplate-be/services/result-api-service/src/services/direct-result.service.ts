import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import type { 
  SampleSummary, 
  PredictionRunSummary, 
  PredictionRunDetails,
  PaginatedResult,
  PaginationOptions 
} from '@/types/result.types';

export class DirectResultService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // =========================
  // Sample Operations
  // =========================

  async getAllSamples(): Promise<SampleSummary[]> {
    logger.info('Getting all samples directly from database');
    
    const samples = await this.prisma.sampleSummary.findMany({
      orderBy: { createdAt: 'desc' }
    });

    logger.info({ count: samples.length }, 'All samples retrieved');
    return samples as SampleSummary[];
  }

  async getSampleSummary(sampleNo: string): Promise<SampleSummary> {
    logger.info({ sampleNo }, 'Getting sample summary directly from database');
    
    const sampleSummary = await this.prisma.sampleSummary.findUnique({
      where: { sampleNo },
    });

    if (!sampleSummary) {
      throw new Error(`Sample ${sampleNo} not found`);
    }

    logger.info({ sampleNo, summary: sampleSummary }, 'Sample summary retrieved');
    return sampleSummary as SampleSummary;
  }

  async getSampleRuns(
    sampleNo: string, 
    options: PaginationOptions
  ): Promise<PaginatedResult<PredictionRunSummary>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;
    
    logger.info({ sampleNo, page, limit, sortBy, sortOrder }, 'Getting sample runs directly from database');

    try {
      const [runs, total] = await Promise.all([
        this.prisma.predictionRun.findMany({
          where: { sampleNo },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            wellPredictions: true,
            rowCounts: true,
            inferenceResults: true, // ← ข้อมูลผูกกันอยู่แล้ว!
          },
        }),
        this.prisma.predictionRun.count({ where: { sampleNo } }),
      ]);

      // Debug: Log the raw data
      logger.info({ sampleNo, runsCount: runs.length, total }, 'Raw runs data from database');
      if (runs.length > 0) {
        const firstRun = runs[0];
        logger.info({ 
          sampleNo, 
          firstRun: {
            id: firstRun?.id,
            hasInferenceResults: !!firstRun?.inferenceResults,
            inferenceResultsCount: firstRun?.inferenceResults?.length || 0,
            inferenceResults: firstRun?.inferenceResults
          }
        }, 'First run details from database');
      }

      const data = runs.map((run: any) => this.transformRunSummary(run));

      const result: PaginatedResult<PredictionRunSummary> = {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1,
        },
      };

      logger.info({ sampleNo, page, limit, total: result.pagination.total }, 'Sample runs retrieved from database');
      return result;
    } catch (error) {
      logger.error(`Failed to get runs for sample ${sampleNo}:`, String(error));
      throw new Error('Failed to fetch sample runs');
    }
  }

  async getRunDetails(runId: number): Promise<PredictionRunDetails> {
    logger.info({ runId }, 'Getting run details directly from database');

    try {
      const run = await this.prisma.predictionRun.findUnique({
        where: { id: runId },
        include: {
          wellPredictions: true,
          rowCounts: true,
          inferenceResults: true,
        },
      });

      if (!run) {
        throw new Error(`Run ${runId} not found`);
      }

      // Debug: Log the raw data
      logger.info({ 
        runId,
        hasInferenceResults: !!run.inferenceResults,
        inferenceResultsCount: run.inferenceResults?.length || 0,
        inferenceResults: run.inferenceResults
      }, 'Run details from database');

      const result = this.transformRunDetails(run);

      logger.info({ runId, sampleNo: run.sampleNo }, 'Run details retrieved from database');
      return result;
    } catch (error) {
      logger.error(`Failed to get run details for ${runId}:`, String(error));
      throw new Error('Failed to fetch run details');
    }
  }

  // =========================
  // Helper Methods
  // =========================

  private transformRunSummary(run: any): PredictionRunSummary {
    // Debug: Log inference results transformation
    logger.info({ 
      runId: run.id,
      hasInferenceResults: !!run.inferenceResults,
      inferenceResultsCount: run.inferenceResults?.length || 0,
      inferenceResults: run.inferenceResults,
      rawImagePath: run.rawImagePath,
      annotatedImagePath: run.annotatedImagePath
    }, 'Transforming run summary');

    return {
      runId: run.id,
      sampleNo: run.sampleNo, // เพิ่ม sampleNo field
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
      wellPredictions: run.wellPredictions || [],
      // เพิ่มข้อมูลรูปภาพ
      rawImagePath: run.rawImagePath,
      annotatedImagePath: run.annotatedImagePath
    };
  }

  private transformRunDetails(run: any): PredictionRunDetails {
    const rowCounts = run.rowCounts[0]?.counts || {};
    const inferenceResults = run.inferenceResults[0]?.results || {};

    // Debug: Log inference results transformation
    logger.info({ 
      runId: run.id,
      hasInferenceResults: !!run.inferenceResults,
      inferenceResultsCount: run.inferenceResults?.length || 0,
      inferenceResults: run.inferenceResults,
      extractedResults: inferenceResults
    }, 'Transforming run details');

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
}
