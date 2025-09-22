import { createClient, RedisClientType } from 'redis';
import { redis as redisConfig, logging } from '../config/config';
import { logger } from './logger';

let client: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!logging.redis.enabled) {
    return null;
  }

  if (client) {
    return client;
  }

  try {
    const url = redisConfig.url || `redis://${redisConfig.host}:${redisConfig.port}`;
    client = createClient({ url, database: redisConfig.db, password: redisConfig.password });

    client.on('error', (err) => {
      logger.error({ err }, 'Redis Client Error');
    });

    await client.connect();
    logger.info('Redis connected');
    return client;
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


