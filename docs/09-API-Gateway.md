# API Gateway - Complete Specification

## Overview

The API Gateway serves as the single entry point for all client requests in the Microplate AI System. It handles routing, authentication, rate limiting, CORS, and request/response logging.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 4.x
- **Language**: TypeScript
- **Authentication**: JWT verification
- **Rate Limiting**: @fastify/rate-limit
- **CORS**: @fastify/cors
- **Security**: @fastify/helmet
- **Documentation**: OpenAPI 3.0
- **Monitoring**: Prometheus metrics

## Service Architecture

```typescript
// Project structure
gateway/
├── src/
│   ├── config/
│   │   ├── services.ts
│   │   ├── auth.ts
│   │   ├── rate-limit.ts
│   │   └── cors.ts
│   ├── controllers/
│   │   ├── proxy.controller.ts
│   │   ├── health.controller.ts
│   │   └── metrics.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── cors.middleware.ts
│   │   ├── logging.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── images.routes.ts
│   │   ├── inference.routes.ts
│   │   ├── results.routes.ts
│   │   ├── interface.routes.ts
│   │   ├── capture.routes.ts
│   │   ├── health.routes.ts
│   │   └── metrics.routes.ts
│   ├── services/
│   │   ├── proxy.service.ts
│   │   ├── auth.service.ts
│   │   ├── service-discovery.service.ts
│   │   └── circuit-breaker.service.ts
│   ├── utils/
│   │   ├── request.util.ts
│   │   ├── response.util.ts
│   │   └── validation.util.ts
│   ├── types/
│   │   └── gateway.types.ts
│   └── app.ts
├── tests/
├── package.json
└── .env.example
```

## API Routes

### Authentication Routes
- `POST /api/v1/auth/*` → auth-service:6401
- `GET /api/v1/auth/*` → auth-service:6401
- `PUT /api/v1/auth/*` → auth-service:6401
- `DELETE /api/v1/auth/*` → auth-service:6401

### Image Management Routes
- `POST /api/v1/images/*` → image-ingestion-service:6402
- `GET /api/v1/images/*` → image-ingestion-service:6402
- `PUT /api/v1/images/*` → image-ingestion-service:6402
- `DELETE /api/v1/images/*` → image-ingestion-service:6402

### Inference Routes
- `POST /api/v1/inference/*` → vision-inference-service:6403
- `GET /api/v1/inference/*` → vision-inference-service:6403

### Results Routes
- `GET /api/v1/results/*` → result-api-service:6404
- `WebSocket /api/v1/results/ws` → result-api-service:6404

### Interface Routes
- `POST /api/v1/interface/*` → labware-interface-service:6405
- `GET /api/v1/interface/*` → labware-interface-service:6405
- `DELETE /api/v1/interface/*` → labware-interface-service:6405

### Capture Routes
- `POST /api/v1/capture/*` → vision-capture-service:6406
- `GET /api/v1/capture/*` → vision-capture-service:6406
- `PUT /api/v1/capture/*` → vision-capture-service:6406

### System Routes
- `GET /healthz` → Health check
- `GET /readyz` → Readiness check
- `GET /metrics` → Prometheus metrics
- `GET /docs` → API documentation

## Implementation Details

### Gateway Service
```typescript
export class GatewayService {
  constructor(
    private config: GatewayConfig,
    private authService: AuthService,
    private proxyService: ProxyService,
    private circuitBreaker: CircuitBreakerService
  ) {}

  async setupRoutes(fastify: FastifyInstance): Promise<void> {
    // Health checks
    await fastify.register(healthRoutes, { prefix: '' });
    
    // Metrics
    await fastify.register(metricsRoutes, { prefix: '' });
    
    // API documentation
    await fastify.register(swaggerRoutes, { prefix: '/docs' });
    
    // Authentication routes (no auth required)
    await fastify.register(authRoutes, { 
      prefix: '/api/v1/auth',
      preHandler: [corsMiddleware]
    });
    
    // Protected routes
    await fastify.register(protectedRoutes, {
      prefix: '/api/v1',
      preHandler: [
        corsMiddleware,
        rateLimitMiddleware,
        authMiddleware
      ]
    });
  }
}
```

