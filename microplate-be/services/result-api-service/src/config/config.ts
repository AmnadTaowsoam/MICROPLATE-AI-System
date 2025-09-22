import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '6404', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/microplates',
  },

  // Gateway Integration - JWT, CORS, Rate Limiting handled by gateway

  // WebSocket configuration
  websocket: {
    path: process.env.WEBSOCKET_PATH || '/api/v1/results/ws',
    pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL || '30000', 10),
    pongTimeout: parseInt(process.env.WEBSOCKET_PONG_TIMEOUT || '5000', 10),
    enabled: process.env.ENABLE_WEBSOCKET === 'true',
  },

  // Redis/Cache configuration
  cache: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.CACHE_TTL || '300', 10),
    prefix: process.env.CACHE_PREFIX || 'result-api',
    logChannel: process.env.REDIS_LOG_CHANNEL || 'microplate:result-api:logs',
    errorChannel: process.env.REDIS_ERROR_CHANNEL || 'microplate:result-api:errors',
  },

  // Pagination configuration
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'pretty',
  },

  // External services
  services: {
    predictionDb: process.env.PREDICTION_DB_SERVICE_URL || 'http://prediction-db-service:6403',
    imageService: process.env.IMAGE_SERVICE_URL || 'http://image-ingestion-service:6402',
  },

  // Feature flags
  features: {
    websocket: process.env.ENABLE_WEBSOCKET === 'true',
    databaseNotifications: process.env.ENABLE_DATABASE_NOTIFICATIONS === 'true',
    caching: process.env.ENABLE_CACHING !== 'false',
  },

  // API configuration
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:6400',
    version: 'v1',
  },
} as const;

// Validation
if (!config.database.url) {
  throw new Error('DATABASE_URL is required');
}

export default config;
