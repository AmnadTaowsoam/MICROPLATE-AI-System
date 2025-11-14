import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { config } from '@/config/config';

const timestampFormat = 'YYYY-MM-DD HH:mm:ss';

const baseLogger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: timestampFormat }),
    config.logging.format === 'pretty'
      ? winston.format.colorize({ all: true })
      : winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      if (config.logging.format === 'pretty') {
        const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} [${level}]: ${message}${metaString}`;
      }
      return JSON.stringify({ timestamp, level, message, ...meta });
    })
  ),
  transports: [
    new winston.transports.Console()
  ],
  exitOnError: false,
});

const normalizeArgs = (args: any[]): { message: string; meta?: any } => {
  if (typeof args[0] === 'string') {
    return { message: args[0], meta: args[1] };
  }
  if (typeof args[1] === 'string') {
    return { message: args[1], meta: args[0] };
  }
  return { message: '', meta: args[0] };
};

export const logger = {
  info: (...args: any[]) => {
    const { message, meta } = normalizeArgs(args);
    baseLogger.info(message, meta);
  },
  error: (...args: any[]) => {
    const { message, meta } = normalizeArgs(args);
    baseLogger.error(message, meta);
  },
  warn: (...args: any[]) => {
    const { message, meta } = normalizeArgs(args);
    baseLogger.warn(message, meta);
  },
  debug: (...args: any[]) => {
    const { message, meta } = normalizeArgs(args);
    baseLogger.debug(message, meta);
  }
};

export { baseLogger };

// Request logger middleware for Express
export const requestLogger = (request: Request, response: Response, next: NextFunction) => {
  const startTime = Date.now();
  (request as any).startTime = startTime;
  (request as any).id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('Request started', {
    requestId: (request as any).id,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    timestamp: new Date().toISOString(),
  });

  next();
};

// Response logger middleware for Express
export const responseLogger = (request: Request, response: Response, next: NextFunction) => {
  const originalSend = response.send;
  
  response.send = function(data: any) {
    const duration = Date.now() - ((request as any).startTime || Date.now());
    
    logger.info('Request completed', {
      requestId: (request as any).id,
      method: request.method,
      url: request.url,
      statusCode: response.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return originalSend.call(this, data);
  };

  next();
};

// Error logger
export const logError = (error: Error, context?: any) => {
  logger.error('Error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    timestamp: new Date().toISOString(),
  });
};

// Performance logger
export const logPerformance = (operation: string, duration: number, context?: any) => {
  logger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    context,
    timestamp: new Date().toISOString(),
  });
};

// Business logic logger
export const logBusinessEvent = (event: string, data: any, context?: any) => {
  logger.info('Business event', {
    event,
    data,
    context,
    timestamp: new Date().toISOString(),
  });
};