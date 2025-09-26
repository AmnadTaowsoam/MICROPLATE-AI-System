import express from 'express';
import { request } from 'undici';
import { EnvConfig } from '../config/env';

interface ProxyRoute {
  prefix: string;
  target: string;
  rate?: {
    max: number;
    windowMs: number;
  };
  skipAuthPaths?: string[];
}

export async function registerProxyRoutes(app: express.Application, cfg: EnvConfig) {
  // Special proxy for auth endpoints
  app.use('/api/v1/auth', async (req, res, next) => {
    try {
      const subPath = req.path; // Express already strips the prefix for middleware
      const isSkipAuth = ['/signup', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].some((p) => subPath.startsWith(p));

      if (!isSkipAuth) {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (!authHeader) {
          return res.status(401).json({ 
            success: false, 
            error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' } 
          });
        }
      }

      const upstreamPath = `/api/v1/auth${subPath}`;
      const url = `${cfg.services.auth}${upstreamPath}`;
      const headers: Record<string, any> = { ...req.headers };
      delete headers['host'];
      delete headers['expect'];
      delete (headers as any)['Expect'];

      const method = req.method as any;
      const hasBody = !['GET', 'HEAD'].includes(String(method).toUpperCase());
      const body = hasBody ? JSON.stringify(req.body) : undefined;

      const response = await request(url, { method, headers, body } as any);

      res.status(response.statusCode);
      for (const [k, v] of Object.entries(response.headers)) {
        if (v) res.set(k, v as any);
      }
      
      const buf = await (response.body as any).arrayBuffer();
      res.send(Buffer.from(buf));
    } catch (error) {
      console.error('Auth proxy error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' }
      });
    }
  });

  // Special proxy for multipart inference upload
  app.use('/api/v1/inference/predict', async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      if (!authHeader) {
        return res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' } 
        });
      }

      const targetUrl = `${cfg.services.inference}/api/v1/inference/predict`;
      const headers: Record<string, any> = { ...req.headers };
      delete headers['host'];

      // For multipart, we need to handle the raw body differently
      const response = await request(targetUrl, {
        method: 'POST',
        headers,
        body: req
      } as any);

      res.status(response.statusCode);
      for (const [k, v] of Object.entries(response.headers)) {
        if (v) res.set(k, v as any);
      }
      
      const buf = await (response.body as any).arrayBuffer();
      res.send(Buffer.from(buf));
    } catch (error) {
      console.error('Inference proxy error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' }
      });
    }
  });

  const routes: ProxyRoute[] = [
    { prefix: '/api/v1/images', target: cfg.services.images },
    { prefix: '/api/v1/inference', target: cfg.services.inference, rate: cfg.rateLimit.inference },
    { prefix: '/api/v1/results', target: cfg.services.results },
    { prefix: '/api/v1/interface', target: cfg.services.interface },
    { prefix: '/api/v1/capture', target: cfg.services.capture, rate: cfg.rateLimit.capture }
  ];

  for (const route of routes) {
    app.use(route.prefix, async (req, res, next) => {
      try {
        const subPath = req.path.substring(route.prefix.length);
        const upstreamPath = `${route.prefix}${subPath}`;
        const url = `${route.target}${upstreamPath}`;
        
        const headers: Record<string, any> = { ...req.headers };
        delete headers['host'];
        delete headers['expect'];
        delete (headers as any)['Expect'];

        const method = req.method as any;
        const hasBody = !['GET', 'HEAD'].includes(String(method).toUpperCase());
        const body = hasBody ? JSON.stringify(req.body) : undefined;

        const response = await request(url, { method, headers, body } as any);

        res.status(response.statusCode);
        for (const [k, v] of Object.entries(response.headers)) {
          if (v) res.set(k, v as any);
        }
        
        const buf = await (response.body as any).arrayBuffer();
        res.send(Buffer.from(buf));
      } catch (error) {
        console.error(`Proxy error for ${route.prefix}:`, error);
        res.status(500).json({
          success: false,
          error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' }
        });
      }
    });
  }
}