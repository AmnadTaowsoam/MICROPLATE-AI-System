import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import multer from 'multer';
import dotenv from 'dotenv';
import { imageRoutes } from './routes/image.routes';
import { ensureBuckets } from './services/s3.service';
import { authenticateToken } from '../shared/auth-middleware';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 6402);

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

// File upload configuration
const upload = multer({
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024) // 50MB default
  }
});

// Authentication middleware
const authConfig = {
  jwtSecret: process.env.JWT_ACCESS_SECRET || 'your-secret-key',
  jwtIssuer: process.env.JWT_ISSUER,
  jwtAudience: process.env.JWT_AUDIENCE
};

// Routes
app.use('/api/v1/images', authenticateToken(authConfig), upload.single('file') as any, imageRoutes);

// Health check routes
app.get('/healthz', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', async (_req: express.Request, res: express.Response) => {
  try {
    await ensureBuckets();
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not-ready' });
  }
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

// 404 handler - catch all unmatched routes
app.use((_req: express.Request, res: express.Response) => {
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
    await ensureBuckets();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Image ingestion service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

start();



