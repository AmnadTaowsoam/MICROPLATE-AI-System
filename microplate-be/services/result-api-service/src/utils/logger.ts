import pino from 'pino';
import { config } from '@/config/config';

// Create logger instance
const options: pino.LoggerOptions = {
  level: config.logging.level,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': (res as any).headers['content-type'],
      },
    }),
    err: pino.stdSerializers.err,
  },
};

if (config.logging.format === 'pretty') {
  (options as any).transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '[{time}] {level}: {msg}',
    }
  };
}

export const logger = pino(options);

// Request logger middleware
export const requestLogger = (request: any, reply: any, done: () => void) => {
  const startTime = Date.now();
  request.startTime = startTime;

  logger.info({
    requestId: request.id,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    timestamp: new Date().toISOString(),
  }, 'Request started');

  done();
};

// Response logger middleware
export const responseLogger = (request: any, reply: any, payload: any, done: () => void) => {
  const duration = Date.now() - (request.startTime || Date.now());
  
  logger.info({
    requestId: request.id,
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  }, 'Request completed');

  done();
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
