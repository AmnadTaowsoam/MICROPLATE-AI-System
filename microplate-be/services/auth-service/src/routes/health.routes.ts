import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const healthRoutes = async (fastify: FastifyInstance) => {
  // Basic health check
  fastify.get('/healthz', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      version: '1.0.0'
    };
  });

  // Readiness check
  fastify.get('/readyz', async (_request, reply) => {
    try {
      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        checks: {
          database: 'ok'
        }
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        checks: {
          database: 'error'
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Metrics endpoint
  fastify.get('/metrics', async (_request, reply) => {
    try {
      // Get basic metrics
      const [
        totalUsers,
        activeUsers,
        totalRoles,
        totalRefreshTokens,
        expiredRefreshTokens
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.role.count(),
        prisma.refreshToken.count(),
        prisma.refreshToken.count({
          where: {
            OR: [
              { expiresAt: { lt: new Date() } },
              { revokedAt: { not: null } }
            ]
          }
        })
      ]);

      const metrics = {
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        metrics: {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers
          },
          roles: {
            total: totalRoles
          },
          tokens: {
            total: totalRefreshTokens,
            expired: expiredRefreshTokens,
            active: totalRefreshTokens - expiredRefreshTokens
          }
        }
      };

      reply.type('application/json');
      return metrics;
    } catch (error) {
      reply.code(500);
      return {
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
};
