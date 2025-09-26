import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../../shared/auth-middleware';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const app = express();
const PORT = Number(process.env.PORT || 6405);

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
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

// Authentication middleware
const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtIssuer: process.env.JWT_ISSUER,
  jwtAudience: process.env.JWT_AUDIENCE
};

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Labware Interface Service API',
      description: 'Labware Interface Service for Microplate AI',
      version: '1.0.0'
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
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
  },
  apis: ['./src/routes/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerUi.generateHTML(swaggerSpec));
});

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not-ready' });
  }
});

// Protected routes
app.use('/api/v1/labware', authenticateToken(authConfig), (req, res) => {
  res.json({
    success: true,
    message: 'Labware interface endpoints coming soon',
    user: req.user
  });
});

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
});

// 404 handler
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
const start = async () => {
  try {
    await prisma.$connect();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Labware Interface Service running on port ${PORT}`);
      console.log(`API documentation available at http://localhost:${PORT}/docs`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

start();
