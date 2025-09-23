import { FastifyInstance } from 'fastify';
import { ResultController } from '@/controllers/result.controller';
// Auth and validation are handled at the gateway layer
import {
  SampleNoSchema,
  RunIdSchema,
  SampleListQuerySchema,
  RunListQuerySchema,
  StatisticsFiltersSchema,
} from '@/schemas/result.schemas';

export async function resultRoutes(fastify: FastifyInstance & { resultController: ResultController }) {
  const resultController = fastify.resultController;

  // =========================
  // Sample Routes
  // =========================

  // GET /api/v1/results/samples - List samples with pagination and filtering
  fastify.get('/samples', {
    handler: resultController.getSamples.bind(resultController),
    schema: {
      tags: ['Samples'],
      summary: 'Get list of samples',
      description: 'Retrieve a paginated list of samples with optional filtering',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          status: { type: 'string', enum: ['active', 'completed', 'failed'] },
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      sampleNo: { type: 'string' },
                      summary: { type: 'object' },
                      totalRuns: { type: 'integer' },
                      lastRunAt: { type: 'string', format: 'date-time' },
                      lastRunId: { type: 'integer' },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' },
                    hasNext: { type: 'boolean' },
                    hasPrev: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // GET /api/v1/results/samples/:sampleNo - Get detailed sample information
  fastify.get('/samples/:sampleNo', {
    handler: resultController.getSampleDetails.bind(resultController),
    schema: {
      tags: ['Samples'],
      summary: 'Get sample details',
      description: 'Get detailed information about a specific sample including run history',
      params: {
        type: 'object',
        properties: {
          sampleNo: { type: 'string' },
        },
        required: ['sampleNo'],
      },
    },
  });

  // GET /api/v1/results/samples/:sampleNo/summary - Get sample summary
  fastify.get('/samples/:sampleNo/summary', {
    handler: resultController.getSampleSummary.bind(resultController),
    schema: {
      tags: ['Samples'],
      summary: 'Get sample summary',
      description: 'Get aggregated summary for a sample',
      params: {
        type: 'object',
        properties: {
          sampleNo: { type: 'string' },
        },
        required: ['sampleNo'],
      },
    },
  });

  // GET /api/v1/results/samples/:sampleNo/runs - Get all runs for a sample
  fastify.get('/samples/:sampleNo/runs', {
    handler: resultController.getSampleRuns.bind(resultController),
    schema: {
      tags: ['Samples'],
      summary: 'Get sample runs',
      description: 'Get all prediction runs for a specific sample',
      params: {
        type: 'object',
        properties: {
          sampleNo: { type: 'string' },
        },
        required: ['sampleNo'],
      },
    },
  });

  // GET /api/v1/results/samples/:sampleNo/last - Get most recent run for a sample
  fastify.get('/samples/:sampleNo/last', {
    handler: resultController.getLastRun.bind(resultController),
    schema: {
      tags: ['Samples'],
      summary: 'Get last run',
      description: 'Get the most recent prediction run for a sample',
      params: {
        type: 'object',
        properties: {
          sampleNo: { type: 'string' },
        },
        required: ['sampleNo'],
      },
    },
  });

  // GET /api/v1/results/samples/:sampleNo/trends - Get trend analysis for a sample
  fastify.get('/samples/:sampleNo/trends', {
    handler: resultController.getSampleTrends.bind(resultController),
    schema: {
      tags: ['Samples'],
      summary: 'Get sample trends',
      description: 'Get trend analysis for a specific sample',
      params: {
        type: 'object',
        properties: {
          sampleNo: { type: 'string' },
        },
        required: ['sampleNo'],
      },
    },
  });

  // =========================
  // Run Routes
  // =========================

  // GET /api/v1/results/runs/:runId - Get detailed run information
  fastify.get('/runs/:runId', {
    handler: resultController.getRunDetails.bind(resultController),
    schema: {
      tags: ['Runs'],
      summary: 'Get run details',
      description: 'Get detailed information about a specific prediction run',
      params: {
        type: 'object',
        properties: {
          runId: { type: 'integer' },
        },
        required: ['runId'],
      },
    },
  });

  // =========================
  // Statistics Routes
  // =========================

  // GET /api/v1/results/statistics/overview - Get system-wide statistics
  fastify.get('/statistics/overview', {
    handler: resultController.getSystemStatistics.bind(resultController),
    schema: {
      tags: ['Statistics'],
      summary: 'Get system statistics',
      description: 'Get system-wide statistics and analytics',
      querystring: {
        type: 'object',
        properties: {
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' },
          groupBy: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' },
        },
      },
    },
  });

  // =========================
  // Cache Management Routes
  // =========================

  // DELETE /api/v1/results/cache/samples/:sampleNo - Invalidate sample cache
  fastify.delete('/cache/samples/:sampleNo', {
    handler: resultController.invalidateSampleCache.bind(resultController),
    schema: {
      tags: ['Cache'],
      summary: 'Invalidate sample cache',
      description: 'Invalidate cache for a specific sample',
      params: {
        type: 'object',
        properties: {
          sampleNo: { type: 'string' },
        },
        required: ['sampleNo'],
      },
    },
  });

  // DELETE /api/v1/results/cache/system - Invalidate system cache
  fastify.delete('/cache/system', {
    handler: resultController.invalidateSystemCache.bind(resultController),
    schema: {
      tags: ['Cache'],
      summary: 'Invalidate system cache',
      description: 'Invalidate system-wide cache',
    },
  });

  // =========================
  // Health and Monitoring Routes
  // =========================

  // GET /api/v1/results/health - Health check
  fastify.get('/health', {
    handler: resultController.healthCheck.bind(resultController),
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Check the health status of the service',
    },
  });

  // GET /api/v1/results/ready - Readiness check
  fastify.get('/ready', {
    handler: resultController.readinessCheck.bind(resultController),
    schema: {
      tags: ['Health'],
      summary: 'Readiness check',
      description: 'Check if the service is ready to handle requests',
    },
  });

  // GET /api/v1/results/metrics - Get service metrics
  fastify.get('/metrics', {
    handler: resultController.getMetrics.bind(resultController),
    schema: {
      tags: ['Monitoring'],
      summary: 'Get metrics',
      description: 'Get service metrics and statistics',
    },
  });
}

// Import z for schema validation
import { z } from 'zod';
