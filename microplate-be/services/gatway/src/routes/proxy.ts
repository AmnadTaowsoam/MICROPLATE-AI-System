import { request } from 'undici';
import { EnvConfig } from '../config/env';

type ProxyRoute = {
  prefix: string;
  target: string;
  skipAuthPaths?: string[];
  rate?: { windowMs: number; max: number };
};

export async function registerProxyRoutes(app: any, cfg: EnvConfig) {
  const routes: ProxyRoute[] = [
    { prefix: '/api/v1/auth', target: cfg.services.auth, skipAuthPaths: ['/signup', '/login'], rate: cfg.rateLimit.auth },
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

        const url = `${r.target}${subPath}`;
        const headers: Record<string, any> = { ...req.headers };
        delete headers['host'];

        const method = req.method as any;
        const hasBody = !['GET', 'HEAD'].includes(String(method).toUpperCase());
        const body = hasBody ? (typeof req.body === 'string' ? req.body : (req.body ? JSON.stringify(req.body) : undefined)) : undefined;

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


