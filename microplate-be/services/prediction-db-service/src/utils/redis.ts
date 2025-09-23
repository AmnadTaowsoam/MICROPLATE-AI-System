import { createClient } from 'redis';
import { redis as redisConfig, logging } from '../config/config';
import { logger } from './logger';

let client: ReturnType<typeof createClient> | null = null;

export async function getRedisClient(): Promise<ReturnType<typeof createClient> | null> {
  if (!logging.redis.enabled) {
    return null;
  }

  if (client) {
    return client;
  }

  try {
    const url = redisConfig.url || `redis://${redisConfig.host}:${redisConfig.port}`;
    const options: Parameters<typeof createClient>[0] = { url, database: redisConfig.db } as any;
    if (typeof redisConfig.password === 'string' && redisConfig.password.length > 0) {
      (options as any).password = redisConfig.password;
    }

    const newClient = createClient(options);
    newClient.on('error', (err) => {
      logger.error({ err }, 'Redis Client Error');
    });

    await newClient.connect();
    client = newClient;
    logger.info('Redis connected');
    return newClient;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Redis client');
    return null;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    try {
      await client.quit();
      client = null;
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect Redis');
    }
  }
}

export async function publishLogToRedis(level: 'info' | 'warn' | 'debug' | 'error', message: string, meta?: Record<string, unknown>) {
  if (!logging.redis.enabled) return;
  const c = await getRedisClient();
  if (!c) return;

  const channel = level === 'error' ? logging.redis.errorChannel : logging.redis.logChannel;
  const payload = JSON.stringify({ level, message, meta, timestamp: new Date().toISOString() });
  try {
    await c.publish(channel, payload);
  } catch (error) {
    logger.error({ error }, 'Failed to publish log to Redis');
  }
}


