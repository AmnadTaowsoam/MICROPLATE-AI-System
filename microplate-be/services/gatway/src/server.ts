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

  // Strict content-type parsers: disable defaults, re-add JSON and URL-encoded; all others (e.g., multipart) stay raw Buffer
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('application/json', { parseAs: 'string' }, function (_req: any, body: string, done: (err: Error | null, body: any) => void) {
    try { done(null, body ? JSON.parse(body) : {}); } catch (e: any) { done(e, undefined as any); }
  });
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, function (_req: any, body: string, done: (err: Error | null, body: any) => void) {
    const params = new URLSearchParams(body || ''); const obj: any = {}; params.forEach((v, k) => obj[k] = v); done(null, obj);
  });
  app.addContentTypeParser('*', { parseAs: 'buffer' }, function (_req: any, body: Buffer, done: (err: Error | null, body: Buffer) => void) {
    done(null, body);
  });

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
