import { request } from 'undici';
import { EnvConfig } from '../config/env';

type ProxyRoute = {
  prefix: string;
  target: string;
  skipAuthPaths?: string[];
  rate?: { windowMs: number; max: number };
};

export async function registerProxyRoutes(app: any, cfg: EnvConfig) {
  // Special proxy for multipart inference upload to ensure raw passthrough
  app.route({
    url: '/api/v1/inference/predict',
    method: ['POST'] as any,
    // Explicitly bypass any schema/content-type expectations
    handler: async (req: any, reply: any) => {
      // Enforce auth header
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      if (!authHeader) {
        reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' } });
        return;
      }

      const targetUrl = `${cfg.services.inference}/api/v1/inference/predict`;
      const headers: Record<string, any> = { ...req.headers };
      delete headers['host'];
      // Ensure content-type stays multipart, and keep content-length if present

      // Body: prefer raw Buffer/body if available, fallback to req.raw stream
      const body = typeof req.body === 'object' && Buffer.isBuffer(req.body) ? req.body : (req.raw as any);

      const res = await (await import('undici')).request(targetUrl, {
        method: 'POST',
        headers,
        body
      } as any);

      reply.code(res.statusCode);
      for (const [k, v] of Object.entries(res.headers)) {
        if (v) reply.header(k, v as any);
      }
      const buf = await (res.body as any).arrayBuffer();
      reply.send(Buffer.from(buf));
    }
  });

  const routes: ProxyRoute[] = [
    { prefix: '/api/v1/auth', target: cfg.services.auth, skipAuthPaths: ['/signup', '/login', '/register'], rate: cfg.rateLimit.auth },
    { prefix: '/api/v1/images', target: cfg.services.images },
    { prefix: '/api/v1/inference', target: cfg.services.inference, rate: cfg.rateLimit.inference },
    { prefix: '/api/v1/results', target: cfg.services.results },
    { prefix: '/api/v1/interface', target: cfg.services.interface },
    { prefix: '/api/v1/capture', target: cfg.services.capture, rate: cfg.rateLimit.capture }
  ];

  for (const r of routes) {
    app.route({
      url: `${r.prefix}/*`,
      method: ['GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD'] as any,
      config: r.rate ? { rateLimit: { max: r.rate.max, timeWindow: r.rate.windowMs } } : undefined,
      handler: async (req: any, reply: any) => {
        const subPath = (req.url || '').substring(r.prefix.length);

        const isAuthPrefix = r.prefix === '/api/v1/auth';
        const isSkipAuth = isAuthPrefix && (r.skipAuthPaths || []).some((p) => subPath.startsWith(p));
        if ((isAuthPrefix && !isSkipAuth) || !isAuthPrefix) {
          const authHeader = req.headers['authorization'] || req.headers['Authorization'];
          if (!authHeader) {
            reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' } });
            return;
          }
        }

        // Reconstruct full upstream path using the configured prefix + captured subPath
        // In Fastify, req.url inside a wildcard route may be trimmed; use r.prefix + subPath to ensure correctness
        const upstreamPath = `${r.prefix}${subPath}`;
        const url = `${r.target}${upstreamPath}`;
        const headers: Record<string, any> = { ...req.headers };
        delete headers['host'];
        delete headers['expect'];
        delete (headers as any)['Expect'];

        const method = req.method as any;
        // Forward raw body to support multipart/form-data and other encodings
        const hasBody = !['GET', 'HEAD'].includes(String(method).toUpperCase());
        const body = hasBody ? (req as any).raw : undefined;

        const res = await request(url, { method, headers, body } as any);

        reply.code(res.statusCode);
        for (const [k, v] of Object.entries(res.headers)) {
          if (v) reply.header(k, v as any);
        }
        const buf = await (res.body as any).arrayBuffer();
        reply.send(Buffer.from(buf));
      }
    });
  }
}


