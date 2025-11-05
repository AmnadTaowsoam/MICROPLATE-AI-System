const isBrowser = typeof window !== 'undefined';
const isProduction = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') || false;

let logger: any;

if (isBrowser) {
  logger = {
    debug: (...args: any[]) => {
      if (!isProduction) {
        // Use console.debug for debug messages (less intrusive)
        console.debug('[DEBUG]', ...args);
      }
    },
    info: (...args: any[]) => {
      console.info('[INFO]', ...args);
    },
    warn: (...args: any[]) => {
      console.warn('[WARN]', ...args);
    },
    error: (...args: any[]) => {
      // Only log actual errors, not connection errors (backend not running)
      const errorMessage = args[0]?.message || String(args[0] || '');
      const isConnectionError = 
        errorMessage.includes('Network error') ||
        errorMessage.includes('Unable to connect') ||
        errorMessage.includes('Backend service may not be running') ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('ERR_FAILED') ||
        errorMessage.includes('CORS error');
      
      if (isConnectionError && !isProduction) {
        // In dev, completely suppress connection errors - they're expected
        // Don't log anything to avoid console clutter
        return;
      }
      // Log actual errors
      console.error('[ERROR]', ...args);
    },
  };
} else {
  try {
    const winston = require('winston');
    
    const format = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
      })
    );

    const transports: any[] = [
      new winston.transports.Console({
        level: isProduction ? 'info' : 'debug',
        format,
      }),
    ];

    if (isProduction) {
      try {
        transports.push(
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.json(),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.json(),
          })
        );
      } catch (error) {
        console.warn('File logging not available:', error);
      }
    }

    logger = winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format,
      transports,
      exitOnError: false,
    });
  } catch (error) {
    logger = {
      debug: (...args: any[]) => console.debug(...args),
      info: (...args: any[]) => console.info(...args),
      warn: (...args: any[]) => console.warn(...args),
      error: (...args: any[]) => console.error(...args),
    };
  }
}

export { logger };
export default logger;
