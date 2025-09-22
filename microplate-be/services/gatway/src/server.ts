import Fastify from 'fastify';
import { loadEnv } from './config/env';
import { registerSecurityPlugins } from './plugins/security';
import { registerProxyRoutes } from './routes/proxy';
import { registerRequestLogging } from './plugins/logging';
import { registerLogRoutes } from './routes/logs';

type ProxyRoute = {
  prefix: string;
  target: string;
  skipAuthPaths?: string[];
};

function buildApp() {
  const app = Fastify({
    logger: true
  });
  const cfg = loadEnv();

  registerRequestLogging(app);
  registerSecurityPlugins(app, cfg);

  app.get(cfg.healthPath, async () => ({ status: 'ok' }));
  app.get(cfg.readyPath, async () => ({ ready: true }));

  if (cfg.metricsEnabled) {
    app.get(cfg.metricsPath, async () => '# minimal metrics placeholder\n');
  }

  registerProxyRoutes(app, cfg);
  registerLogRoutes(app);

  return app;
}

function start() {
  const app = buildApp();
  const cfg = loadEnv();
  app.listen({ port: cfg.port, host: '0.0.0.0' }).catch((err: any) => {
    app.log.error(err);
    process.exit(1);
  });
}

start();