### Proxy Service
```typescript
export class ProxyService {
  private serviceConfigs: Map<string, ServiceConfig> = new Map();

  constructor(private config: GatewayConfig) {
    this.initializeServiceConfigs();
  }

  private initializeServiceConfigs(): void {
    this.serviceConfigs.set('auth', {
      name: 'auth-service',
      baseUrl: this.config.services.auth,
      timeout: 5000,
      retries: 3,
      circuitBreaker: {
        threshold: 5,
        timeout: 10000,
        resetTimeout: 30000
      }
    });

    this.serviceConfigs.set('images', {
      name: 'image-ingestion-service',
      baseUrl: this.config.services.images,
      timeout: 10000,
      retries: 2,
      circuitBreaker: {
        threshold: 3,
        timeout: 15000,
        resetTimeout: 60000
      }
    });

    this.serviceConfigs.set('inference', {
      name: 'vision-inference-service',
      baseUrl: this.config.services.inference,
      timeout: 30000,
      retries: 1,
      circuitBreaker: {
        threshold: 2,
        timeout: 60000,
        resetTimeout: 120000
      }
    });

    this.serviceConfigs.set('results', {
      name: 'result-api-service',
      baseUrl: this.config.services.results,
      timeout: 5000,
      retries: 3,
      circuitBreaker: {
        threshold: 5,
        timeout: 10000,
        resetTimeout: 30000
      }
    });

    this.serviceConfigs.set('interface', {
      name: 'labware-interface-service',
      baseUrl: this.config.services.interface,
      timeout: 15000,
      retries: 2,
      circuitBreaker: {
        threshold: 3,
        timeout: 20000,
        resetTimeout: 60000
      }
    });

    this.serviceConfigs.set('capture', {
      name: 'vision-capture-service',
      baseUrl: this.config.services.capture,
      timeout: 10000,
      retries: 2,
      circuitBreaker: {
        threshold: 3,
        timeout: 15000,
        resetTimeout: 45000
      }
    });
  }

  async proxyRequest(
    serviceName: string,
    path: string,
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const serviceConfig = this.serviceConfigs.get(serviceName);
    if (!serviceConfig) {
      throw new Error(`Service ${serviceName} not found`);
    }

    // Check circuit breaker
    if (this.circuitBreaker.isOpen(serviceName)) {
      throw new ServiceUnavailableError(`Service ${serviceName} is temporarily unavailable`);
    }

    try {
      const targetUrl = `${serviceConfig.baseUrl}${path}`;
      const proxyOptions = {
        url: targetUrl,
        method: request.method,
        headers: this.buildHeaders(request),
        body: request.body,
        timeout: serviceConfig.timeout,
        retries: serviceConfig.retries
      };

      const response = await this.makeRequest(proxyOptions);
      
      // Record success
      this.circuitBreaker.recordSuccess(serviceName);
      
      // Forward response
      reply.code(response.statusCode);
      reply.headers(response.headers);
      reply.send(response.body);

    } catch (error) {
      // Record failure
      this.circuitBreaker.recordFailure(serviceName);
      
      // Handle different error types
      if (error instanceof TimeoutError) {
        throw new GatewayTimeoutError(`Service ${serviceName} timeout`);
      } else if (error instanceof NetworkError) {
        throw new ServiceUnavailableError(`Service ${serviceName} unavailable`);
      } else {
        throw error;
      }
    }
  }

  private buildHeaders(request: FastifyRequest): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': request.id,
      'X-Forwarded-For': request.ip,
      'User-Agent': request.headers['user-agent'] || 'Microplate-Gateway'
    };

    // Add user context if authenticated
    if (request.user) {
      headers['X-User-ID'] = request.user.id;
      headers['X-User-Roles'] = request.user.roles.join(',');
    }

    // Forward relevant headers
    const forwardHeaders = ['authorization', 'x-api-key', 'x-request-id'];
    for (const header of forwardHeaders) {
      if (request.headers[header]) {
        headers[header] = request.headers[header] as string;
      }
    }

    return headers;
  }
}
```

