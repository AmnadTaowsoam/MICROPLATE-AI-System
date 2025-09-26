import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { logger } from '../utils/logger';

export function healthRoutes(): Router {
  const router = Router();

  // Basic health check
  router.get('/', async (_request: Request, response: Response) => {
    response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'prediction-db-service',
      version: '1.0.0',
    });
  });

  // Detailed health check with database status
  router.get('/detailed', async (_request: Request, response: Response) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'prediction-db-service',
      version: '1.0.0',
      checks: {
        database: 'unknown',
        redis: 'unknown',
      },
    };

    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = 'healthy';
    } catch (error) {
      logger.error('Database health check failed:', String(error));
      health.checks.database = 'unhealthy';
      health.status = 'unhealthy';
    }

    // Check Redis connection (if implemented)
    try {
      // TODO: Implement Redis health check
      health.checks.redis = 'not_implemented';
    } catch (error) {
      logger.error('Redis health check failed:', String(error));
      health.checks.redis = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    response.status(statusCode).json(health);
  });

  // Readiness check
  router.get('/ready', async (_request: Request, response: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Readiness check failed:', String(error));
      response.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  // Liveness check
  router.get('/live', async (_request: Request, response: Response) => {
    response.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}