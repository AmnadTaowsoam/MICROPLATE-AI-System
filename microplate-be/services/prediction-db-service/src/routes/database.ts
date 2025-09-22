import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../server';
import { logger } from '../utils/logger';

export async function databaseRoutes(fastify: FastifyInstance) {
  // Get database status
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          tableowner
        FROM pg_tables 
        WHERE schemaname IN ('prediction_result', 'public')
        ORDER BY schemaname, tablename;
      `;

      return {
        status: 'connected',
        schemas: {
          prediction_result: (result as any[]).filter(r => r.schemaname === 'prediction_result'),
          public: (result as any[]).filter(r => r.schemaname === 'public'),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Database status check failed:', error);
      return reply.status(500).send({
        status: 'error',
        error: 'Failed to get database status',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get table information
  fastify.get('/tables/:schema', async (request: FastifyRequest<{ Params: { schema: string } }>, reply: FastifyReply) => {
    const { schema } = request.params;

    if (!['prediction_result', 'public'].includes(schema)) {
      return reply.status(400).send({
        error: 'Invalid schema. Must be "prediction_result" or "public"',
      });
    }

    try {
      const tables = await prisma.$queryRaw`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = ${schema}
        ORDER BY table_name, ordinal_position;
      `;

      return {
        schema,
        tables,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to get tables for schema ${schema}:`, error);
      return reply.status(500).send({
        error: 'Failed to get table information',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get prediction runs count
  fastify.get('/stats/predictions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await prisma.predictionRun.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });

      const totalRuns = await prisma.predictionRun.count();
      const recentRuns = await prisma.predictionRun.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      return {
        totalRuns,
        recentRuns,
        statusBreakdown: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get prediction stats:', error);
      return reply.status(500).send({
        error: 'Failed to get prediction statistics',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get sample summary stats
  fastify.get('/stats/samples', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const totalSamples = await prisma.sampleSummary.count();
      const recentSamples = await prisma.sampleSummary.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      const topSamples = await prisma.sampleSummary.findMany({
        orderBy: {
          totalRuns: 'desc',
        },
        take: 10,
        select: {
          sampleNo: true,
          totalRuns: true,
          lastRunAt: true,
        },
      });

      return {
        totalSamples,
        recentSamples,
        topSamples,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get sample stats:', error);
      return reply.status(500).send({
        error: 'Failed to get sample statistics',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Database maintenance operations
  fastify.post('/maintenance/cleanup', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Clean up old health checks (older than 7 days)
      const healthCheckResult = await prisma.healthCheck.deleteMany({
        where: {
          timestamp: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      // Clean up failed prediction runs older than 30 days
      const failedRunsResult = await prisma.predictionRun.deleteMany({
        where: {
          status: 'failed',
          createdAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      return {
        message: 'Database cleanup completed',
        results: {
          healthChecksDeleted: healthCheckResult.count,
          failedRunsDeleted: failedRunsResult.count,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Database cleanup failed:', error);
      return reply.status(500).send({
        error: 'Database cleanup failed',
        timestamp: new Date().toISOString(),
      });
    }
  });
}