### Authentication Middleware
```typescript
export class AuthMiddleware {
  constructor(private authService: AuthService) {}

  async authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    
    try {
      const user = await this.authService.verifyToken(token);
      request.user = user;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      } else if (error instanceof InvalidTokenError) {
        throw new UnauthorizedError('Invalid token');
      } else {
        throw new UnauthorizedError('Authentication failed');
      }
    }
  }

  async authorize(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const requiredRoles = this.getRequiredRoles(request.routeOptions.url);
    if (requiredRoles.length === 0) {
      return; // No specific roles required
    }

    const userRoles = request.user.roles;
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }

  private getRequiredRoles(url: string): string[] {
    // Define role requirements for different endpoints
    const roleMap: Record<string, string[]> = {
      '/api/v1/results/samples': ['operator', 'viewer'],
      '/api/v1/inference/predict': ['operator'],
      '/api/v1/interface/generate': ['operator'],
      '/api/v1/capture': ['operator'],
      '/api/v1/auth/users': ['admin'],
      '/api/v1/auth/roles': ['admin']
    };

    for (const [pattern, roles] of Object.entries(roleMap)) {
      if (url.startsWith(pattern)) {
        return roles;
      }
    }

    return [];
  }
}
```

### Rate Limiting Middleware
```typescript
export class RateLimitMiddleware {
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor(private config: RateLimitConfig) {
    this.initializeRateLimiters();
  }

  private initializeRateLimiters(): void {
    // Global rate limiter
    this.rateLimiters.set('global', new RateLimiter({
      windowMs: this.config.global.windowMs,
      max: this.config.global.max,
      message: 'Too many requests from this IP'
    }));

    // Auth endpoints rate limiter
    this.rateLimiters.set('auth', new RateLimiter({
      windowMs: this.config.auth.windowMs,
      max: this.config.auth.max,
      message: 'Too many authentication attempts'
    }));

    // Inference endpoints rate limiter
    this.rateLimiters.set('inference', new RateLimiter({
      windowMs: this.config.inference.windowMs,
      max: this.config.inference.max,
      message: 'Too many inference requests'
    }));

    // Capture endpoints rate limiter
    this.rateLimiters.set('capture', new RateLimiter({
      windowMs: this.config.capture.windowMs,
      max: this.config.capture.max,
      message: 'Too many capture requests'
    }));
  }

  async checkRateLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const clientId = this.getClientId(request);
    const endpoint = this.getEndpointType(request.url);
    
    const limiter = this.rateLimiters.get(endpoint) || this.rateLimiters.get('global');
    
    try {
      await limiter.consume(clientId);
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        throw new TooManyRequestsError(error.message);
      }
      throw error;
    }
  }

  private getClientId(request: FastifyRequest): string {
    // Use user ID if authenticated, otherwise IP address
    if (request.user) {
      return `user:${request.user.id}`;
    }
    return `ip:${request.ip}`;
  }

  private getEndpointType(url: string): string {
    if (url.startsWith('/api/v1/auth')) return 'auth';
    if (url.startsWith('/api/v1/inference')) return 'inference';
    if (url.startsWith('/api/v1/capture')) return 'capture';
    return 'global';
  }
}
```

