import Redis from 'ioredis';

export type LogLevel = 'info' | 'warn' | 'error';

export interface EventLog {
  service: 'image-ingestion';
  level: LogLevel;
  event: string;
  message?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

let redis: Redis | null = null;
let progressChannel = process.env.REDIS_LOG_CHANNEL || 'microplate:image-ingestion:logs';
let errorChannel = process.env.REDIS_ERROR_CHANNEL || 'microplate:image-ingestion:errors';

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (redis) return redis;
  redis = new Redis(process.env.REDIS_URL, { lazyConnect: true });
  return redis;
}

export async function publishLog(log: Omit<EventLog, 'timestamp' | 'service'>) {
  const client = getRedis();
  if (!client) return;
  const channel = log.level === 'error' ? errorChannel : progressChannel;
  const payload: EventLog = {
    service: 'image-ingestion',
    timestamp: new Date().toISOString(),
    ...log
  };
  try {
    await client.publish(channel, JSON.stringify(payload));
  } catch (err) {
    // best-effort; avoid throwing from logger
  }
}


