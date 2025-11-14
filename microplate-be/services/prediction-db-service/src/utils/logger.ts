import { publishLogToRedis } from './redis';

type LogLevel = 'info' | 'error' | 'warn' | 'debug';

interface LoggerLike {
  log: (level: LogLevel, message: string, meta?: any) => void;
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

const candidates = [
  '../../../../shared/logger.js',
  '../../../../shared/dist/logger.js',
  '../../../../shared/logger.cjs',
  '../../../../shared/dist/logger.cjs',
  '../../../../shared/logger.ts',
  '../../../../shared/logger',
];

let sharedLoggerModule: Partial<{ default: LoggerLike; logger: LoggerLike }> | LoggerLike | undefined;

for (const candidate of candidates) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sharedLoggerModule = require(candidate);
    break;
  } catch {
    // continue searching
  }
}

if (!sharedLoggerModule) {
  throw new Error('Unable to load shared logger module');
}

const baseLogger = (
  (sharedLoggerModule as { default?: LoggerLike }).default ||
  (sharedLoggerModule as { logger?: LoggerLike }).logger ||
  sharedLoggerModule
) as LoggerLike;

const ensureObject = (value: any) => {
  if (value === null || value === undefined) {
    return { value };
  }
  if (typeof value === 'object') {
    return value;
  }
  return { value };
};

const formatMessage = (level: LogLevel, payload: any, message?: string) => {
  if (message) {
    return message;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  return `${level.toUpperCase()}`;
};

const log = async (level: LogLevel, payload: any, message?: string) => {
  const meta = ensureObject(payload);
  const logMessage = formatMessage(level, payload, message);

  if (typeof baseLogger.log === 'function') {
    baseLogger.log(level, logMessage, meta);
  } else {
    const fallback = baseLogger[level];
    if (typeof fallback === 'function') {
      fallback.call(baseLogger, logMessage, meta);
    }
  }
  await publishLogToRedis(level, logMessage, meta).catch(() => {});
};

export const logger = {
  info: (payload: any, message?: string) => {
    void log('info', payload, message);
  },
  error: (payload: any, message?: string) => {
    void log('error', payload, message);
  },
  warn: (payload: any, message?: string) => {
    void log('warn', payload, message);
  },
  debug: (payload: any, message?: string) => {
    void log('debug', payload, message);
  },
};