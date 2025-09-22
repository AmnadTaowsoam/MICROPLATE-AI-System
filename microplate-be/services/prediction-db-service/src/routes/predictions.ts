import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../server';
import { logger } from '../utils/logger';

export async function predictionRoutes(fastify: FastifyInstance) {
  // Get all prediction runs with pagination
  fastify.get('/', async (request: FastifyRequest<{
    Querystring: {
      page?: number;
      limit?: number;
      status?: string;
      sampleNo?: string;
    }
  }>, reply: FastifyReply) => {
    const { page = 1, limit = 20, status, sampleNo } = request.query;
    const skip = (page - 1) * limit;

    try {
      const where = {
        ...(status && { status }),
        ...(sampleNo && { sampleNo: { contains: sampleNo } }),
      };

      const [runs, total] = await Promise.all([
        prisma.predictionRun.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            wellPredictions: {
              select: {
                wellId: true,
                class_: true,
                confidence: true,
              },
            },
            _count: {
              select: {
                wellPredictions: true,
                imageFiles: true,
              },
            },
          },
        }),
        prisma.predictionRun.count({ where }),
      ]);

      return {
        runs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get prediction runs:', error);
      return reply.status(500).send({
        error: 'Failed to get prediction runs',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get specific prediction run by ID
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const runId = parseInt(id);

    if (isNaN(runId)) {
      return reply.status(400).send({
        error: 'Invalid run ID',
      });
    }

    try {
      const run = await prisma.predictionRun.findUnique({
        where: { id: runId },
        include: {
          wellPredictions: true,
          rowCounts: true,
          interfaceResults: true,
          imageFiles: true,
        },
      });

      if (!run) {
        return reply.status(404).send({
          error: 'Prediction run not found',
        });
      }

      return {
        run,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to get prediction run ${runId}:`, error);
      return reply.status(500).send({
        error: 'Failed to get prediction run',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get prediction runs by sample number
  fastify.get('/sample/:sampleNo', async (request: FastifyRequest<{ 
    Params: { sampleNo: string }
    Querystring: { limit?: number }
  }>, reply: FastifyReply) => {
    const { sampleNo } = request.params;
    const { limit = 10 } = request.query;

    try {
      const runs = await prisma.predictionRun.findMany({
        where: { sampleNo },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          wellPredictions: {
            select: {
              wellId: true,
              class_: true,
              confidence: true,
            },
          },
          _count: {
            select: {
              wellPredictions: true,
            },
          },
        },
      });

      return {
        sampleNo,
        runs,
        count: runs.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to get prediction runs for sample ${sampleNo}:`, error);
      return reply.status(500).send({
        error: 'Failed to get prediction runs for sample',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get well predictions for a specific run
  fastify.get('/:id/wells', async (request: FastifyRequest<{ 
    Params: { id: string }
    Querystring: { 
      class_?: string;
      minConfidence?: number;
    }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { class_, minConfidence } = request.query;
    const runId = parseInt(id);

    if (isNaN(runId)) {
      return reply.status(400).send({
        error: 'Invalid run ID',
      });
    }

    try {
      const where = {
        runId,
        ...(class_ && { class_ }),
        ...(minConfidence && { confidence: { gte: minConfidence } }),
      };

      const wells = await prisma.wellPrediction.findMany({
        where,
        orderBy: {
          wellId: 'asc',
        },
      });

      // Group by class for summary
      const summary = wells.reduce((acc, well) => {
        const className = well.class_;
        if (!acc[className]) {
          acc[className] = { count: 0, avgConfidence: 0 };
        }
        acc[className].count++;
        acc[className].avgConfidence += well.confidence;
        return acc;
      }, {} as Record<string, { count: number; avgConfidence: number }>);

      // Calculate average confidence
      Object.keys(summary).forEach(className => {
        summary[className].avgConfidence /= summary[className].count;
      });

      return {
        runId,
        wells,
        summary,
        total: wells.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to get well predictions for run ${runId}:`, error);
      return reply.status(500).send({
        error: 'Failed to get well predictions',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Delete a prediction run
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const runId = parseInt(id);

    if (isNaN(runId)) {
      return reply.status(400).send({
        error: 'Invalid run ID',
      });
    }

    try {
      // Check if run exists
      const run = await prisma.predictionRun.findUnique({
        where: { id: runId },
      });

      if (!run) {
        return reply.status(404).send({
          error: 'Prediction run not found',
        });
      }

      // Delete the run (cascade will handle related records)
      await prisma.predictionRun.delete({
        where: { id: runId },
      });

      return {
        message: 'Prediction run deleted successfully',
        runId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to delete prediction run ${runId}:`, error);
      return reply.status(500).send({
        error: 'Failed to delete prediction run',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get recent activity
  fastify.get('/activity/recent', async (request: FastifyRequest<{
    Querystring: { hours?: number }
  }>, reply: FastifyReply) => {
    const { hours = 24 } = request.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const [recentRuns, recentSamples] = await Promise.all([
        prisma.predictionRun.findMany({
          where: {
            createdAt: {
              gte: since,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
          select: {
            id: true,
            sampleNo: true,
            status: true,
            createdAt: true,
            processingTimeMs: true,
          },
        }),
        prisma.sampleSummary.findMany({
          where: {
            updatedAt: {
              gte: since,
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 10,
          select: {
            sampleNo: true,
            totalRuns: true,
            lastRunAt: true,
            updatedAt: true,
          },
        }),
      ]);

      return {
        recentRuns,
        recentSamples,
        timeRange: {
          hours,
          since: since.toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get recent activity:', error);
      return reply.status(500).send({
        error: 'Failed to get recent activity',
        timestamp: new Date().toISOString(),
      });
    }
  });
}
