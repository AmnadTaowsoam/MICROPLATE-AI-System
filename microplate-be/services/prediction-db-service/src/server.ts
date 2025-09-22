/**
 * Vision Inference Service - Node.js Database Management Service
 * 
 * This service provides database management functionality for the Vision Inference Service
 * using Prisma ORM. It handles database migrations, seeding, and provides a REST API
 * for database operations.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import { config } from './config/config';
import { logger } from './utils/logger';
import { healthRoutes } from './routes/health';
import { databaseRoutes } from './routes/database';
import { predictionRoutes } from './routes/predictions';
import { getRedisClient, disconnectRedis } from './utils/redis';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Initialize Fastify
const fastify = Fastify({
  logger: logger,
  disableRequestLogging: process.env.NODE_ENV === 'production',
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: config.cors.allowedOrigins,
    credentials: config.cors.allowCredentials,
    methods: config.cors.allowedMethods,
    allowedHeaders: config.cors.allowedHeaders,
  });

  // Security
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
  });
}

// Register routes
async function registerRoutes() {
  // Health check routes
  await fastify.register(healthRoutes, { prefix: '/api/v1/health' });
  
  // Database management routes
  await fastify.register(databaseRoutes, { prefix: '/api/v1/database' });
  
  // Prediction data routes
  await fastify.register(predictionRoutes, { prefix: '/api/v1/predictions' });
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  
  try {
    await fastify.close();
    await prisma.$disconnect();
    await disconnectRedis();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();

    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Initialize Redis (optional)
    await getRedisClient();

    // Start server
    const address = await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info(`Prediction DB Service running at ${address}`);
    logger.info(`Environment: ${config.server.nodeEnv}`);
    try {
      const dbHost = config.database.url.includes('@') ? config.database.url.split('@')[1] : config.database.url;
      logger.info(`Database: ${dbHost}`);
    } catch {}

    // Handle graceful shutdown
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown();
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
start();
