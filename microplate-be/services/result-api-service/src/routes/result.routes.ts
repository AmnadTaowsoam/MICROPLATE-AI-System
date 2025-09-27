import { Router } from 'express';
import { ResultController } from '@/controllers/result.controller';
// Auth and validation are handled at the gateway layer
import {
  SampleNoSchema,
  RunIdSchema,
  SampleListQuerySchema,
  RunListQuerySchema,
  StatisticsFiltersSchema,
} from '@/schemas/result.schemas';

export function resultRoutes(resultController: ResultController): Router {
  const router = Router();

  // =========================
  // Sample Routes
  // =========================

  // GET /api/v1/results/samples - List samples with pagination and filtering
  /**
   * @swagger
   * /api/v1/results/samples:
   *   get:
   *     tags: [Samples]
   *     summary: Get list of samples
   *     description: Retrieve a paginated list of samples with optional filtering
   *     parameters:
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
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, completed, failed]
   *       - in: query
   *         name: dateFrom
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: dateTo
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: Successfully retrieved samples
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           sampleNo:
   *                             type: string
   *                           summary:
   *                             type: object
   *                           totalRuns:
   *                             type: integer
   *                           lastRunAt:
   *                             type: string
   *                             format: date-time
   *                           lastRunId:
   *                             type: integer
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                           updatedAt:
   *                             type: string
   *                             format: date-time
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         page:
   *                           type: integer
   *                         limit:
   *                           type: integer
   *                         total:
   *                           type: integer
   *                         totalPages:
   *                           type: integer
   *                         hasNext:
   *                           type: boolean
   *                         hasPrev:
   *                           type: boolean
   */
  router.get('/samples', resultController.getSamples.bind(resultController));

  // GET /api/v1/results/samples/:sampleNo - Get detailed sample information
  /**
   * @swagger
   * /api/v1/results/samples/{sampleNo}:
   *   get:
   *     tags: [Samples]
   *     summary: Get sample details
   *     description: Get detailed information about a specific sample including run history
   *     parameters:
   *       - in: path
   *         name: sampleNo
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved sample details
   */
  router.get('/samples/:sampleNo', resultController.getSampleDetails.bind(resultController));

  // GET /api/v1/results/samples/:sampleNo/summary - Get sample summary
  /**
   * @swagger
   * /api/v1/results/samples/{sampleNo}/summary:
   *   get:
   *     tags: [Samples]
   *     summary: Get sample summary
   *     description: Get aggregated summary for a sample
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
  router.get('/samples/:sampleNo/summary', resultController.getSampleSummary.bind(resultController));

  // GET /api/v1/results/samples/:sampleNo/runs - Get all runs for a sample
  /**
   * @swagger
   * /api/v1/results/samples/{sampleNo}/runs:
   *   get:
   *     tags: [Samples]
   *     summary: Get sample runs
   *     description: Get all prediction runs for a specific sample
   *     parameters:
   *       - in: path
   *         name: sampleNo
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved sample runs
   */
  router.get('/samples/:sampleNo/runs', resultController.getSampleRuns.bind(resultController));

  // GET /api/v1/results/samples/:sampleNo/last - Get most recent run for a sample
  /**
   * @swagger
   * /api/v1/results/samples/{sampleNo}/last:
   *   get:
   *     tags: [Samples]
   *     summary: Get last run
   *     description: Get the most recent prediction run for a sample
   *     parameters:
   *       - in: path
   *         name: sampleNo
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved last run
   */
  router.get('/samples/:sampleNo/last', resultController.getLastRun.bind(resultController));

  // GET /api/v1/results/samples/:sampleNo/trends - Get trend analysis for a sample
  /**
   * @swagger
   * /api/v1/results/samples/{sampleNo}/trends:
   *   get:
   *     tags: [Samples]
   *     summary: Get sample trends
   *     description: Get trend analysis for a specific sample
   *     parameters:
   *       - in: path
   *         name: sampleNo
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved sample trends
   */
  router.get('/samples/:sampleNo/trends', resultController.getSampleTrends.bind(resultController));

  // POST /api/v1/results/samples/:sampleNo/update - Update sample summary (internal)
  router.post('/samples/:sampleNo/update', resultController.updateSampleSummary.bind(resultController));

  // GET /api/v1/results/samples/:sampleNo/interface-files - Get interface files for a sample
  /**
   * @swagger
   * /api/v1/results/samples/{sampleNo}/interface-files:
   *   get:
   *     tags: [Samples]
   *     summary: Get interface files
   *     description: Get interface files for a specific sample
   *     parameters:
   *       - in: path
   *         name: sampleNo
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved interface files
   */
  router.get('/samples/:sampleNo/interface-files', resultController.getInterfaceFiles.bind(resultController));

  // =========================
  // Run Routes
  // =========================

  // GET /api/v1/results/runs/:runId - Get detailed run information
  /**
   * @swagger
   * /api/v1/results/runs/{runId}:
   *   get:
   *     tags: [Runs]
   *     summary: Get run details
   *     description: Get detailed information about a specific prediction run
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
  router.get('/runs/:runId', resultController.getRunDetails.bind(resultController));

  // =========================
  // Statistics Routes
  // =========================

  // GET /api/v1/results/statistics/overview - Get system-wide statistics
  /**
   * @swagger
   * /api/v1/results/statistics/overview:
   *   get:
   *     tags: [Statistics]
   *     summary: Get system statistics
   *     description: Get system-wide statistics and analytics
   *     parameters:
   *       - in: query
   *         name: dateFrom
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: dateTo
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: groupBy
   *         schema:
   *           type: string
   *           enum: [day, week, month]
   *           default: day
   *     responses:
   *       200:
   *         description: Successfully retrieved system statistics
   */
  router.get('/statistics/overview', resultController.getSystemStatistics.bind(resultController));

  // =========================
  // Cache Management Routes
  // =========================

  // DELETE /api/v1/results/cache/samples/:sampleNo - Invalidate sample cache
  /**
   * @swagger
   * /api/v1/results/cache/samples/{sampleNo}:
   *   delete:
   *     tags: [Cache]
   *     summary: Invalidate sample cache
   *     description: Invalidate cache for a specific sample
   *     parameters:
   *       - in: path
   *         name: sampleNo
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully invalidated sample cache
   */
  router.delete('/cache/samples/:sampleNo', resultController.invalidateSampleCache.bind(resultController));

  // DELETE /api/v1/results/cache/system - Invalidate system cache
  /**
   * @swagger
   * /api/v1/results/cache/system:
   *   delete:
   *     tags: [Cache]
   *     summary: Invalidate system cache
   *     description: Invalidate system-wide cache
   *     responses:
   *       200:
   *         description: Successfully invalidated system cache
   */
  router.delete('/cache/system', resultController.invalidateSystemCache.bind(resultController));

  // =========================
  // Health and Monitoring Routes
  // =========================

  // GET /api/v1/results/health - Health check
  /**
   * @swagger
   * /api/v1/results/health:
   *   get:
   *     tags: [Health]
   *     summary: Health check
   *     description: Check the health status of the service
   *     responses:
   *       200:
   *         description: Service is healthy
   */
  router.get('/health', resultController.healthCheck.bind(resultController));

  // GET /api/v1/results/ready - Readiness check
  /**
   * @swagger
   * /api/v1/results/ready:
   *   get:
   *     tags: [Health]
   *     summary: Readiness check
   *     description: Check if the service is ready to handle requests
   *     responses:
   *       200:
   *         description: Service is ready
   */
  router.get('/ready', resultController.readinessCheck.bind(resultController));

  // GET /api/v1/results/metrics - Get service metrics
  /**
   * @swagger
   * /api/v1/results/metrics:
   *   get:
   *     tags: [Monitoring]
   *     summary: Get metrics
   *     description: Get service metrics and statistics
   *     responses:
   *       200:
   *         description: Successfully retrieved metrics
   */
  router.get('/metrics', resultController.getMetrics.bind(resultController));

  // =========================
  // System Logs Routes
  // =========================

  // GET /api/v1/results/logs - Get system logs
  /**
   * @swagger
   * /api/v1/results/logs:
   *   get:
   *     tags: [Logs]
   *     summary: Get system logs
   *     description: Get system logs with optional filtering
   *     parameters:
   *       - in: query
   *         name: level
   *         schema:
   *           type: string
   *           enum: [info, warn, error, all]
   *           default: all
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 1000
   *           default: 100
   *     responses:
   *       200:
   *         description: Successfully retrieved logs
   */
  router.get('/logs', resultController.getLogs.bind(resultController));

  // DELETE /api/v1/results/logs - Clear system logs
  /**
   * @swagger
   * /api/v1/results/logs:
   *   delete:
   *     tags: [Logs]
   *     summary: Clear system logs
   *     description: Clear all system logs
   *     responses:
   *       200:
   *         description: Successfully cleared logs
   */
  router.delete('/logs', resultController.clearLogs.bind(resultController));

  return router;
}

// Import z for schema validation
import { z } from 'zod';