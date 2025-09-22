import Redis from 'ioredis';
import { config } from '@/config/config';
import { logger } from './logger';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(config.cache.url, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redisClient.on('close', () => {
      logger.info('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
};

// Cache service implementation
export class CacheService {
  private redis: Redis;
  private prefix: string;

  constructor() {
    this.redis = getRedisClient();
    this.prefix = config.cache.prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(this.getKey(key));
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const cacheKey = this.getKey(key);
      
      if (ttl) {
        await this.redis.setex(cacheKey, ttl, serialized);
      } else {
        await this.redis.set(cacheKey, serialized);
      }
    } catch (error) {
      logger.error('Cache set error:', { key, error });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key));
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error });
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(this.getKey(key), ttl);
    } catch (error) {
      logger.error('Cache expire error:', { key, error });
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.getKey(key));
      const values = await this.redis.mget(...cacheKeys);
      
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error('Cache mget error:', { keys, error });
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValues: Record<string, T>, ttl?: number): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const [key, value] of Object.entries(keyValues)) {
        const serialized = JSON.stringify(value);
        const cacheKey = this.getKey(key);
        
        if (ttl) {
          pipeline.setex(cacheKey, ttl, serialized);
        } else {
          pipeline.set(cacheKey, serialized);
        }
      }
      
      await pipeline.exec();
    } catch (error) {
      logger.error('Cache mset error:', { error });
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.prefix}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache clear error:', { error });
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Cache health check failed:', { error });
      return false;
    }
  }
}

// Singleton cache service instance
export const cacheService = new CacheService();

export default cacheService;
