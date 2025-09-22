import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { EnvConfig } from '../config/env';

export async function registerSecurityPlugins(app: any, cfg: EnvConfig) {
  await app.register(cors as any, {
    origin: cfg.corsOrigin,
    credentials: cfg.corsCredentials
  } as any);

  if (cfg.helmetEnabled) {
    await app.register(helmet as any);
  }

  await app.register(rateLimit as any, {
    global: true,
    max: cfg.rateLimit.global.max,
    timeWindow: cfg.rateLimit.global.windowMs
  } as any);
}


