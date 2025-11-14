import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { PrismaClient } from '@prisma/client';
import { ResultServiceImpl } from '@/services/result.service';
import { WebSocketServiceImpl } from '@/services/websocket.service';
import { AggregationServiceImpl } from '@/services/aggregation.service';
import { LogsService } from '@/services/logs.service';
import { ResultController } from '@/controllers/result.controller';
import { WebSocketController } from '@/controllers/websocket.controller';

import { resultRoutes } from '@/routes/result.routes';
import { websocketRoutes } from '@/routes/websocket.routes';
import { directResultRoutes } from '@/routes/direct-result.routes';

import { errorHandler } from '@/utils/errors';
import { requestLogger, responseLogger } from '@/utils/logger';
import { cacheService } from '@/utils/redis';
import { config } from '@/config/config';
import type { Logger } from 'winston';

// Load shared logger at runtime to avoid TypeScript cross-package compilation issues
const sharedLoggerModule: Partial<{ default: Logger; logger: Logger }> = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../../shared/logger.js');
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../../shared/logger');
  }
})();

const logger: Logger = (sharedLoggerModule.default || sharedLoggerModule.logger || sharedLoggerModule) as Logger;

export const prisma = new PrismaClient({
  log: config.server.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const app = express();
const server = createServer(app);

if (config.cors.enabled) {
  const allowAllOrigins = config.cors.allowedOrigins.includes('*');

  app.use((request, response, next) => {
    const requestOrigin = request.headers.origin;

    if (allowAllOrigins) {
      response.header('Access-Control-Allow-Origin', '*');
    } else if (requestOrigin && config.cors.allowedOrigins.includes(requestOrigin)) {
      response.header('Access-Control-Allow-Origin', requestOrigin);
      response.header('Access-Control-Allow-Credentials', 'true');
      response.header('Vary', 'Origin');
    }

    response.header('Access-Control-Allow-Methods', config.cors.allowedMethods);
    response.header('Access-Control-Allow-Headers', config.cors.allowedHeaders);

    if (config.cors.exposedHeaders.length > 0) {
      response.header('Access-Control-Expose-Headers', config.cors.exposedHeaders.join(', '));
    }

    if (config.cors.maxAge) {
      response.header('Access-Control-Max-Age', String(config.cors.maxAge));
    }

    if (request.method === 'OPTIONS') {
      response.status(204).send();
      return;
    }

    next();
  });
}

app.use(helmet());

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
app.use(morgan('combined'));
app.use(requestLogger);

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased from 100)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests'
    }
  }
});
app.use(limiter);

const authConfig = {
  jwtSecret: process.env.JWT_ACCESS_SECRET || 'your-secret-key',
  jwtIssuer: process.env.JWT_ISSUER,
  jwtAudience: process.env.JWT_AUDIENCE
};

// Swagger documentation
const swaggerOptions = {
  definition: {
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
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerUi.generateHTML(swaggerSpec));
});

// Initialize services and controllers
const initializeServices = () => {
  // Initialize services
  const resultService = new ResultServiceImpl(prisma, cacheService);
  const websocketService = new WebSocketServiceImpl();
  const aggregationService = new AggregationServiceImpl(prisma);
  const logsService = new LogsService(process.env.REDIS_URL || 'redis://redis:6379');

  // Initialize controllers
  const resultController = new ResultController(resultService, websocketService);
  const websocketController = new WebSocketController(websocketService);

  // Make services available to routes
  app.locals.resultService = resultService;
  app.locals.websocketService = websocketService;
  app.locals.aggregationService = aggregationService;
  app.locals.logsService = logsService;
  app.locals.resultController = resultController;
  app.locals.websocketController = websocketController;
  app.locals.cacheService = cacheService;
};

// Routes will be registered after services are initialized

// WebSocket setup
if (config.features.websocket) {
  const wss = new WebSocketServer({ 
    server,
    path: config.websocket.path || '/ws'
  });

  wss.on('connection', (ws, req) => {
    // Handle WebSocket authentication
    const token = req.url?.split('token=')[1];
    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, authConfig.jwtSecret);
      
      // Add user info to WebSocket connection
      (ws as any).user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role || 'user'
      };

      // Handle WebSocket messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          // Handle WebSocket message routing
          const { websocketMessageHandlers } = require('@/routes/websocket.routes');
          websocketMessageHandlers.handleMessage(ws, data);
        } catch (error) {
          ws.send(JSON.stringify({
            success: false,
            error: { code: 'INVALID_MESSAGE', message: 'Invalid message format' }
          }));
        }
      });

      ws.on('close', () => {
        // Handle WebSocket disconnection
        const { websocketMessageHandlers } = require('@/routes/websocket.routes');
        websocketMessageHandlers.handleDisconnect(ws);
      });

    } catch (error) {
      ws.close(1008, 'Invalid token');
    }
  });
}

// Database notification listener for real-time updates
const setupDatabaseNotifications = async () => {
  if (!config.features.databaseNotifications) {
    return;
  }

  try {
    // Listen for inference_results_new notifications
    await prisma.$executeRaw`LISTEN inference_results_new`;
    
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
            await app.locals.aggregationService.updateSampleSummary(run.sampleNo);
            
            // Broadcast WebSocket updates
            if (config.features.websocket) {
              const websocketController = app.locals.websocketController as WebSocketController;
              await websocketController.broadcastSampleUpdate(run.sampleNo, {
                sampleNo: run.sampleNo,
                runId,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      } catch (error) {
        logger.error('Error handling database notification', { error });
      }
    };

    logger.info('Database notifications configured');

  } catch (error) {
    logger.error('Failed to setup database notifications', { error });
  }
};

// Start server
const start = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    const cacheHealthy = await cacheService.healthCheck();
    if (cacheHealthy) {
      logger.info('Cache connected successfully');
    } else {
      logger.warn('Cache connection failed - continuing without cache');
    }

    // Initialize services and controllers
    initializeServices();

    // Add sample logs for testing
    await app.locals.logsService.addSampleLogs();

    // Register routes after services are initialized
    app.use('/api/v1/results', resultRoutes(app.locals.resultController));
    app.use('/api/v1/results/direct', directResultRoutes());

    // Setup database notifications
    await setupDatabaseNotifications();

    // Error handling (after routes)
    app.use(errorHandler);

    // 404 handler (after all routes)
    app.use('*', (_req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found'
        }
      });
    });

    server.listen(config.server.port, config.server.host, () => {
      logger.info(`Result API Service running on port ${config.server.port}`);
      logger.info(`API documentation available at http://localhost:${config.server.port}/docs`);
      if (config.features.websocket) {
        logger.info(`WebSocket endpoint available at ws://localhost:${config.server.port}${config.websocket.path}`);
      }
      logger.info(`Environment: ${config.server.nodeEnv}`);
    });

  } catch (err) {
    logger.error('Startup error', { error: err });
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    server.close();
    await prisma.$disconnect();
    await cacheService.clear();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise, reason });
  gracefulShutdown('unhandledRejection');
});

start();
export { app, server };