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

  async all(): Promise<GatewayLogEntry[]> {
    if (this.size < this.capacity) {
      return [...this.buffer];
    }
    const first = this.buffer.slice(this.head);
    const second = this.buffer.slice(0, this.head);
    return [...first, ...second];
  }

  async clear(): Promise<void> {
    this.buffer = [];
    this.head = 0;
    this.size = 0;
  }

  // Add sample logs for testing
  addSampleLogs() {
    const now = Date.now()
    const sampleLogs: GatewayLogEntry[] = [
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
    ]

    sampleLogs.forEach(log => this.add(log))
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



