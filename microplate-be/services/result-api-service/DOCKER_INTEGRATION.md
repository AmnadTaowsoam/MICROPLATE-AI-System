# Result API Service - Docker Integration

## Docker Compose Configuration

The `result-api-service` has been integrated into the main `docker-compose.apps.yml` file with the following configuration:

### Service Configuration
```yaml
result-api-service:
  build:
    context: ./services/result-api-service
    dockerfile: Dockerfile
  container_name: microplate-result-api-service
  restart: unless-stopped
  env_file:
    - ./services/result-api-service/.env
  ports:
    - "6404:6404"
  depends_on:
    - gateway
    - prediction-db-service
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:6404/api/v1/results/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

### Port Allocation Changes

| Service | Old Port | New Port | Reason |
|---------|----------|----------|---------|
| Gateway | 6400 | 6400 | Unchanged |
| Auth Service | 6401 | 6401 | Unchanged |
| Image Ingestion | 6402 | 6402 | Unchanged |
| Vision Inference | 6403 | 6403 | Unchanged |
| **Result API Service** | - | **6404** | **New service** |
| Prediction DB Service | 6404 | 6406 | Moved to accommodate Result API |

### Service Dependencies

The service dependency chain is:
1. `gateway` - API Gateway (handles auth, CORS, rate limiting)
2. `auth-service` - Authentication service
3. `image-ingestion-service` - Image processing
4. `vision-inference-service` - AI inference (depends on result-api-service)
5. `prediction-db-service` - Database operations (port 6406)
6. **`result-api-service`** - **Results aggregation (port 6404)**

### Environment Variables

The service uses the following key environment variables:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/microplates"

# Application
PORT=6404
NODE_ENV="development"

# Redis
REDIS_URL="redis://redis:6379"
REDIS_LOG_CHANNEL="microplate:result-api:logs"
REDIS_ERROR_CHANNEL="microplate:result-api:errors"

# External Services
PREDICTION_DB_SERVICE_URL="http://prediction-db-service:6406"
IMAGE_SERVICE_URL="http://image-ingestion-service:6402"
```

### Health Check

The service provides a health check endpoint at:
- **URL**: `http://localhost:6404/api/v1/results/health`
- **Method**: GET
- **Response**: JSON with service status

### Network Integration

The service runs on the `microplate-network` and can communicate with:
- PostgreSQL database
- Redis cache
- Other microservices via service names
- Gateway for external access

### Deployment Commands

To deploy the complete stack:
```bash
# Build and start all services
docker-compose -f docker-compose.apps.yml up --build

# Start in background
docker-compose -f docker-compose.apps.yml up -d --build

# View logs
docker-compose -f docker-compose.apps.yml logs -f result-api-service

# Stop services
docker-compose -f docker-compose.apps.yml down
```

### Service URLs

When running with Docker Compose:
- **Result API Service**: `http://localhost:6404`
- **API Gateway**: `http://localhost:6400` (routes to result-api-service)
- **Health Check**: `http://localhost:6404/api/v1/results/health`
- **WebSocket**: `ws://localhost:6404/api/v1/results/ws`

### Monitoring

The service includes:
- Health checks every 30 seconds
- Structured logging to Redis channels
- Performance metrics endpoint
- WebSocket connection monitoring
- Database query performance tracking
