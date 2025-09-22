import { FastifyRequest, FastifyReply } from 'fastify';
import { createError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    username: string;
    roles: string[];
  };
}

// JWT authentication middleware (for gateway integration)
export const authenticateToken = async (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => {
  try {
    // Gateway should have already verified the token and set user headers
    const userId = request.headers['x-user-id'] as string;
    const userEmail = request.headers['x-user-email'] as string;
    const username = request.headers['x-username'] as string;
    const roles = request.headers['x-roles'] as string;

    if (!userId) {
      throw createError.unauthorized('User information not provided by gateway');
    }

    // Extract user information from gateway headers
    request.user = {
      id: userId,
      email: userEmail || '',
      username: username || '',
      roles: roles ? roles.split(',') : [],
    };

    logger.debug('User authenticated via gateway', { 
      userId: request.user.id,
      username: request.user.username,
      roles: request.user.roles
    });

  } catch (error) {
    logger.warn('Authentication failed', { error: error.message });
    throw createError.unauthorized('Authentication required');
  }
};

// Role-based authorization middleware
export const requireRole = (requiredRoles: string | string[]) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw createError.unauthorized('Authentication required');
    }

    const userRoles = request.user.roles;
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('Insufficient permissions', { 
        userId: request.user.id,
        userRoles,
        requiredRoles: roles
      });
      throw createError.forbidden(`Required roles: ${roles.join(', ')}`);
    }

    logger.debug('Authorization successful', { 
      userId: request.user.id,
      userRoles,
      requiredRoles: roles
    });
  };
};

// Permission-based authorization middleware
export const requirePermission = (permission: string) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw createError.unauthorized('Authentication required');
    }

    // Check if user has admin role (admins have all permissions)
    if (request.user.roles.includes('admin')) {
      return;
    }

    // Check specific permission
    // This would typically involve checking against a permissions table
    // For now, we'll use a simple role-based check
    const permissionMap: Record<string, string[]> = {
      'results:read': ['admin', 'operator', 'viewer'],
      'results:write': ['admin', 'operator'],
      'results:delete': ['admin'],
      'system:admin': ['admin'],
    };

    const allowedRoles = permissionMap[permission];
    if (!allowedRoles) {
      logger.error('Unknown permission', { permission });
      throw createError.forbidden('Unknown permission');
    }

    const hasPermission = allowedRoles.some(role => request.user!.roles.includes(role));
    
    if (!hasPermission) {
      logger.warn('Permission denied', { 
        userId: request.user.id,
        userRoles: request.user.roles,
        requiredPermission: permission
      });
      throw createError.forbidden(`Required permission: ${permission}`);
    }

    logger.debug('Permission granted', { 
      userId: request.user.id,
      permission
    });
  };
};

// Optional authentication middleware (doesn't fail if no user info)
export const optionalAuth = async (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => {
  try {
    // Gateway should have already verified the token and set user headers
    const userId = request.headers['x-user-id'] as string;
    const userEmail = request.headers['x-user-email'] as string;
    const username = request.headers['x-username'] as string;
    const roles = request.headers['x-roles'] as string;

    if (userId) {
      request.user = {
        id: userId,
        email: userEmail || '',
        username: username || '',
        roles: roles ? roles.split(',') : [],
      };
      
      logger.debug('Optional authentication successful', { 
        userId: request.user.id,
        username: request.user.username
      });
    }
  } catch (error) {
    // Optional auth - don't throw error, just log
    logger.debug('Optional authentication failed', { error: error.message });
  }
};

// Service-to-service authentication middleware
export const authenticateService = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const serviceToken = request.headers['x-service-token'] as string;
    
    if (!serviceToken) {
      throw createError.unauthorized('Service token is required');
    }

    // Verify service token (this would typically be a separate secret)
    // For now, we'll do a simple check
    const expectedToken = process.env.SERVICE_JWT_SECRET || 'service-secret';
    
    if (serviceToken !== expectedToken) {
      throw createError.unauthorized('Invalid service token');
    }

    logger.debug('Service authentication successful');
    
  } catch (error) {
    logger.warn('Service authentication failed', { error: error.message });
    throw createError.unauthorized('Service authentication failed');
  }
};

// Extract JWT token from request
function extractToken(request: FastifyRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try query parameter
  const queryToken = (request.query as any)?.token;
  if (queryToken) {
    return queryToken;
  }

  return null;
}

// Rate limiting per user
export const rateLimitPerUser = async (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => {
  if (request.user) {
    // Add user-specific rate limiting logic here
    // This could involve Redis counters per user
    logger.debug('User rate limiting applied', { userId: request.user.id });
  }
};

// Audit logging middleware
export const auditLog = async (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => {
  const originalSend = reply.send;
  
  reply.send = function(payload: any) {
    // Log the request/response for audit purposes
    logger.info('API request audited', {
      userId: request.user?.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      timestamp: new Date().toISOString(),
    });
    
    return originalSend.call(this, payload);
  };
};

// Request ID middleware (if not already handled by Fastify)
export const requestIdMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Fastify should already have request.id, but we can ensure it's set
  if (!request.id) {
    request.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Add request ID to response headers
  reply.header('X-Request-ID', request.id);
};
