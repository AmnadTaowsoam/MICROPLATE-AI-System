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

/**
 * Authentication middleware for Express services
 * Validates JWT tokens and adds user information to request
 */
export const authenticateToken = (config: AuthConfig) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Access token is required'
          }
        });
      }

      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience
      }) as any;

      // Add user info to request
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
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired'
          }
        });
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid access token'
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error'
        }
      });
    }
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = (config: AuthConfig) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    } catch (error) {
      // For optional auth, we just continue without user info
      next();
    }
  };
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

/**
 * Service-to-service authentication middleware
 * Validates service tokens for internal communication
 */
export const authenticateService = (config: AuthConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceToken = req.headers['x-service-token'] as string;

      if (!serviceToken) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_SERVICE_TOKEN',
            message: 'Service token is required'
          }
        });
      }

      // Verify service token
      const decoded = jwt.verify(serviceToken, config.jwtSecret) as any;

      if (decoded.type !== 'service') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SERVICE_TOKEN',
            message: 'Invalid service token type'
          }
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SERVICE_TOKEN',
          message: 'Invalid service token'
        }
      });
    }
  };
};
