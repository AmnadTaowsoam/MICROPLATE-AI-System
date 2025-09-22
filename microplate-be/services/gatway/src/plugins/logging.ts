import { logStore, GatewayLogEntry, RedisLogStore } from '../services/log.store';

export async function registerRequestLogging(app: any) {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI;
  const store = redisUrl ? new RedisLogStore(redisUrl) : logStore;
  app.addHook('onRequest', async (req: any) => {
    (req as any)._startTime = Date.now();
  });

  app.addHook('onResponse', async (req: any, reply: any) => {
    const latency = Date.now() - ((req as any)._startTime || Date.now());
    const entry: GatewayLogEntry = {
      id: req.id || `${Date.now()}-${Math.random()}`,
      time: Date.now(),
      level: reply.statusCode >= 500 ? 'error' : 'info',
      method: req.method,
      url: req.url,
      statusCode: reply.statusCode,
      latencyMs: latency,
      requestId: req.id,
      userId: (req as any).user?.id,
      ip: req.ip,
      message: reply.statusCode >= 400 ? 'request_failed' : 'request_ok'
    };
    if ((store as any).add.length === 1) {
      await (store as any).add(entry);
    } else {
      (store as any).add(entry);
    }
  });
}


