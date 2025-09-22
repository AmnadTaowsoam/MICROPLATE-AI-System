export type GatewayLogEntry = {
  id: string;
  time: number;
  level: 'info' | 'error' | 'warn';
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

import Redis from 'ioredis';

export class InMemoryLogStore {
  private buffer: GatewayLogEntry[] = [];
  private head = 0;
  private size = 0;

  constructor(private capacity: number = 1000) {}

  add(entry: GatewayLogEntry) {
    if (this.capacity <= 0) return;
    if (this.size < this.capacity) {
      this.buffer.push(entry);
      this.size++;
    } else {
      this.buffer[this.head] = entry;
      this.head = (this.head + 1) % this.capacity;
    }
  }

  all(): GatewayLogEntry[] {
    if (this.size < this.capacity) {
      return [...this.buffer];
    }
    const first = this.buffer.slice(this.head);
    const second = this.buffer.slice(0, this.head);
    return [...first, ...second];
  }

  clear() {
    this.buffer = [];
    this.head = 0;
    this.size = 0;
  }
}

export const logStore = new InMemoryLogStore(1000);

// Redis-backed log store
export class RedisLogStore {
  private client: any;
  private key: string;
  private capacity: number;

  constructor(redisUrl: string, key = 'gateway:logs', capacity = 5000) {
    this.client = new (Redis as any)(redisUrl);
    this.key = key;
    this.capacity = capacity;
  }

  async add(entry: GatewayLogEntry) {
    const value = JSON.stringify(entry);
    await this.client.lpush(this.key, value);
    await this.client.ltrim(this.key, 0, this.capacity - 1);
  }

  async all(): Promise<GatewayLogEntry[]> {
    const items: string[] = await this.client.lrange(this.key, 0, this.capacity - 1);
    return items.map((s) => {
      try { return JSON.parse(s); } catch { return null; }
    }).filter(Boolean) as GatewayLogEntry[];
  }

  async clear() {
    await this.client.del(this.key);
  }
}



