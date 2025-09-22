import pino from 'pino';
import { config } from '../config/config';
import { publishLogToRedis } from './redis';

export const logger = pino({
  level: config.logging.level,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(config.logging.format === 'pretty' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

// Wire Pino to publish logs to Redis channels
const baseLoggerInfo = logger.info.bind(logger);
logger.info = ((...args: any[]) => {
  publishLogToRedis('info', String(args[0]?.msg || args[0]), { args });
  // @ts-ignore
  return baseLoggerInfo(...args);
}) as any;

const baseLoggerWarn = logger.warn.bind(logger);
logger.warn = ((...args: any[]) => {
  publishLogToRedis('warn', String(args[0]?.msg || args[0]), { args });
  // @ts-ignore
  return baseLoggerWarn(...args);
}) as any;

const baseLoggerDebug = logger.debug?.bind(logger) || ((..._args: any[]) => undefined);
// @ts-ignore
logger.debug = ((...args: any[]) => {
  publishLogToRedis('debug', String(args[0]?.msg || args[0]), { args });
  // @ts-ignore
  return baseLoggerDebug(...args);
}) as any;

const baseLoggerError = logger.error.bind(logger);
logger.error = ((...args: any[]) => {
  publishLogToRedis('error', String(args[0]?.msg || args[0]), { args });
  // @ts-ignore
  return baseLoggerError(...args);
}) as any;
