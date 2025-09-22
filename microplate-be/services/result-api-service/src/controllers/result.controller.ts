import { FastifyRequest, FastifyReply } from 'fastify';
import { ResultService } from '@/services/result.service';
import { WebSocketService } from '@/services/websocket.service';
import { sendSuccess, sendError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';
import { 
  PaginationOptions,
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
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };

      const filters = {
        search: query.search,
        status: query.status,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      };

      const result = await this.resultService.getSamples({ ...options, filters });

      logger.info('Samples retrieved', { 
        requestId: request.id,
        total: result.pagination.total,
        page: result.pagination.page,
        filters
      });

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error('Failed to get samples', { requestId: request.id, error });
      return sendError(reply, error);
    }
  }

  async getSampleDetails(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleDetails(sampleNo);

      logger.info('Sample details retrieved', { 
        requestId: request.id,
        sampleNo,
        totalRuns: result.totalRuns
      });

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error('Failed to get sample details', { 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(reply, error);
    }
  }

  async getSampleSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleSummary(sampleNo);

      logger.info('Sample summary retrieved', { 
        requestId: request.id,
        sampleNo
      });

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error('Failed to get sample summary', { 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(reply, error);
    }
  }

  async getSampleRuns(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const query = request.query as RunListQuery;
      
      const options: PaginationOptions = {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };

      const result = await this.resultService.getSampleRuns(sampleNo, options);

      logger.info('Sample runs retrieved', { 
        requestId: request.id,
        sampleNo,
        total: result.pagination.total,
        page: result.pagination.page
      });

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error('Failed to get sample runs', { 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(reply, error);
    }
  }

  async getLastRun(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getLastRun(sampleNo);

      logger.info('Last run retrieved', { 
        requestId: request.id,
        sampleNo,
        runId: result.runId
      });

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error('Failed to get last run', { 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(reply, error);
    }
  }

  async getSampleTrends(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleTrends(sampleNo);

      logger.info('Sample trends retrieved', { 
        requestId: request.id,
        sampleNo,
        trendPoints: result.trends.confidenceTrend.length
      });

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error('Failed to get sample trends', { 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(reply, error);
    }
  }

  // =========================
  // Run Endpoints
  // =========================

  async getRunDetails(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { runId } = request.params as { runId: number };
      const result = await this.resultService.getRunDetails(runId);

      logger.info('Run details retrieved', { 
        requestId: request.id,
        runId,
        sampleNo: result.sampleNo
      });

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error('Failed to get run details', { 
        requestId: request.id,
        runId: (request.params as any)?.runId,
        error 
      });
      return sendError(reply, error);
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

      logger.info('System statistics retrieved', { 
        requestId: request.id,
        totalSamples: result.totalSamples,
        totalRuns: result.totalRuns
      });

      return sendSuccess(reply, result);
    } catch (error) {
      logger.error('Failed to get system statistics', { 
        requestId: request.id,
        error 
      });
      return sendError(reply, error);
    }
  }

  // =========================
  // Cache Management Endpoints
  // =========================

  async invalidateSampleCache(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      
      // Only allow cache invalidation for authenticated users with appropriate permissions
      const user = (request as AuthenticatedRequest).user;
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

      logger.info('Sample cache invalidated', { 
        requestId: request.id,
        sampleNo,
        userId: user.id
      });

      return sendSuccess(reply, { message: 'Cache invalidated successfully' });
    } catch (error) {
      logger.error('Failed to invalidate sample cache', { 
        requestId: request.id,
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(reply, error);
    }
  }

  async invalidateSystemCache(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Only allow cache invalidation for authenticated users with appropriate permissions
      const user = (request as AuthenticatedRequest).user;
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

      logger.info('System cache invalidated', { 
        requestId: request.id,
        userId: user.id
      });

      return sendSuccess(reply, { message: 'System cache invalidated successfully' });
    } catch (error) {
      logger.error('Failed to invalidate system cache', { 
        requestId: request.id,
        error 
      });
      return sendError(reply, error);
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
          websocket: this.websocketService.isHealthy() ? 'healthy' as const : 'unhealthy' as const,
        }
      };

      return sendSuccess(reply, healthStatus);
    } catch (error) {
      logger.error('Health check failed', { requestId: request.id, error });
      
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
      logger.error('Readiness check failed', { requestId: request.id, error });
      
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
        websocket: this.websocketService.getConnectionStats(),
      };

      return sendSuccess(reply, metrics);
    } catch (error) {
      logger.error('Failed to get metrics', { requestId: request.id, error });
      return sendError(reply, error);
    }
  }
}
