import { publishLogToRedis } from './redis';

// Simple console-based logger for Express
export const logger = {
  info: (obj: any, msg?: string) => {
    const message = msg ? `${msg}: ${JSON.stringify(obj)}` : JSON.stringify(obj);
    console.log(message);
    publishLogToRedis('info', message, { obj });
  },
  error: (obj: any, msg?: string) => {
    const message = msg ? `${msg}: ${JSON.stringify(obj)}` : JSON.stringify(obj);
    console.error(message);
    publishLogToRedis('error', message, { obj });
  },
  warn: (obj: any, msg?: string) => {
    const message = msg ? `${msg}: ${JSON.stringify(obj)}` : JSON.stringify(obj);
    console.warn(message);
    publishLogToRedis('warn', message, { obj });
  },
  debug: (obj: any, msg?: string) => {
    const message = msg ? `${msg}: ${JSON.stringify(obj)}` : JSON.stringify(obj);
    console.debug(message);
    publishLogToRedis('debug', message, { obj });
  },
};