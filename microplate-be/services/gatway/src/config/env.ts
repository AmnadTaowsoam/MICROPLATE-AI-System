import dotenv from 'dotenv';

export type EnvConfig = {
  port: number;
  healthPath: string;
  readyPath: string;
  metricsEnabled: boolean;
  metricsPath: string;
  corsOrigin: string;
  corsCredentials: boolean;
  helmetEnabled: boolean;
  services: {
    auth: string;
    images: string;
    inference: string;
    results: string;
    interface: string;
    capture: string;
  };
  rateLimit: {
    global: { windowMs: number; max: number };
    auth: { windowMs: number; max: number };
    inference: { windowMs: number; max: number };
    capture: { windowMs: number; max: number };
  };
};

export function loadEnv(): EnvConfig {
  dotenv.config();
  return {
    port: parseInt(process.env.PORT || '6400', 10),
    healthPath: process.env.HEALTH_CHECK_PATH || '/healthz',
    readyPath: process.env.READINESS_CHECK_PATH || '/readyz',
    metricsEnabled: (process.env.METRICS_ENABLED || 'true') === 'true',
    metricsPath: process.env.METRICS_PATH || '/metrics',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:6410',
    corsCredentials: (process.env.CORS_CREDENTIALS || 'true') === 'true',
    helmetEnabled: (process.env.HELMET_ENABLED || 'true') === 'true',
    services: {
      // Support new env names with fallback to previous ones
      auth: process.env.AUTH_URL || process.env.AUTH_SERVICE_URL || 'http://localhost:6401',
      images: process.env.IMAGE_INGESION_URL || process.env.IMAGE_SERVICE_URL || 'http://image-ingestion-service:6402',
      inference: process.env.VISION_INFERENCE_URL || process.env.INFERENCE_SERVICE_URL || 'http://vision-inference-service:6403',
      results: process.env.RESULT_API_URL || process.env.RESULT_SERVICE_URL || 'http://result-api-service:6404',
      interface: process.env.LABWARE_INTERFACE_URL || process.env.INTERFACE_SERVICE_URL || 'http://labware-interface-service:6405',
      capture: process.env.PREDICTION_RESULT_URL || process.env.CAPTURE_SERVICE_URL || 'http://vision-capture-service:6406'
    },
    rateLimit: {
      global: {
        windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || '900000', 10),
        max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '1000', 10)
      },
      auth: {
        windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10),
        max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10)
      },
      inference: {
        windowMs: parseInt(process.env.RATE_LIMIT_INFERENCE_WINDOW_MS || '3600000', 10),
        max: parseInt(process.env.RATE_LIMIT_INFERENCE_MAX || '100', 10)
      },
      capture: {
        windowMs: parseInt(process.env.RATE_LIMIT_CAPTURE_WINDOW_MS || '3600000', 10),
        max: parseInt(process.env.RATE_LIMIT_CAPTURE_MAX || '200', 10)
      }
    }
  };
}


