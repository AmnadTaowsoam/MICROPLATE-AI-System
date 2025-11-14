import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from service .env at project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configuration schema
const configSchema = z.object({
  server: z.object({
    port: z.number().default(6406),
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
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
    redis: z.object({
      enabled: z.boolean().default(true),
      logChannel: z.string().default('microplate:prediction-db:logs'),
      errorChannel: z.string().default('microplate:prediction-db:errors'),
    }).default({ enabled: true, logChannel: 'microplate:prediction-db:logs', errorChannel: 'microplate:prediction-db:errors' }),
  }),
  cors: z.object({
    enabled: z.boolean().default(true),
    allowedOrigins: z.array(z.string()).default(['*']),
    allowedMethods: z.string().default('GET,POST,PUT,PATCH,DELETE,OPTIONS'),
    allowedHeaders: z.string().default('Origin, X-Requested-With, Content-Type, Accept, Authorization'),
    exposedHeaders: z.array(z.string()).default([]),
    maxAge: z.number().default(600),
  }),
});

const parseCsv = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return parts.length > 0 ? parts : fallback;
};

// Parse and validate configuration
const rawConfig = {
  server: {
    port: parseInt(process.env['PORT'] || '6406'),
    host: process.env['HOST'] || '0.0.0.0',
    nodeEnv: (process.env['NODE_ENV'] || 'development') as 'development' | 'production' | 'test',
  },
  database: {
    url: process.env['DATABASE_URL'] || '',
  },
  redis: {
    url: process.env['REDIS_URL'],
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    password: process.env['REDIS_PASSWORD'],
    db: parseInt(process.env['REDIS_DB'] || '0'),
  },
  logging: {
    level: (process.env['LOG_LEVEL'] || 'info') as 'error' | 'warn' | 'info' | 'debug',
    format: (process.env['LOG_FORMAT'] || 'json') as 'json' | 'pretty',
    redis: {
      enabled: (process.env['REDIS_LOG_ENABLED'] || 'true') === 'true',
      logChannel: process.env['REDIS_LOG_CHANNEL'] || 'microplate:prediction-db:logs',
      errorChannel: process.env['REDIS_ERROR_CHANNEL'] || 'microplate:prediction-db:errors',
    },
  },
  cors: {
    enabled: (process.env['ENABLE_CORS'] || 'true') === 'true',
    allowedOrigins: parseCsv(process.env['CORS_ALLOWED_ORIGINS'], ['*']),
    allowedMethods: process.env['CORS_ALLOWED_METHODS'] || 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders:
      process.env['CORS_ALLOWED_HEADERS'] || 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    exposedHeaders: parseCsv(process.env['CORS_EXPOSED_HEADERS'], []),
    maxAge: parseInt(process.env['CORS_MAX_AGE'] || '600'),
  },
};

export const config = configSchema.parse(rawConfig);

// Export individual configs for convenience
export const { server, database, redis, logging, cors } = config;
