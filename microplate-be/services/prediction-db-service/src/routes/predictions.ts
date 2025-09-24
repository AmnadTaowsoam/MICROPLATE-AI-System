import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../server';
import { logger } from '../utils/logger';

export async function predictionRoutes(fastify: FastifyInstance) {
  // Create a new prediction run (alias 1)
  fastify.post('/', async (
    request: FastifyRequest<{ Body: {
      sampleNo: string;
      submissionNo?: string;
      description?: string;
      rawImagePath?: string;
      modelVersion?: string;
      status?: string;
      confidenceThreshold?: number;
    } }>,
    reply: FastifyReply
  ) => {
    const body = request.body;
    if (!body?.sampleNo) {
      return reply.status(400).send({ error: 'sampleNo is required' });
    }

    try {
      const run = await prisma.predictionRun.create({
        data: {
          sampleNo: body.sampleNo,
          submissionNo: body.submissionNo ?? null,
          description: body.description || null,
          rawImagePath: body.rawImagePath || null,
          modelVersion: body.modelVersion || null,
          status: body.status || 'pending',
          confidenceThreshold: body.confidenceThreshold ?? null,
        },
      });

      return reply.status(201).send({ success: true, data: { id: run.id, sampleNo: run.sampleNo } });
    } catch (error) {
      logger.error('Failed to create prediction run:', error);
      return reply.status(500).send({ error: 'Failed to create prediction run' });
    }
  });

  // Create a new prediction run (alias 2: /runs)
  fastify.post('/runs', async (
    request: FastifyRequest<{ Body: {
      sampleNo: string;
      submissionNo?: string;
      description?: string;
      rawImagePath?: string;
      modelVersion?: string;
      status?: string;
      confidenceThreshold?: number;
    } }>,
    reply: FastifyReply
  ) => {
    const body = request.body;
    if (!body?.sampleNo) {
      return reply.status(400).send({ error: 'sampleNo is required' });
    }

    try {
      const run = await prisma.predictionRun.create({
        data: {
          sampleNo: body.sampleNo,
          submissionNo: body.submissionNo ?? null,
          description: body.description || null,
          rawImagePath: body.rawImagePath || null,
          modelVersion: body.modelVersion || null,
          status: body.status || 'pending',
          confidenceThreshold: body.confidenceThreshold ?? null,
        },
      });

      return reply.status(201).send({ success: true, data: { id: run.id, sampleNo: run.sampleNo } });
    } catch (error) {
      logger.error('Failed to create prediction run:', error);
      return reply.status(500).send({ error: 'Failed to create prediction run' });
    }
  });
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
          inferenceResults: true,
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

      // Calculate average confidence (guard against undefined)
      Object.keys(summary).forEach((className) => {
        const stats = summary[className];
        if (stats && stats.count > 0) {
          stats.avgConfidence /= stats.count;
        }
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

  // Update a prediction run
  fastify.put('/runs/:id', async (
    request: FastifyRequest<{ Params: { id: string }, Body: {
      status?: string;
      processingTimeMs?: number;
      errorMsg?: string;
      annotatedImagePath?: string;
    } }>,
    reply: FastifyReply
  ) => {
    const runId = parseInt(request.params.id);
    if (isNaN(runId)) {
      return reply.status(400).send({ error: 'Invalid run ID' });
    }

    const data: any = {};
    if (request.body.status !== undefined) data.status = request.body.status;
    if (request.body.processingTimeMs !== undefined) data.processingTimeMs = request.body.processingTimeMs;
    if (request.body.errorMsg !== undefined) data.errorMsg = request.body.errorMsg;
    if (request.body.annotatedImagePath !== undefined) data.annotatedImagePath = request.body.annotatedImagePath;

    try {
      const updated = await prisma.predictionRun.update({
        where: { id: runId },
        data,
      });
      return { success: true, data: { id: updated.id, status: updated.status } };
    } catch (error) {
      logger.error(`Failed to update prediction run ${runId}:`, error);
      return reply.status(500).send({ error: 'Failed to update prediction run' });
    }
  });

  // Create image file metadata for a run
  fastify.post('/:id/images', async (
    request: FastifyRequest<{ Params: { id: string }, Body: {
      sampleNo: string;
      fileType: string; // raw | annotated | thumbnail
      fileName: string;
      filePath: string;
      fileSize?: number;
      mimeType?: string;
      width?: number;
      height?: number;
      bucketName?: string;
      objectKey?: string;
      signedUrl?: string;
      urlExpiresAt?: string;
    } }>, reply: FastifyReply
  ) => {
    const runId = parseInt(request.params.id);
    if (isNaN(runId)) return reply.status(400).send({ error: 'Invalid run ID' });
    const body = request.body;
    try {
      const created = await prisma.imageFile.create({
        data: {
          runId,
          sampleNo: body.sampleNo,
          fileType: body.fileType,
          fileName: body.fileName,
          filePath: body.filePath,
          fileSize: (body.fileSize as any) ?? undefined,
          mimeType: body.mimeType ?? null,
          width: body.width ?? null,
          height: body.height ?? null,
          bucketName: body.bucketName ?? null,
          objectKey: body.objectKey ?? null,
          signedUrl: body.signedUrl ?? null,
          urlExpiresAt: body.urlExpiresAt ? new Date(body.urlExpiresAt) : null,
        }
      });
      return { success: true, data: { id: created.id } };
    } catch (error) {
      logger.error(`Failed to create image file for run ${runId}:`, error);
      return reply.status(500).send({ error: 'Failed to create image file' });
    }
  });

  // Create well predictions for a run (bulk)
  fastify.post('/:id/wells', async (
    request: FastifyRequest<{ Params: { id: string }, Body: { predictions: Array<{ wellId: string; label: string; class: string; confidence: number; bbox: any; }> } }>,
    reply: FastifyReply
  ) => {
    const runId = parseInt(request.params.id);
    if (isNaN(runId)) return reply.status(400).send({ error: 'Invalid run ID' });
    const { predictions } = request.body || { predictions: [] };
    try {
      if (predictions.length === 0) return { success: true, data: { inserted: 0 } };
      await prisma.wellPrediction.createMany({
        data: predictions.map(p => ({
          runId,
          wellId: p.wellId,
          label: p.label,
          class_: p.class,
          confidence: p.confidence,
          bbox: p.bbox,
        }))
      });
      return { success: true, data: { inserted: predictions.length } };
    } catch (error) {
      logger.error(`Failed to create well predictions for run ${runId}:`, error);
      return reply.status(500).send({ error: 'Failed to create well predictions' });
    }
  });

  // Create row counts for a run
  fastify.post('/:id/counts', async (
    request: FastifyRequest<{ Params: { id: string }, Body: { counts: any } }>, reply: FastifyReply
  ) => {
    const runId = parseInt(request.params.id);
    if (isNaN(runId)) return reply.status(400).send({ error: 'Invalid run ID' });
    try {
      const created = await prisma.rowCounts.create({ data: { runId, counts: request.body.counts } });
      return { success: true, data: { id: created.id } };
    } catch (error) {
      logger.error(`Failed to create row counts for run ${runId}:`, error);
      return reply.status(500).send({ error: 'Failed to create row counts' });
    }
  });

  // Create inference results for a run
  fastify.post('/:id/results', async (
    request: FastifyRequest<{ Params: { id: string }, Body: { results: any } }>, reply: FastifyReply
  ) => {
    const runId = parseInt(request.params.id);
    if (isNaN(runId)) return reply.status(400).send({ error: 'Invalid run ID' });
    try {
      const created = await prisma.inferenceResult.create({ data: { runId, results: request.body.results } });
      return { success: true, data: { id: created.id } };
    } catch (error) {
      logger.error(`Failed to create inference results for run ${runId}:`, error);
      return reply.status(500).send({ error: 'Failed to create inference results' });
    }
  });

  // Get recent activity
  fastify.get('/activity/recent', async (request: FastifyRequest<{
    Querystring: { hours?: number }
  }>, reply: FastifyReply) => {
    const { hours = 24 } = request.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const recentRuns = await prisma.predictionRun.findMany({
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
      });
      const recentSamples: any[] = [];

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
