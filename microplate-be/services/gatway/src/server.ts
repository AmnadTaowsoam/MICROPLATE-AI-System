import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadEnv } from './config/env';
import { registerProxyRoutes } from './routes/proxy';
import { registerLogRoutes } from './routes/logs';
import { registerRequestLogging } from './middleware/logging';
import { registerSecurityPlugins } from './middleware/security';

function buildApp() {
  const app = express();
  const cfg = loadEnv();

  // Basic middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logging
  registerRequestLogging(app);

  // Security plugins
  registerSecurityPlugins(app, cfg);

  // Health check endpoints
  app.get(cfg.healthPath, async (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get(cfg.readyPath, async (req, res) => {
    res.json({ ready: true });
  });

  // Metrics endpoint
  if (cfg.metricsEnabled) {
    app.get(cfg.metricsPath, async (req, res) => {
      res.set('Content-Type', 'text/plain');
      res.send('# minimal metrics placeholder\n');
    });
  }

  // Register proxy routes
  registerProxyRoutes(app, cfg);

  // Register log routes
  registerLogRoutes(app);

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error handler:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found'
      }
    });
  });

  return app;
}

async function start() {
  const app = buildApp();
  const cfg = loadEnv();

  try {
    app.listen(cfg.port, '0.0.0.0', () => {
      console.log(`Server listening at http://0.0.0.0:${cfg.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start server if this file is run directly
start().catch(console.error);

export { buildApp, start };