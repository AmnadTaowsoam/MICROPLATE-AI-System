import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// Import services and controllers
import { PrismaClient } from '@prisma/client';
import { ResultServiceImpl } from '@/services/result.service';
import { WebSocketServiceImpl } from '@/services/websocket.service';
import { AggregationServiceImpl } from '@/services/aggregation.service';
import { ResultController } from '@/controllers/result.controller';
import { WebSocketController } from '@/controllers/websocket.controller';

// Import routes
import { resultRoutes } from '@/routes/result.routes';
import { websocketRoutes } from '@/routes/websocket.routes';

// Import middleware and utilities
import { errorHandler } from '@/utils/errors';
import { requestLogger, responseLogger } from '@/utils/logger';
import { cacheService } from '@/utils/redis';
import { config } from '@/config/config';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: config.server.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Initialize Fastify
const fastify = Fastify({
  logger: config.logging.format === 'pretty' ? {
    level: config.logging.level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  } : {
    level: config.logging.level
  },
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
  genReqId: () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
});

// Register error handler
fastify.setErrorHandler(errorHandler);

// Register request/response logging
fastify.addHook('onRequest', requestLogger);
fastify.addHook('onSend', responseLogger);

// Register plugins
const registerPlugins = async () => {
  // Security headers (minimal since gateway handles most security)
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Let gateway handle CSP
  });

  // WebSocket support
  if (config.features.websocket) {
    await fastify.register(websocket, {
      options: {
        maxPayload: 16 * 1024, // 16KB
      }
    });
  }

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Result API Service',
        description: 'Data aggregation and querying service for the Microplate AI System',
        version: '1.0.0',
        contact: {
          name: 'Microplate AI Team',
          email: 'support@microplate.ai',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:${config.server.port}`,
          description: 'Development server'
        },
        {
          url: `https://api.microplate.ai`,
          description: 'Production server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT access token'
          },
          serviceAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Service-Token',
            description: 'Service-to-service authentication token'
          }
        },
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'VALIDATION_ERROR' },
                  message: { type: 'string', example: 'Validation failed' },
                  details: { type: 'object' },
                  requestId: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          SuccessResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
            },
          },
        },
      },
      tags: [
        { name: 'Samples', description: 'Sample management and querying' },
        { name: 'Runs', description: 'Prediction run management' },
        { name: 'Statistics', description: 'System statistics and analytics' },
        { name: 'WebSocket Subscriptions', description: 'Real-time subscription management' },
        { name: 'WebSocket Management', description: 'WebSocket connection management' },
        { name: 'Cache', description: 'Cache management operations' },
        { name: 'Health', description: 'Health and monitoring endpoints' },
        { name: 'Monitoring', description: 'Service monitoring and metrics' },
      ],
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
    uiHooks: {
      onRequest: function (_request, _reply, next) {
        next();
      },
      preHandler: function (_request, _reply, next) {
        next();
      }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, _request, _reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true
  });
};

// Initialize services and controllers
const initializeServices = () => {
  // Initialize services
  const resultService = new ResultServiceImpl(prisma, cacheService);
  const websocketService = new WebSocketServiceImpl();
  const aggregationService = new AggregationServiceImpl(prisma);

  // Initialize controllers
  const resultController = new ResultController(resultService, websocketService);
  const websocketController = new WebSocketController(websocketService);

  // Register services and controllers with Fastify instance
  fastify.decorate('resultService', resultService);
  fastify.decorate('websocketService', websocketService);
  fastify.decorate('aggregationService', aggregationService);
  fastify.decorate('resultController', resultController);
  fastify.decorate('websocketController', websocketController);
  fastify.decorate('cacheService', cacheService);
};

// Register routes
const registerRoutes = async () => {
  // Register API routes
  await fastify.register(resultRoutes, { prefix: '/api/v1/results' });
  
  if (config.features.websocket) {
    await fastify.register(websocketRoutes, { prefix: '/api/v1/results' });
  }
};

// Database notification listener for real-time updates
const setupDatabaseNotifications = async () => {
  if (!config.features.databaseNotifications) {
    return;
  }

  try {
    // Listen for interface_results_new notifications
    await prisma.$executeRaw`LISTEN interface_results_new`;
    
    // Set up notification handler
    const handleNotification = async (payload: string) => {
      try {
        const runId = parseInt(payload, 10);
        if (runId) {
          // Get sample number for this run
          const run = await prisma.predictionRun.findUnique({
            where: { id: runId },
            select: { sampleNo: true }
          });

          if (run) {
            // Update sample summary
            await (fastify.aggregationService as AggregationServiceImpl).updateSampleSummary(run.sampleNo);
            
            // Broadcast WebSocket updates
            if (config.features.websocket) {
              const websocketController = fastify.websocketController as WebSocketController;
              await websocketController.broadcastSampleUpdate(run.sampleNo, {
                sampleNo: run.sampleNo,
                runId,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      } catch (error) {
        fastify.log.error('Error handling database notification:', error);
      }
    };

    // This would need to be implemented with a proper PostgreSQL LISTEN/NOTIFY handler
    // For now, we'll log that it's set up
    fastify.log.info('Database notifications configured');

  } catch (error) {
    fastify.log.error('Failed to setup database notifications:', error);
  }
};

// Start server
const start = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    fastify.log.info('Database connected successfully');

    // Test cache connection
    const cacheHealthy = await cacheService.healthCheck();
    if (cacheHealthy) {
      fastify.log.info('Cache connected successfully');
    } else {
      fastify.log.warn('Cache connection failed - continuing without cache');
    }

    // Register plugins
    await registerPlugins();

    // Initialize services and controllers
    initializeServices();

    // Setup database notifications
    await setupDatabaseNotifications();

    // Register routes
    await registerRoutes();

    // Start server
    await fastify.listen({ 
      port: config.server.port, 
      host: config.server.host 
    });

    fastify.log.info(`Result API Service running on port ${config.server.port}`);
    fastify.log.info(`API documentation available at http://localhost:${config.server.port}/docs`);
    fastify.log.info(`WebSocket endpoint available at ws://localhost:${config.server.port}${config.websocket.path}`);
    fastify.log.info(`Environment: ${config.server.nodeEnv}`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close Fastify server
    await fastify.close();
    
    // Disconnect from database
    await prisma.$disconnect();
    
    // Disconnect from cache
    await cacheService.clear();
    
    fastify.log.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    fastify.log.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  fastify.log.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
start();

// Export for testing
export { fastify };
