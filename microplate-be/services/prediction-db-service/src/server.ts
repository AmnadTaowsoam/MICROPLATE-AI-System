/**
 * Vision Inference Service - Node.js Database Management Service
 * 
 * This service provides database management functionality for the Vision Inference Service
 * using Prisma ORM. It handles database migrations, seeding, and provides a REST API
 * for database operations.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { config } from './config/config';
import { logger } from './utils/logger';
import { healthRoutes } from './routes/health';
import { databaseRoutes } from './routes/database';
import { predictionRoutes } from './routes/predictions';
import { getRedisClient, disconnectRedis } from './utils/redis';
// import { authenticateToken } from '../../shared/auth-middleware';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Initialize Express
const app = express();

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests'
    }
  }
});
app.use(limiter);

// Authentication middleware (commented out)
// const authConfig = {
//   jwtSecret: process.env['JWT_SECRET'] || 'your-secret-key',
//   jwtIssuer: process.env['JWT_ISSUER'],
//   jwtAudience: process.env['JWT_AUDIENCE']
// };

// Register routes
app.use('/api/v1/health', healthRoutes());
app.use('/api/v1/database', databaseRoutes());
app.use('/api/v1/predictions', predictionRoutes());

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
});

// 404 handler
app.use('*', (_req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  
  try {
    await prisma.$disconnect();
    await disconnectRedis();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', String(error));
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Initialize Redis (optional)
    await getRedisClient();

    // Start server
    app.listen(config.server.port, config.server.host, () => {
      logger.info(`Prediction DB Service running on port ${config.server.port}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);
      try {
        const dbHost = config.database.url.includes('@') ? config.database.url.split('@')[1] : config.database.url;
        logger.info(`Database: ${dbHost}`);
      } catch {}
    });

    // Handle graceful shutdown
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', String(error));
      gracefulShutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled Rejection at: ${promise}, reason: ${String(reason)}`);
      gracefulShutdown();
    });

  } catch (error) {
    logger.error({ error: String(error) }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
start();
