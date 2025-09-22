import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../server';
import { logger } from '../utils/logger';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'prediction-db-service',
      version: '1.0.0',
    };
  });

  // Detailed health check with database status
  fastify.get('/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
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
      logger.error('Database health check failed:', error);
      health.checks.database = 'unhealthy';
      health.status = 'unhealthy';
    }

    // Check Redis connection (if implemented)
    try {
      // TODO: Implement Redis health check
      health.checks.redis = 'not_implemented';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      health.checks.redis = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    return reply.status(statusCode).send(health);
  });

  // Readiness check
  fastify.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Readiness check failed:', error);
      return reply.status(503).send({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  // Liveness check
  fastify.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });
}
