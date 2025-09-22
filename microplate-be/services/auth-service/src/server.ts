import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { authRoutes } from './routes/auth.routes';
import { healthRoutes } from './routes/health.routes';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { config } from './config/config';
import { bindJwt } from './utils/token.util';

const fastify = Fastify({
  logger: config.logFormat === 'pretty' ? {
    level: config.logLevel,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  } : {
    level: config.logLevel
  }
});

// Register error handler
fastify.setErrorHandler(errorHandler);

// Register request logger
fastify.addHook('onRequest', requestLogger);

// Register response logger
fastify.addHook('onSend', (request, reply, _payload, done) => {
  const startTime = (request as any).startTime;
  if (startTime) {
    const duration = Date.now() - startTime;
    request.log.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString()
    }, 'Request completed');
  }
  done();
});

// Register plugins
const registerPlugins = async () => {
  // CORS
  await fastify.register(cors, {
    origin: config.corsOrigin,
    credentials: config.corsCredentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
  });

  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.rateLimitMaxRequests,
    timeWindow: config.rateLimitWindowMs,
    errorResponseBuilder: (_request, _context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests'
      }
    })
  });

  // JWT
  await fastify.register(jwt, {
    secret: config.jwtAccessSecret,
    sign: {
      expiresIn: config.tokenExpiryAccess
    }
  });
  // Bind JWT to token util helpers
  bindJwt(fastify);

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Auth Service API',
        description: 'Authentication and Authorization Service for Microplate AI',
        version: '1.0.0'
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
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

// Register routes
const registerRoutes = async () => {
  // Health check routes (no auth required)
  await fastify.register(healthRoutes, { prefix: '' });

  // Auth routes (no auth required)
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
};

// Start server
const start = async () => {
  try {
    await registerPlugins();
    await registerRoutes();

    await fastify.listen({ 
      port: config.port, 
      host: '0.0.0.0' 
    });

    fastify.log.info(`Auth service running on port ${config.port}`);
    fastify.log.info(`API documentation available at http://localhost:${config.port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('Received SIGINT, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('Received SIGTERM, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();
