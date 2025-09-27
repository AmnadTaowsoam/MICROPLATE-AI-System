import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    iat: number;
    exp: number;
  };
}

export interface AuthConfig {
  jwtSecret: string;
  jwtIssuer?: string;
  jwtAudience?: string;
}

export const authenticateToken = (config: AuthConfig) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Access token is required'
          }
        });
        return;
      }

      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience
      }) as any;

      req.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
        iat: decoded.iat,
        exp: decoded.exp
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired'
          }
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid access token'
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error'
        }
      });
      return;
    }
  };
};

export const optionalAuth = (config: AuthConfig) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        const decoded = jwt.verify(token, config.jwtSecret, {
          issuer: config.jwtIssuer,
          audience: config.jwtAudience
        }) as any;

        req.user = {
          id: decoded.sub || decoded.id,
          email: decoded.email,
          role: decoded.role || 'user',
          iat: decoded.iat,
          exp: decoded.exp
        };
      }

      next();
    } catch (_error) {
      next();
    }
  };
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions'
        }
      });
      return;
    }

    next();
  };
};

export const authenticateService = (config: AuthConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const serviceToken = req.headers['x-service-token'] as string;

      if (!serviceToken) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_SERVICE_TOKEN',
            message: 'Service token is required'
          }
        });
        return;
      }

      const decoded = jwt.verify(serviceToken, config.jwtSecret) as any;

      if (decoded.type !== 'service') {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SERVICE_TOKEN',
            message: 'Invalid service token type'
          }
        });
        return;
      }

      next();
    } catch (_error) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SERVICE_TOKEN',
            message: 'Invalid service token'
          }
        });
        return;
    }
  };
};
