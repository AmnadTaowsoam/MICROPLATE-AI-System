# Microplate API Gateway

Fastify v4 gateway that proxies to backend services with CORS, Helmet, and rate limiting.

## Features
- CORS via @fastify/cors
- Security headers via @fastify/helmet
- Global and per-endpoint rate limits via @fastify/rate-limit
- Proxies: /api/v1/auth, /images, /inference, /results, /interface, /capture
- Forwards Authorization header to downstream services
- Auth exceptions: /api/v1/auth/signup and /api/v1/auth/login do not require token
- System routes: /healthz, /readyz, /metrics

## Logs API
- GET /api/v1/logs – query recent gateway logs
  - Query params: `level=info|warn|error`, `q=search`, `limit`, `offset`
  - Response: `{ success, total, offset, limit, data: GatewayLogEntry[] }`
- DELETE /api/v1/logs – clear in-memory log buffer

## Structure
```
src/
  config/env.ts         # Centralized environment configuration
  plugins/security.ts   # CORS, Helmet, global rate limit registration
  routes/proxy.ts       # All proxy mappings and per-endpoint rate limits
  server.ts             # Bootstrap and wire modules together
```

## Environment
Copy env.example to .env and adjust as needed.

- App
  - PORT (default 6400)
  - HEALTH_CHECK_PATH (default /healthz)
  - READINESS_CHECK_PATH (default /readyz)
  - METRICS_ENABLED (default true)
  - METRICS_PATH (default /metrics)
- CORS
  - CORS_ORIGIN (default *)
  - CORS_CREDENTIALS (default true)
- Security
  - HELMET_ENABLED (default true)
- Services
  - AUTH_SERVICE_URL, IMAGE_SERVICE_URL, INFERENCE_SERVICE_URL,
    RESULT_SERVICE_URL, INTERFACE_SERVICE_URL, CAPTURE_SERVICE_URL
- Rate limits
  - RATE_LIMIT_GLOBAL_WINDOW_MS / RATE_LIMIT_GLOBAL_MAX
  - RATE_LIMIT_AUTH_WINDOW_MS / RATE_LIMIT_AUTH_MAX
  - RATE_LIMIT_INFERENCE_WINDOW_MS / RATE_LIMIT_INFERENCE_MAX
  - RATE_LIMIT_CAPTURE_WINDOW_MS / RATE_LIMIT_CAPTURE_MAX

## Usage (Docker Compose)
From microplate-be:

```bash
docker-compose -f docker-compose.apps.yml build gateway
docker-compose -f docker-compose.apps.yml up -d gateway
docker-compose -f docker-compose.apps.yml logs -f gateway
```

## Development
Inside services/gatway:

```bash
cp env.example .env
npm install
npm run dev
```

## Notes
- Fastify 4 compatible plugin versions are pinned:
  - @fastify/helmet@^11
  - @fastify/rate-limit@^9
- Extend routes/proxy.ts to add more proxy rules or WebSocket proxying as needed.
