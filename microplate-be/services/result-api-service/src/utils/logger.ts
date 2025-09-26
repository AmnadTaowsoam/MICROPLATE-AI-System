import { Request, Response, NextFunction } from 'express';
import { config } from '@/config/config';

// Simple logger interface
interface Logger {
  info: (obj: any, msg?: string) => void;
  error: (obj: any, msg?: string) => void;
  warn: (obj: any, msg?: string) => void;
  debug: (obj: any, msg?: string) => void;
}

// Console-based logger implementation
class ConsoleLogger implements Logger {
  private formatMessage(level: string, obj: any, msg?: string): string {
    const timestamp = new Date().toISOString();
    const message = msg || '';
    const data = typeof obj === 'object' ? JSON.stringify(obj, null, 2) : obj;
    
    if (config.logging.format === 'pretty') {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${data}`;
    }
    
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      data: obj
    });
  }

  info(obj: any, msg?: string): void {
    console.log(this.formatMessage('info', obj, msg));
  }

  error(obj: any, msg?: string): void {
    console.error(this.formatMessage('error', obj, msg));
  }

  warn(obj: any, msg?: string): void {
    console.warn(this.formatMessage('warn', obj, msg));
  }

  debug(obj: any, msg?: string): void {
    if (config.logging.level === 'debug') {
      console.debug(this.formatMessage('debug', obj, msg));
    }
  }
}

export const logger = new ConsoleLogger();

// Request logger middleware for Express
export const requestLogger = (request: Request, response: Response, next: NextFunction) => {
  const startTime = Date.now();
  (request as any).startTime = startTime;
  (request as any).id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info({
    requestId: (request as any).id,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    timestamp: new Date().toISOString(),
  }, 'Request started');

  next();
};

// Response logger middleware for Express
export const responseLogger = (request: Request, response: Response, next: NextFunction) => {
  const originalSend = response.send;
  
  response.send = function(data: any) {
    const duration = Date.now() - ((request as any).startTime || Date.now());
    
    logger.info({
      requestId: (request as any).id,
      method: request.method,
      url: request.url,
      statusCode: response.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    }, 'Request completed');

    return originalSend.call(this, data);
  };

  next();
};

// Error logger
export const logError = (error: Error, context?: any) => {
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    timestamp: new Date().toISOString(),
  }, 'Error occurred');
};

// Performance logger
export const logPerformance = (operation: string, duration: number, context?: any) => {
  logger.info({
    operation,
    duration: `${duration}ms`,
    context,
    timestamp: new Date().toISOString(),
  }, 'Performance metric');
};

// Business logic logger
export const logBusinessEvent = (event: string, data: any, context?: any) => {
  logger.info({
    event,
    data,
    context,
    timestamp: new Date().toISOString(),
  }, 'Business event');
};

export default logger;