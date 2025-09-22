import { FastifyInstance } from 'fastify';
import { WebSocketController } from '@/controllers/websocket.controller';
import { authenticateToken } from '@/middleware/auth.middleware';
import { z } from 'zod';

export async function websocketRoutes(fastify: FastifyInstance) {
  const websocketController = fastify.websocketController as WebSocketController;

  // =========================
  // WebSocket Routes
  // =========================

  // WebSocket /api/v1/results/ws - Real-time updates (no auth required)
  fastify.register(async function (fastify) {
    fastify.get('/ws', {
      websocket: true,
      handler: websocketController.handleConnection.bind(websocketController),
    });
  });

  // WebSocket /api/v1/results/ws/auth - Authenticated real-time updates
  fastify.register(async function (fastify) {
    fastify.get('/ws/auth', {
      websocket: true,
      preHandler: [authenticateToken],
      handler: websocketController.handleAuthenticatedConnection.bind(websocketController),
    });
  });

  // =========================
  // HTTP-based Subscription Routes (Alternative to WebSocket messages)
  // =========================

  // POST /api/v1/results/subscriptions/samples/:sampleNo - Subscribe to sample updates via HTTP
  fastify.post('/subscriptions/samples/:sampleNo', {
    preHandler: [
      authenticateToken,
    ],
    handler: websocketController.subscribeToSample.bind(websocketController),
    schema: {
      tags: ['WebSocket Subscriptions'],
      summary: 'Subscribe to sample updates',
      description: 'Subscribe to real-time updates for a specific sample via HTTP',
      params: {
        type: 'object',
        properties: {
          sampleNo: { type: 'string' },
        },
        required: ['sampleNo'],
      },
      body: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
    },
  });

  // DELETE /api/v1/results/subscriptions/samples/:sampleNo - Unsubscribe from sample updates via HTTP
  fastify.delete('/subscriptions/samples/:sampleNo', {
    preHandler: [
      authenticateToken,
    ],
    handler: websocketController.unsubscribeFromSample.bind(websocketController),
    schema: {
      tags: ['WebSocket Subscriptions'],
      summary: 'Unsubscribe from sample updates',
      description: 'Unsubscribe from real-time updates for a specific sample via HTTP',
      params: {
        type: 'object',
        properties: {
          sampleNo: { type: 'string' },
        },
        required: ['sampleNo'],
      },
      body: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
    },
  });

  // POST /api/v1/results/subscriptions/runs/:runId - Subscribe to run updates via HTTP
  fastify.post('/subscriptions/runs/:runId', {
    preHandler: [
      authenticateToken,
    ],
    handler: websocketController.subscribeToRun.bind(websocketController),
    schema: {
      tags: ['WebSocket Subscriptions'],
      summary: 'Subscribe to run updates',
      description: 'Subscribe to real-time updates for a specific prediction run via HTTP',
      params: {
        type: 'object',
        properties: {
          runId: { type: 'integer' },
        },
        required: ['runId'],
      },
      body: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
    },
  });

  // DELETE /api/v1/results/subscriptions/runs/:runId - Unsubscribe from run updates via HTTP
  fastify.delete('/subscriptions/runs/:runId', {
    preHandler: [
      authenticateToken,
    ],
    handler: websocketController.unsubscribeFromRun.bind(websocketController),
    schema: {
      tags: ['WebSocket Subscriptions'],
      summary: 'Unsubscribe from run updates',
      description: 'Unsubscribe from real-time updates for a specific prediction run via HTTP',
      params: {
        type: 'object',
        properties: {
          runId: { type: 'integer' },
        },
        required: ['runId'],
      },
      body: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
    },
  });

  // POST /api/v1/results/subscriptions/system - Subscribe to system updates via HTTP
  fastify.post('/subscriptions/system', {
    preHandler: [
      authenticateToken,
    ],
    handler: websocketController.subscribeToSystem.bind(websocketController),
    schema: {
      tags: ['WebSocket Subscriptions'],
      summary: 'Subscribe to system updates',
      description: 'Subscribe to real-time system updates via HTTP (admin only)',
      body: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
    },
  });

  // DELETE /api/v1/results/subscriptions/system - Unsubscribe from system updates via HTTP
  fastify.delete('/subscriptions/system', {
    preHandler: [
      authenticateToken,
    ],
    handler: websocketController.unsubscribeFromSystem.bind(websocketController),
    schema: {
      tags: ['WebSocket Subscriptions'],
      summary: 'Unsubscribe from system updates',
      description: 'Unsubscribe from real-time system updates via HTTP',
      body: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
    },
  });

  // =========================
  // WebSocket Management Routes
  // =========================

  // GET /api/v1/results/ws/stats - Get WebSocket connection statistics
  fastify.get('/ws/stats', {
    preHandler: [
      authenticateToken,
    ],
    handler: websocketController.getConnectionStats.bind(websocketController),
    schema: {
      tags: ['WebSocket Management'],
      summary: 'Get connection statistics',
      description: 'Get WebSocket connection statistics (admin only)',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalConnections: { type: 'integer' },
                totalWebSockets: { type: 'integer' },
                sampleSubscriptions: { type: 'integer' },
                runSubscriptions: { type: 'integer' },
                systemSubscriptions: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  });
}
