import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema
const configSchema = z.object({
  server: z.object({
    port: z.number().default(6404),
    host: z.string().default('0.0.0.0'),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  }),
  database: z.object({
    url: z.string().min(1, 'DATABASE_URL is required'),
  }),
  redis: z.object({
    url: z.string().optional(),
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().default(0),
  }),
  cors: z.object({
    allowedOrigins: z.array(z.string()).default(['http://localhost:3000']),
    allowCredentials: z.boolean().default(true),
    allowedMethods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default(['Authorization', 'Content-Type', 'Accept']),
  }),
  rateLimit: z.object({
    max: z.number().default(100),
    timeWindow: z.string().default('1 minute'),
  }),
  jwt: z.object({
    secret: z.string().default(''),
    expiresIn: z.string().default('1h'),
  }).default({ secret: '', expiresIn: '1h' }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
    redis: z.object({
      enabled: z.boolean().default(true),
      logChannel: z.string().default('microplate:prediction-db:logs'),
      errorChannel: z.string().default('microplate:prediction-db:errors'),
    }).default({ enabled: true, logChannel: 'microplate:prediction-db:logs', errorChannel: 'microplate:prediction-db:errors' }),
  }),
});

// Parse and validate configuration
const rawConfig = {
  server: {
    port: parseInt(process.env.PORT || '6404'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    allowCredentials: process.env.CORS_ALLOW_CREDENTIALS === 'true',
    allowedMethods: process.env.CORS_ALLOW_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: process.env.CORS_ALLOW_HEADERS?.split(',') || ['Authorization', 'Content-Type', 'Accept'],
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: process.env.RATE_LIMIT_TIME_WINDOW || '1 minute',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  logging: {
    level: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
    format: (process.env.LOG_FORMAT || 'json') as 'json' | 'pretty',
    redis: {
      enabled: (process.env.REDIS_LOG_ENABLED || 'true') === 'true',
      logChannel: process.env.REDIS_LOG_CHANNEL || 'microplate:prediction-db:logs',
      errorChannel: process.env.REDIS_ERROR_CHANNEL || 'microplate:prediction-db:errors',
    },
  },
};

export const config = configSchema.parse(rawConfig);

// Export individual configs for convenience
export const { server, database, redis, cors, rateLimit, jwt, logging } = config;