### Circuit Breaker Service
```typescript
export class CircuitBreakerService {
  private breakers: Map<string, CircuitBreaker> = new Map();

  constructor(private config: CircuitBreakerConfig) {}

  isOpen(serviceName: string): boolean {
    const breaker = this.breakers.get(serviceName);
    return breaker ? breaker.isOpen() : false;
  }

  recordSuccess(serviceName: string): void {
    const breaker = this.getOrCreateBreaker(serviceName);
    breaker.recordSuccess();
  }

  recordFailure(serviceName: string): void {
    const breaker = this.getOrCreateBreaker(serviceName);
    breaker.recordFailure();
  }

  private getOrCreateBreaker(serviceName: string): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const config = this.config.services[serviceName] || this.config.default;
      this.breakers.set(serviceName, new CircuitBreaker(config));
    }
    return this.breakers.get(serviceName)!;
  }
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private config: CircuitBreakerConfig) {}

  isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

## Environment Configuration

```bash
# Application
NODE_ENV="development"
PORT=6400
API_BASE_URL="http://localhost:6400"

# Service URLs
AUTH_SERVICE_URL="http://auth-service:6401"
IMAGE_SERVICE_URL="http://image-ingestion-service:6402"
INFERENCE_SERVICE_URL="http://vision-inference-service:6403"
RESULT_SERVICE_URL="http://result-api-service:6404"
INTERFACE_SERVICE_URL="http://labware-interface-service:6405"
CAPTURE_SERVICE_URL="http://vision-capture-service:6406"

# Authentication
JWT_SECRET="your-jwt-secret"
JWT_ISSUER="microplate-gateway"
JWT_AUDIENCE="microplate-api"

# Rate Limiting
RATE_LIMIT_GLOBAL_WINDOW_MS=900000
RATE_LIMIT_GLOBAL_MAX=1000
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_INFERENCE_WINDOW_MS=3600000
RATE_LIMIT_INFERENCE_MAX=100
RATE_LIMIT_CAPTURE_WINDOW_MS=3600000
RATE_LIMIT_CAPTURE_MAX=200

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=10000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# CORS
CORS_ORIGIN="http://localhost:3000"
CORS_CREDENTIALS=true
CORS_METHODS="GET,POST,PUT,DELETE,OPTIONS"
CORS_HEADERS="Content-Type,Authorization,X-Request-ID"

# Security
HELMET_ENABLED=true
HELMET_CSP_ENABLED=true
HELMET_HSTS_ENABLED=true

# Logging
LOG_LEVEL="info"
LOG_FORMAT="json"
LOG_INCLUDE_REQUEST_ID=true

# Monitoring
METRICS_ENABLED=true
METRICS_PATH="/metrics"
HEALTH_CHECK_PATH="/healthz"
READINESS_CHECK_PATH="/readyz"
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "GATEWAY_TIMEOUT",
    "message": "Service timeout",
    "details": {
      "service": "vision-inference-service",
      "timeout": 30000
    },
    "requestId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `TOO_MANY_REQUESTS`: Rate limit exceeded
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `GATEWAY_TIMEOUT`: Service timeout
- `BAD_GATEWAY`: Service error
- `VALIDATION_ERROR`: Request validation failed

## Security Features

### Authentication & Authorization
- JWT token verification
- Role-based access control
- Token expiration handling
- User context forwarding

### Rate Limiting
- Global rate limiting
- Endpoint-specific limits
- User-based and IP-based limiting
- Sliding window algorithm

### CORS Protection
- Configurable origins
- Credential support
- Method and header restrictions
- Preflight request handling

### Security Headers
- Helmet.js integration
- Content Security Policy
- HSTS enforcement
- XSS protection

## Performance Optimization

### Connection Pooling
- HTTP connection reuse
- Keep-alive connections
- Connection pooling per service
- Timeout management

### Caching
- Response caching for static data
- Service discovery caching
- Circuit breaker state caching
- Rate limit state caching

### Load Balancing
- Round-robin service selection
- Health check integration
- Failover mechanisms
- Service weight balancing

## Monitoring and Metrics

### Key Metrics
- Request count by service
- Response time by service
- Error rate by service
- Circuit breaker state
- Rate limit violations
- Active connections

### Health Checks
- `/healthz`: Basic health check
- `/readyz`: Readiness check (all services)
- `/metrics`: Prometheus metrics

### Logging
- Request/response logging
- Error tracking
- Performance metrics
- Security events
