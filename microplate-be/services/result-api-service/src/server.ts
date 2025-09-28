import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Import services and controllers
import { PrismaClient } from '@prisma/client';
import { ResultServiceImpl } from '@/services/result.service';
import { WebSocketServiceImpl } from '@/services/websocket.service';
import { AggregationServiceImpl } from '@/services/aggregation.service';
import { LogsService } from '@/services/logs.service';
import { ResultController } from '@/controllers/result.controller';
import { WebSocketController } from '@/controllers/websocket.controller';

// Import routes
import { resultRoutes } from '@/routes/result.routes';
import { websocketRoutes } from '@/routes/websocket.routes';
import { directResultRoutes } from '@/routes/direct-result.routes';

// Import middleware and utilities
import { errorHandler } from '@/utils/errors';
import { requestLogger, responseLogger } from '@/utils/logger';
import { cacheService } from '@/utils/redis';
import { config } from '@/config/config';
// import { authenticateToken } from '../../shared/auth-middleware';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: config.server.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Initialize Express
const app = express();
const server = createServer(app);

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins for now
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

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

// Authentication middleware
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
        console.error('Error handling database notification:', error);
      }
    };

    // This would need to be implemented with a proper PostgreSQL LISTEN/NOTIFY handler
    // For now, we'll log that it's set up
    console.log('Database notifications configured');

  } catch (error) {
    console.error('Failed to setup database notifications:', error);
  }
};

// Start server
const start = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Database connected successfully');

    // Test cache connection
    const cacheHealthy = await cacheService.healthCheck();
    if (cacheHealthy) {
      console.log('Cache connected successfully');
    } else {
      console.warn('Cache connection failed - continuing without cache');
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

    // Start server
    server.listen(config.server.port, config.server.host, () => {
      console.log(`Result API Service running on port ${config.server.port}`);
      console.log(`API documentation available at http://localhost:${config.server.port}/docs`);
      if (config.features.websocket) {
        console.log(`WebSocket endpoint available at ws://localhost:${config.server.port}${config.websocket.path}`);
      }
      console.log(`Environment: ${config.server.nodeEnv}`);
    });

  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close HTTP server
    server.close();
    
    // Disconnect from database
    await prisma.$disconnect();
    
    // Disconnect from cache
    await cacheService.clear();
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
start();

// Export for testing
export { app, server };