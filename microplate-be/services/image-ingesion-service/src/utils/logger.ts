import type { Logger } from 'winston';

const candidates = [
  '../../../../shared/logger.js',
  '../../../../shared/dist/logger.js',
  '../../../../shared/logger.cjs',
  '../../../../shared/dist/logger.cjs',
  '../../../../shared/logger.ts',
  '../../../../shared/logger',
];

let sharedLoggerModule: Partial<{ default: Logger; logger: Logger }> | undefined;

for (const candidate of candidates) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sharedLoggerModule = require(candidate);
    break;
  } catch {
    // Try next candidate
  }
}

if (!sharedLoggerModule) {
  throw new Error('Unable to load shared logger module');
}

const logger: Logger = (
  sharedLoggerModule.default ||
  (sharedLoggerModule as { logger?: Logger }).logger ||
  sharedLoggerModule
) as Logger;

export { logger };
export default logger;


