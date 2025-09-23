import { FastifyRequest, FastifyReply } from 'fastify';
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

  async getSamples(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as SampleListQuery;
      const options: PaginationOptions = {
        page: query.page,
        limit: query.limit,
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
        requestId: request.id,
        total: result.pagination.total,
        page: result.pagination.page,
        filters
      }, 'Samples retrieved');

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error({ requestId: request.id, error }, 'Failed to get samples');
      return sendError(reply, error as any);
    }
  }

  async getSampleDetails(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleDetails(sampleNo);

      logger.info({ 
        requestId: request.id,
        sampleNo,
        totalRuns: result.totalRuns
      }, 'Sample details retrieved');

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error({ 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to get sample details');
      return sendError(reply, error as any);
    }
  }

  async getSampleSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleSummary(sampleNo);

      logger.info({ 
        requestId: request.id,
        sampleNo
      }, 'Sample summary retrieved');

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error({ 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to get sample summary');
      return sendError(reply, error as any);
    }
  }

  async getSampleRuns(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const query = request.query as RunListQuery;
      
      const options: PaginationOptions = {
        page: query.page,
        limit: query.limit,
        ...(query.sortBy ? { sortBy: query.sortBy } : {}),
        ...(query.sortOrder ? { sortOrder: query.sortOrder } : {}),
      };

      const result = await this.resultService.getSampleRuns(sampleNo, options);

      logger.info({ 
        requestId: request.id,
        sampleNo,
        total: result.pagination.total,
        page: result.pagination.page
      }, 'Sample runs retrieved');

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error({ 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to get sample runs');
      return sendError(reply, error as any);
    }
  }

  async getLastRun(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getLastRun(sampleNo);

      logger.info({ 
        requestId: request.id,
        sampleNo,
        runId: result.runId
      }, 'Last run retrieved');

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error({ 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to get last run');
      return sendError(reply, error as any);
    }
  }

  async getSampleTrends(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleTrends(sampleNo);

      logger.info({ 
        requestId: request.id,
        sampleNo,
        trendPoints: result.trends.confidenceTrend.length
      }, 'Sample trends retrieved');

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error({ 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to get sample trends');
      return sendError(reply, error as any);
    }
  }

  // =========================
  // Run Endpoints
  // =========================

  async getRunDetails(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { runId } = request.params as { runId: number };
      const result = await this.resultService.getRunDetails(runId);

      logger.info({ 
        requestId: request.id,
        runId,
        sampleNo: result.sampleNo
      }, 'Run details retrieved');

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error({ 
        requestId: request.id,
        runId: (request.params as any)?.runId,
        error 
      }, 'Failed to get run details');
      return sendError(reply, error as any);
    }
  }

  // =========================
  // Statistics Endpoints
  // =========================

  async getSystemStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as StatisticsFilters;
      const filters = {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        groupBy: query.groupBy,
      };

      const result = await this.resultService.getSystemStatistics(filters);

      logger.info({ 
        requestId: request.id,
        totalSamples: result.totalSamples,
        totalRuns: result.totalRuns
      }, 'System statistics retrieved');

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error({ 
        requestId: request.id,
        error 
      }, 'Failed to get system statistics');
      return sendError(reply, error as any);
    }
  }

  // =========================
  // Cache Management Endpoints
  // =========================

  async invalidateSampleCache(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      
      // Only allow cache invalidation for authenticated users with appropriate permissions
      const user = (request as any).user;
      if (!user || !user.roles.includes('admin')) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to invalidate cache',
          }
        });
      }

      await (this.resultService as any).invalidateSampleCache(sampleNo);

      logger.info({ 
        requestId: request.id,
        sampleNo,
        userId: user.id
      }, 'Sample cache invalidated');

      return sendSuccess(reply, { message: 'Cache invalidated successfully' });
    } catch (error) {
      logger.error({ 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      }, 'Failed to invalidate sample cache');
      return sendError(reply, error as any);
    }
  }

  async invalidateSystemCache(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Only allow cache invalidation for authenticated users with appropriate permissions
      const user = (request as any).user;
      if (!user || !user.roles.includes('admin')) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to invalidate cache',
          }
        });
      }

      await (this.resultService as any).invalidateSystemCache();

      logger.info({ 
        requestId: request.id,
        userId: user.id
      }, 'System cache invalidated');

      return sendSuccess(reply, { message: 'System cache invalidated successfully' });
    } catch (error) {
      logger.error({ 
        requestId: request.id,
        error 
      }, 'Failed to invalidate system cache');
      return sendError(reply, error as any);
    }
  }

  // =========================
  // Health Check Endpoints
  // =========================

  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
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

      return sendSuccess(reply, healthStatus);
    } catch (error) {
      logger.error({ requestId: request.id, error }, 'Health check failed');
      
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

      return reply.status(503).send({
        success: false,
        data: healthStatus
      });
    }
  }

  async readinessCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Check database connectivity
      await (this.resultService as any).prisma.$queryRaw`SELECT 1`;
      
      // Check cache connectivity (if available)
      const cacheHealthy = await (this.resultService as any).cache.healthCheck();

      const isReady = cacheHealthy;
      
      if (isReady) {
        return sendSuccess(reply, { 
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'NOT_READY',
            message: 'Service not ready',
          }
        });
      }
    } catch (error) {
      logger.error({ requestId: request.id, error }, 'Readiness check failed');
      
      return reply.status(503).send({
        success: false,
        error: {
          code: 'NOT_READY',
          message: 'Service not ready',
        }
      });
    }
  }

  async getMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Basic metrics - in production, this would integrate with Prometheus
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        websocket: (this.websocketService as any).getConnectionStats(),
      };

      return sendSuccess(reply, metrics);
    } catch (error) {
      logger.error({ requestId: request.id, error }, 'Failed to get metrics');
      return sendError(reply, error as any);
    }
  }
}
