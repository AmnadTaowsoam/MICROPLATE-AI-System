import { logStore, RedisLogStore, GatewayLogEntry } from '../services/log.store';

export async function registerLogRoutes(app: any) {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI;
  const store = redisUrl ? new RedisLogStore(redisUrl) : logStore;

  app.get('/api/v1/logs', async (req: any, reply: any) => {
    const { q, level, limit, offset } = req.query || {} as any;
    const entries: GatewayLogEntry[] = await (async () => {
      const all = await (store as any).all();
      return all;
    })();
    let filtered: GatewayLogEntry[] = entries;
    if (level) filtered = filtered.filter((e: GatewayLogEntry) => e.level === level);
    if (q) {
      const needle = String(q).toLowerCase();
      filtered = filtered.filter((e: GatewayLogEntry) => (
        `${e.method} ${e.url} ${e.statusCode} ${e.message || ''}`
      ).toLowerCase().includes(needle));
    }

    const start = Math.max(0, parseInt(offset || '0', 10));
    const end = start + Math.max(1, Math.min(200, parseInt(limit || '100', 10)));
    const page = filtered.slice(start, end);

    reply.send({
      success: true,
      total: filtered.length,
      offset: start,
      limit: end - start,
      data: page
    });
  });

  app.delete('/api/v1/logs', async () => {
    if ((store as any).clear.length === 0) {
      await (store as any).clear();
    } else {
      (store as any).clear();
    }
    return { success: true };
  });
}


