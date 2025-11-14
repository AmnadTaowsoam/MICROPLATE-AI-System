import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
// Schema validation will be handled by Express middleware if needed
import { ApiResponse } from '../types/auth.types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const auditService = new AuditService(prisma);
const authService = new AuthService(prisma, auditService);

const router = Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    const result = await authService.register(req.body, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Register error', { error, body: req.body });
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'REGISTRATION_FAILED',
        message: error.message || 'Registration failed'
      }
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const result = await authService.login(req.body, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Login error', { error, body: req.body });
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'LOGIN_FAILED',
        message: error.message || 'Login failed'
      }
    });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const body = req.body;
    const result = await authService.refreshToken(body.refreshToken, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Refresh token error', { error, body: req.body });
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'REFRESH_FAILED',
        message: error.message || 'Token refresh failed'
      }
    });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const body = req.body;
    await authService.logout(body.refreshToken);

    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully'
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const result = await authService.requestPasswordReset(req.body, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

// Verify email (disabled - users are auto-verified)
router.post('/verify-email', async (req, res) => {
  try {
    const result = await authService.verifyEmail(req.body);

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

export { router as authRoutes };