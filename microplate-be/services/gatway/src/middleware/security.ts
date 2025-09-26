import express from 'express';
import rateLimit from 'express-rate-limit';
import { EnvConfig } from '../config/env';

export function registerSecurityPlugins(app: express.Application, cfg: EnvConfig) {
  // Global rate limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.'
      }
    }
  });

  app.use(globalLimiter);

  // Specific rate limiting for inference endpoints
  if (cfg.rateLimit.inference) {
    const inferenceLimiter = rateLimit({
      windowMs: cfg.rateLimit.inference.windowMs,
      max: cfg.rateLimit.inference.max,
      message: {
        success: false,
        error: {
          code: 'INFERENCE_RATE_LIMIT_EXCEEDED',
          message: 'Too many inference requests, please try again later.'
        }
      }
    });

    app.use('/api/v1/inference', inferenceLimiter);
  }

  // Specific rate limiting for capture endpoints
  if (cfg.rateLimit.capture) {
    const captureLimiter = rateLimit({
      windowMs: cfg.rateLimit.capture.windowMs,
      max: cfg.rateLimit.capture.max,
      message: {
        success: false,
        error: {
          code: 'CAPTURE_RATE_LIMIT_EXCEEDED',
          message: 'Too many capture requests, please try again later.'
        }
      }
    });

    app.use('/api/v1/capture', captureLimiter);
  }
}
