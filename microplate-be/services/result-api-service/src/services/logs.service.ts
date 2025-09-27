import Redis from 'ioredis';
import { logger } from '@/utils/logger';

export type LogLevel = 'info' | 'warn' | 'error';

export type LogEntry = {
  id: string;
  time: number;
  level: LogLevel;
  method: string;
  url: string;
  statusCode: number;
  latencyMs: number;
  requestId?: string;
  userId?: string;
  ip?: string;
  service?: string;
  message?: string;
};

export class LogsService {
  private redis: Redis;
  private key: string;
  private capacity: number;

  constructor(redisUrl: string, key = 'microplate:logs', capacity = 5000) {
    this.redis = new Redis(redisUrl);
    this.key = key;
    this.capacity = capacity;
    
    // Handle Redis connection events
    this.redis.on('connect', () => {
      logger.info('Connected to Redis for logs');
    });
    
    this.redis.on('error', (error) => {
      logger.error({ error }, 'Redis connection error for logs');
    });
  }

  async addLog(entry: LogEntry): Promise<void> {
    try {
      const value = JSON.stringify(entry);
      await this.redis.lpush(this.key, value);
      await this.redis.ltrim(this.key, 0, this.capacity - 1);
    } catch (error) {
      logger.error({ error, entry }, 'Failed to add log to Redis');
    }
  }

  async getLogs(level?: LogLevel, limit = 100): Promise<LogEntry[]> {
    try {
      const items: string[] = await this.redis.lrange(this.key, 0, limit - 1);
      const logs = items
        .map((s) => {
          try {
            return JSON.parse(s) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as LogEntry[];

      // Filter by level if specified
      if (level) {
        return logs.filter(log => log.level === level);
      }

      return logs;
    } catch (error) {
      logger.error({ error }, 'Failed to get logs from Redis');
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    try {
      await this.redis.del(this.key);
      logger.info('Logs cleared from Redis');
    } catch (error) {
      logger.error({ error }, 'Failed to clear logs from Redis');
      throw error;
    }
  }

  async getLogStats(): Promise<{ total: number; byLevel: Record<LogLevel, number> }> {
    try {
      const items: string[] = await this.redis.lrange(this.key, 0, -1);
      const logs = items
        .map((s) => {
          try {
            return JSON.parse(s) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as LogEntry[];

      const stats = {
        total: logs.length,
        byLevel: {
          info: 0,
          warn: 0,
          error: 0,
        } as Record<LogLevel, number>
      };

      logs.forEach(log => {
        stats.byLevel[log.level]++;
      });

      return stats;
    } catch (error) {
      logger.error({ error }, 'Failed to get log stats from Redis');
      return { total: 0, byLevel: { info: 0, warn: 0, error: 0 } };
    }
  }

  // Add sample logs for testing
  async addSampleLogs(): Promise<void> {
    const now = Date.now();
    const sampleLogs: LogEntry[] = [
      {
        id: '1',
        time: now - 1000,
        level: 'info',
        method: 'POST',
        url: '/api/v1/inference/predict',
        statusCode: 200,
        latencyMs: 1500,
        requestId: 'req_001',
        userId: 'user_001',
        ip: '192.168.1.100',
        service: 'vision-inference',
        message: 'Prediction completed successfully'
      },
      {
        id: '2',
        time: now - 2000,
        level: 'info',
        method: 'POST',
        url: '/api/v1/images',
        statusCode: 201,
        latencyMs: 800,
        requestId: 'req_002',
        userId: 'user_001',
        ip: '192.168.1.100',
        service: 'image-ingestion',
        message: 'Image uploaded successfully'
      },
      {
        id: '3',
        time: now - 3000,
        level: 'error',
        method: 'POST',
        url: '/api/v1/inference/predict',
        statusCode: 500,
        latencyMs: 2000,
        requestId: 'req_003',
        userId: 'user_002',
        ip: '192.168.1.101',
        service: 'vision-inference',
        message: 'Model inference failed'
      },
      {
        id: '4',
        time: now - 4000,
        level: 'warn',
        method: 'GET',
        url: '/api/v1/results/samples/TEST001',
        statusCode: 404,
        latencyMs: 200,
        requestId: 'req_004',
        userId: 'user_003',
        ip: '192.168.1.102',
        service: 'result-api',
        message: 'Sample not found'
      },
      {
        id: '5',
        time: now - 5000,
        level: 'info',
        method: 'POST',
        url: '/api/v1/auth/login',
        statusCode: 200,
        latencyMs: 300,
        requestId: 'req_005',
        userId: 'user_004',
        ip: '192.168.1.103',
        service: 'auth-service',
        message: 'User login successful'
      }
    ];

    for (const log of sampleLogs) {
      await this.addLog(log);
    }

    logger.info(`Added ${sampleLogs.length} sample logs to Redis`);
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}
