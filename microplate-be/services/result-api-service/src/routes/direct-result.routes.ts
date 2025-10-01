import { Router } from 'express';
import { DirectResultService } from '@/services/direct-result.service';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { sendSuccess, sendError } from '@/utils/errors';
import { SampleNoSchema, RunIdSchema, PaginationSchema } from '@/schemas/result.schemas';

export function directResultRoutes(): Router {
  const router = Router();
  const prisma = new PrismaClient();
  const directResultService = new DirectResultService(prisma);

  // =========================
  // Sample Routes
  // =========================

  // GET /api/v1/results/direct/samples - Get all samples directly from database
  /**
   * @swagger
   * /api/v1/results/direct/samples:
   *   get:
   *     tags: [Direct Results]
   *     summary: Get all samples directly
   *     description: Get all samples directly from database
   *     responses:
   *       200:
   *         description: Successfully retrieved all samples
   */
  router.get('/samples', async (request, response) => {
    try {
      const result = await directResultService.getAllSamples();

      logger.info({ 
        requestId: (request as any).id || 'unknown'
      }, 'All samples retrieved directly from database');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        error 
      }, 'Failed to get all samples directly');
      return sendError(response, error as any);
    }
  });

  // GET /api/v1/results/direct/samples/:sampleNo/summary - Get sample summary directly from database
  /**
   * @swagger
   * /api/v1/results/direct/samples/{sampleNo}/summary:
   *   get:
   *     tags: [Direct Results]
   *     summary: Get sample summary directly
   *     description: Get sample summary directly from database without going through prediction-db-service
   *     parameters:
   *       - in: path
   *         name: sampleNo
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved sample summary
   */
  router.get('/samples/:sampleNo/summary', async (request, response) => {
    try {
      const sampleNo = SampleNoSchema.parse(request.params.sampleNo);
      const result = await directResultService.getSampleSummary(sampleNo);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        sampleNo
      }, 'Sample summary retrieved directly from database');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        sampleNo: request.params.sampleNo,
        error 
      }, 'Failed to get sample summary directly');
      return sendError(response, error as any);
    }
  });

  // GET /api/v1/results/direct/samples/:sampleNo/runs - Get sample runs directly from database
  /**
   * @swagger
   * /api/v1/results/direct/samples/{sampleNo}/runs:
   *   get:
   *     tags: [Direct Results]
   *     summary: Get sample runs directly
   *     description: Get sample runs directly from database with full inference results included
   *     parameters:
   *       - in: path
   *         name: sampleNo
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: createdAt
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: Successfully retrieved sample runs
   */
  router.get('/samples/:sampleNo/runs', async (request, response) => {
    try {
      const sampleNo = SampleNoSchema.parse(request.params.sampleNo);
      const paginationOptions = PaginationSchema.parse(request.query);
      
      const result = await directResultService.getSampleRuns(sampleNo, paginationOptions as any);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      }, 'Sample runs retrieved directly from database');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        sampleNo: request.params.sampleNo,
        error 
      }, 'Failed to get sample runs directly');
      return sendError(response, error as any);
    }
  });

  // =========================
  // Run Routes
  // =========================

  // GET /api/v1/results/direct/runs/:runId - Get run details directly from database
  /**
   * @swagger
   * /api/v1/results/direct/runs/{runId}:
   *   get:
   *     tags: [Direct Results]
   *     summary: Get run details directly
   *     description: Get run details directly from database with full inference results included
   *     parameters:
   *       - in: path
   *         name: runId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Successfully retrieved run details
   */
  router.get('/runs/:runId', async (request, response) => {
    try {
      const runId = RunIdSchema.parse(request.params.runId);
      const result = await directResultService.getRunDetails(runId);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        runId,
        sampleNo: result.sampleNo
      }, 'Run details retrieved directly from database');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        runId: request.params.runId,
        error 
      }, 'Failed to get run details directly');
      return sendError(response, error as any);
    }
  });

  // DELETE /api/v1/results/direct/runs/:runId - Delete run and recalculate sample summary
  /**
   * @swagger
   * /api/v1/results/direct/runs/{runId}:
   *   delete:
   *     tags: [Direct Results]
   *     summary: Delete run and recalculate summary
   *     description: Delete a prediction run and automatically recalculate the sample summary
   *     parameters:
   *       - in: path
   *         name: runId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Successfully deleted run and recalculated summary
   */
  router.delete('/runs/:runId', async (request, response) => {
    try {
      const runId = RunIdSchema.parse(request.params.runId);
      
      // Get run details first to know which sample to recalculate
      const run = await prisma.predictionRun.findUnique({
        where: { id: runId },
        select: { sampleNo: true }
      });

      if (!run) {
        return response.status(404).json({ 
          success: false,
          error: { code: 'NOT_FOUND', message: 'Run not found' } 
        });
      }

      const sampleNo = run.sampleNo;

      // Delete related data first
      await prisma.wellPrediction.deleteMany({ where: { runId } });
      await prisma.rowCounts.deleteMany({ where: { runId } });
      await prisma.inferenceResult.deleteMany({ where: { runId } });

      // Delete the run
      await prisma.predictionRun.delete({ where: { id: runId } });

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        runId,
        sampleNo
      }, 'Run deleted successfully');

      // Recalculate sample summary
      await directResultService.recalculateSampleSummary(sampleNo);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        sampleNo
      }, 'Sample summary recalculated after run deletion');

      return sendSuccess(response, { 
        success: true,
        message: 'Run deleted and sample summary recalculated',
        sampleNo 
      });
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        runId: request.params.runId,
        error 
      }, 'Failed to delete run');
      return sendError(response, error as any);
    }
  });

  return router;
}
