import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import { 
  loginSchema, 
  registerSchema, 
  refreshTokenSchema, 
  passwordResetRequestSchema,
  passwordResetSchema
} from '../schemas/auth.schemas';
import { ApiResponse } from '../types/auth.types';

const prisma = new PrismaClient();
const auditService = new AuditService(prisma);
const authService = new AuthService(prisma, auditService);

export const authRoutes = async (fastify: FastifyInstance) => {
  // Register user
  fastify.post('/register', {
    schema: {
      description: 'Register a new user',
      tags: ['Authentication'],
      body: registerSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    username: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    emailVerified: { type: 'boolean' }
                  }
                },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await authService.register(request.body as any, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || 'unknown'
      });

      const response: ApiResponse = {
        success: true,
        data: result
      };

      return reply.status(201 as any).send(response);
    } catch (error) {
      throw error;
    }
  });

  // Login user
  fastify.post('/login', {
    schema: {
      description: 'Authenticate user and return JWT tokens',
      tags: ['Authentication'],
      body: loginSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                tokenType: { type: 'string' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    username: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    roles: { type: 'array', items: { type: 'string' } },
                    emailVerified: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, _reply) => {
    try {
      const result = await authService.login(request.body as any, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || 'unknown'
      });

      const response: ApiResponse = {
        success: true,
        data: result
      };

      return response;
    } catch (error) {
      throw error;
    }
  });

  // Refresh access token
  fastify.post('/refresh', {
    schema: {
      description: 'Refresh access token using refresh token',
      tags: ['Authentication'],
      body: refreshTokenSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                tokenType: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, _reply) => {
    try {
      const body = request.body as any;
      const result = await authService.refreshToken(body.refreshToken, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || 'unknown' || 'unknown'
      });

      const response: ApiResponse = {
        success: true,
        data: result
      };

      return response;
    } catch (error) {
      throw error;
    }
  });

  // Logout user
  fastify.post('/logout', {
    schema: {
      description: 'Logout user and revoke refresh token',
      tags: ['Authentication'],
      body: refreshTokenSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, _reply) => {
    try {
      const body = request.body as any;
      await authService.logout(body.refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully'
      };

      return response;
    } catch (error) {
      throw error;
    }
  });

  // Request password reset
  fastify.post('/forgot-password', {
    schema: {
      description: 'Request password reset',
      tags: ['Authentication'],
      body: passwordResetRequestSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, _reply) => {
    try {
      const result = await authService.requestPasswordReset(request.body as any, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || 'unknown'
      });

      const response: ApiResponse = {
        success: true,
        data: result
      };

      return response;
    } catch (error) {
      throw error;
    }
  });

  // Reset password
  fastify.post('/reset-password', {
    schema: {
      description: 'Reset password using token',
      tags: ['Authentication'],
      body: passwordResetSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, _reply) => {
    try {
      const result = await authService.resetPassword(request.body as any, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || 'unknown'
      });

      const response: ApiResponse = {
        success: true,
        data: result
      };

      return response;
    } catch (error) {
      throw error;
    }
  });

  // Verify email (disabled - users are auto-verified)
  fastify.post('/verify-email', {
    schema: {
      description: 'Verify email address (disabled - users are auto-verified)',
      tags: ['Authentication'],
      body: {
        type: 'object',
        properties: {
          token: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, _reply) => {
    try {
      const result = await authService.verifyEmail(request.body as any);

      const response: ApiResponse = {
        success: true,
        data: result
      };

      return response;
    } catch (error) {
      throw error;
    }
  });
};
