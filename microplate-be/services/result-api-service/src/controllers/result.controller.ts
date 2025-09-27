import { Request, Response } from 'express';
import { ResultService, PaginationOptions, WebSocketService } from '@/types/result.types';
import { sendSuccess, sendError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { 
  SampleListQuery,
  RunListQuery,
  StatisticsFilters 
} from '@/schemas/result.schemas';

export class ResultController {
  constructor(
    private resultService: ResultService,
    private websocketService: WebSocketService
  ) {}

  // =========================
  // Sample Endpoints
  // =========================

  async getSamples(request: Request, response: Response) {
    try {
      const query = request.query as any;
      const options: PaginationOptions = {
        page: parseInt(query.page) || 1,
        limit: parseInt(query.limit) || 20,
        ...(query.sortBy ? { sortBy: query.sortBy } : {}),
        ...(query.sortOrder ? { sortOrder: query.sortOrder } : {}),
      };

      const filters = {
        search: query.search,
        status: query.status,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      };

      const result = await this.resultService.getSamples({ ...options, filters });

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        total: result.pagination.total,
        page: result.pagination.page,
        filters
      }, 'Samples retrieved');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ requestId: (request as any).id || 'unknown', error }, 'Failed to get samples');
      return sendError(response, error as any);
    }
  }

  async getSampleDetails(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleDetails(sampleNo);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        totalRuns: result.totalRuns
      }, 'Sample details retrieved');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to get sample details');
      return sendError(response, error as any);
    }
  }

  async getSampleSummary(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleSummary(sampleNo);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        sampleNo
      }, 'Sample summary retrieved');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to get sample summary');
      return sendError(response, error as any);
    }
  }

  async getSampleRuns(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const query = request.query as any;
      
      const options: PaginationOptions = {
        page: parseInt(query.page) || 1,
        limit: parseInt(query.limit) || 20,
        ...(query.sortBy ? { sortBy: query.sortBy } : {}),
        ...(query.sortOrder ? { sortOrder: query.sortOrder } : {}),
      };

      const result = await this.resultService.getSampleRuns(sampleNo, options);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        total: result.pagination.total,
        page: result.pagination.page
      }, 'Sample runs retrieved');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to get sample runs');
      return sendError(response, error as any);
    }
  }

  async getLastRun(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getLastRun(sampleNo);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        runId: result.runId
      }, 'Last run retrieved');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to get last run');
      return sendError(response, error as any);
    }
  }

  async getSampleTrends(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleTrends(sampleNo);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        trendPoints: result.trends.confidenceTrend.length
      }, 'Sample trends retrieved');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to get sample trends');
      return sendError(response, error as any);
    }
  }

  // =========================
  // Run Endpoints
  // =========================

  async getRunDetails(request: Request, response: Response) {
    try {
      const { runId } = request.params as any;
      const result = await this.resultService.getRunDetails(runId);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        runId,
        sampleNo: result.sampleNo
      }, 'Run details retrieved');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        runId: (request.params as any)?.runId,
        error 
      }, 'Failed to get run details');
      return sendError(response, error as any);
    }
  }

  // =========================
  // Statistics Endpoints
  // =========================

  async getSystemStatistics(request: Request, response: Response) {
    try {
      const query = request.query as StatisticsFilters;
      const filters = {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        groupBy: query.groupBy,
      };

      const result = await this.resultService.getSystemStatistics(filters);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        totalSamples: result.totalSamples,
        totalRuns: result.totalRuns
      }, 'System statistics retrieved');

      return sendSuccess(response, result);
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        error 
      }, 'Failed to get system statistics');
      return sendError(response, error as any);
    }
  }

  // =========================
  // Cache Management Endpoints
  // =========================

  async invalidateSampleCache(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      
      // Only allow cache invalidation for authenticated users with appropriate permissions
      const user = (request as any).user;
      if (!user || !user.roles.includes('admin')) {
        return response.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to invalidate cache',
          }
        });
      }

      await (this.resultService as any).invalidateSampleCache(sampleNo);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        userId: user.id
      }, 'Sample cache invalidated');

      return sendSuccess(response, { message: 'Cache invalidated successfully' });
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to invalidate sample cache');
      return sendError(response, error as any);
    }
  }

  async invalidateSystemCache(request: Request, response: Response) {
    try {
      // Only allow cache invalidation for authenticated users with appropriate permissions
      const user = (request as any).user;
      if (!user || !user.roles.includes('admin')) {
        return response.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to invalidate cache',
          }
        });
      }

      await (this.resultService as any).invalidateSystemCache();

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        userId: user.id
      }, 'System cache invalidated');

      return sendSuccess(response, { message: 'System cache invalidated successfully' });
    } catch (error) {
      logger.error({ 
        requestId: (request as any).id || 'unknown',
        error 
      }, 'Failed to invalidate system cache');
      return sendError(response, error as any);
    }
  }

  // =========================
  // Health Check Endpoints
  // =========================

  async healthCheck(request: Request, response: Response) {
    try {
      const healthStatus = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        dependencies: {
          database: 'healthy' as const,
          cache: 'healthy' as const,
          websocket: (this.websocketService as any).isHealthy() ? 'healthy' as const : 'unhealthy' as const,
        }
      };

      return sendSuccess(response, healthStatus);
    } catch (error) {
      logger.error({ requestId: (request as any).id || 'unknown', error }, 'Health check failed');
      
      const healthStatus = {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        dependencies: {
          database: 'unhealthy' as const,
          cache: 'unhealthy' as const,
          websocket: 'unhealthy' as const,
        }
      };

      return response.status(503).send({
        success: false,
        data: healthStatus
      });
    }
  }

  async readinessCheck(request: Request, response: Response) {
    try {
      // Check database connectivity
      await (this.resultService as any).prisma.$queryRaw`SELECT 1`;
      
      // Check cache connectivity (if available)
      const cacheHealthy = await (this.resultService as any).cache.healthCheck();

      const isReady = cacheHealthy;
      
      if (isReady) {
        return sendSuccess(response, { 
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        return response.status(503).send({
          success: false,
          error: {
            code: 'NOT_READY',
            message: 'Service not ready',
          }
        });
      }
    } catch (error) {
      logger.error({ requestId: (request as any).id || 'unknown', error }, 'Readiness check failed');
      
      return response.status(503).send({
        success: false,
        error: {
          code: 'NOT_READY',
          message: 'Service not ready',
        }
      });
    }
  }

  async getMetrics(request: Request, response: Response) {
    try {
      // Basic metrics - in production, this would integrate with Prometheus
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        websocket: (this.websocketService as any).getConnectionStats(),
      };

      return sendSuccess(response, metrics);
    } catch (error) {
      logger.error({ requestId: (request as any).id || 'unknown', error }, 'Failed to get metrics');
      return sendError(response, error as any);
    }
  }

  async updateSampleSummary(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params;
      const { runId } = request.body;

      logger.info({ sampleNo, runId }, 'Received sample summary update request');

      // Get aggregation service from app locals
      const aggregationService = (request.app as any).locals.aggregationService;
      
      if (!aggregationService) {
        logger.error('Aggregation service not available');
        return response.status(500).json({ 
          success: false, 
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Aggregation service not available' } 
        });
      }

      // Update sample summary
      await aggregationService.updateSampleSummary(sampleNo);

      logger.info({ sampleNo, runId }, 'Sample summary updated successfully');

      return response.json({ 
        success: true, 
        message: 'Sample summary updated successfully',
        sampleNo,
        runId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error({ requestId: (request as any).id || 'unknown', error }, 'Failed to update sample summary');
      return response.status(500).json({ 
        success: false, 
        error: { code: 'UPDATE_FAILED', message: 'Failed to update sample summary' } 
      });
    }
  }

  // =========================
  // System Logs Endpoints
  // =========================

  async getLogs(request: Request, response: Response) {
    try {
      const { level = 'all', limit = '100' } = request.query as { level?: string; limit?: string };
      const limitNum = Math.min(parseInt(limit, 10) || 100, 1000);

      // Get logs service from app locals
      const logsService = (request.app as any).locals.logsService;
      
      if (!logsService) {
        logger.error('Logs service not available');
        return response.status(500).json({ 
          success: false, 
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Logs service not available' } 
        });
      }

      const logs = await logsService.getLogs(level === 'all' ? undefined : level as any, limitNum);

      logger.info({ 
        requestId: (request as any).id || 'unknown',
        level,
        limit: limitNum,
        total: logs.length
      }, 'Logs retrieved');

      return sendSuccess(response, {
        logs,
        total: logs.length,
        level,
        limit: limitNum
      });
    } catch (error) {
      logger.error({ requestId: (request as any).id || 'unknown', error }, 'Failed to get logs');
      return sendError(response, error as any);
    }
  }

  async clearLogs(request: Request, response: Response) {
    try {
      // Get logs service from app locals
      const logsService = (request.app as any).locals.logsService;
      
      if (!logsService) {
        logger.error('Logs service not available');
        return response.status(500).json({ 
          success: false, 
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Logs service not available' } 
        });
      }

      await logsService.clearLogs();

      logger.info({ requestId: (request as any).id || 'unknown' }, 'Logs cleared');

      return sendSuccess(response, { message: 'Logs cleared successfully' });
    } catch (error) {
      logger.error({ requestId: (request as any).id || 'unknown', error }, 'Failed to clear logs');
      return sendError(response, error as any);
    }
  }

  async getInterfaceFiles(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      
      logger.info({ sampleNo }, 'Getting interface files for sample');
      
      const files = await this.resultService.getInterfaceFiles(sampleNo);
      
      return sendSuccess(response, files);
    } catch (error) {
      logger.error({ sampleNo: (request.params as any)?.sampleNo, error }, 'Failed to get interface files');
      return sendError(response, error as any);
    }
  }
}
