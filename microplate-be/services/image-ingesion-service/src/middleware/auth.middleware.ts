import { Request, Response, NextFunction } from 'express';

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  if (String(process.env.DISABLE_AUTH || '').toLowerCase() === 'true') {
    return next();
  }

  const auth = request.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return response.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' } });
  }

  const token = auth.slice('Bearer '.length).trim();
  if (!token) {
    return response.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }

  // Trust the API Gateway's JWT verification. Optionally add local verification in future.
  next();
}


