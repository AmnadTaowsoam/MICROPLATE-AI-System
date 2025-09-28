# Microplate AI Backend Services

This repository contains all backend microservices for the Microplate AI System.

## 🏗️ Architecture

The system is built using a microservices architecture with the following services:

- **API Gateway** (Port 6400) - Single entry point for all services
- **Auth Service** (Port 6401) - Authentication and authorization
- **Image Ingestion Service** (Port 6402) - Image storage and management
- **Labware Interface Service** (Port 6403) - CSV generation and delivery
- **Result API Service** (Port 6404) - Data aggregation and APIs
- **Vision Inference Service** (Port 6405) - AI model inference
- **Prediction DB Service** (Port 6406) - Database operations for prediction data

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 17
- Docker 20+
- Yarn 1.22+
- Make (optional, for using Makefile commands)

### 🛠️ Development Setup

1. **Clone and Setup**
```bash
# Install dependencies
make install

# Start infrastructure services (PostgreSQL, MinIO, Redis, etc.)
make infra-up

# Setup database
make db-migrate
make db-seed

# Start all services
make dev
```

2. **Manual Setup (without Makefile)**
```bash
# Install dependencies
yarn install

# Start infrastructure
docker-compose -f docker-compose.infra.yml up -d

# Setup database
cd auth-service
yarn prisma migrate dev
yarn prisma db seed

# Start services
yarn dev:all
```

### 📊 Infrastructure Services

After running `make infra-up`, you'll have access to:

- **PostgreSQL**: `localhost:35432` (postgres/microplate123)
- **File Storage**: `./shared-storage/` (local folders)
- **Redis**: `localhost:6379`
- **Prometheus**: `localhost:9090`
- **Grafana**: `localhost:3001` (admin/grafana123)
- **Jaeger**: `localhost:16686`

> **Note**: PostgreSQL uses port **35432** instead of the default **5432** to avoid conflicts with existing PostgreSQL services.

### 🔧 Available Commands

```bash
# Development
make dev              # Start all services
make dev-auth         # Start auth service only
make dev-images       # Start image service only
make dev-inference    # Start inference service only
make dev-results      # Start results service only
make dev-interface    # Start interface service only
make dev-capture      # Start capture service only
make dev-gateway      # Start gateway only

# Infrastructure
make infra-up         # Start infrastructure services
make infra-down       # Stop infrastructure services
make infra-logs       # Show infrastructure logs
make infra-restart    # Restart infrastructure services

# Database
make db-migrate       # Run database migrations
make db-seed          # Seed database with initial data
make db-reset         # Reset database
make db-studio        # Open Prisma Studio

# Testing
make test             # Run all tests
make test-auth        # Test auth service
make test-images      # Test image service
make test-results     # Test results service
make test-interface   # Test interface service
make test-gateway     # Test gateway
make test-inference   # Test inference service

# Utilities
make lint             # Run linting
make format           # Format code
make clean            # Clean build artifacts
make health           # Check service health
make status           # Check service status
make logs             # Show all logs

# Setup
make setup            # Complete development setup
```

## 📁 Project Structure

```
microplate-be/
├── auth-service/                 # Authentication and authorization
├── image-ingestion-service/      # Image storage and management
├── vision-inference-service/     # AI model inference
├── result-api-service/          # Data aggregation and APIs
├── labware-interface-service/   # CSV generation and delivery
├── vision-capture-service/      # Camera control and capture
├── gateway/                     # API Gateway
├── shared/                      # Shared utilities and types
├── infra/                       # Infrastructure configuration
│   ├── postgres/               # PostgreSQL setup
│   ├── redis/                  # Redis configuration
│   ├── prometheus/             # Prometheus monitoring
│   ├── grafana/                # Grafana dashboards
│   └── minio/                  # MinIO object storage
├── docker-compose.infra.yml    # Infrastructure services
├── docker-compose.apps.yml     # Application services
├── docker-compose.prod.yml     # Production setup
├── Makefile                    # Development commands
└── README.md
```

## 🔐 Default Credentials

After running the seed script, you'll have these default users:

- **Admin**: `admin@microplate-ai.com` / `Admin123!`
- **Operator**: `john.doe@microplate-ai.com` / `Test123!`
- **User**: `jane.smith@microplate-ai.com` / `Test123!`
- **Lab Tech**: `lab.tech@microplate-ai.com` / `Test123!`

## 🌐 API Documentation

Each service provides OpenAPI documentation:
- **Gateway**: http://localhost:6400/docs
- **Auth Service**: http://localhost:6401/docs
- **Image Service**: http://localhost:6402/docs
- **Labware Interface Service**: http://localhost:6403/docs
- **Results Service**: http://localhost:6404/docs
- **Vision Inference Service**: http://localhost:6405/docs
- **Prediction DB Service**: http://localhost:6406/docs

## 📈 Monitoring

### Health Checks
- Gateway: http://localhost:6400/healthz
- Individual services: http://localhost:PORT/healthz

### Metrics
- Prometheus metrics: http://localhost:PORT/metrics
- Grafana dashboards: http://localhost:3001

### Tracing
- Jaeger UI: http://localhost:16686

## 🧪 Testing

```bash
# Run all tests
make test

# Run tests for specific service
make test-auth
make test-images
make test-results
make test-interface
make test-gateway
make test-inference

# Run tests with coverage
yarn test:coverage
```

## 🚀 Production Deployment

### Docker Compose
```bash
# Build and start production stack
make prod-build
make prod-up

# Or manually
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

## 🐳 Docker Compose Setup Guide

### Environment Configuration

The `docker-compose.apps.yml` uses environment variables from `.env` files for better configuration management.

#### Setup Steps

1. **Copy environment template:**
   ```bash
   cp env.example .env
   ```

2. **Update .env with your values:**
   - Set strong JWT secrets (32+ characters)
   - Configure database URL
   - Set up SMTP for email notifications
   - Adjust ports and URLs as needed

3. **Run services:**
   ```bash
   # Start all services
   docker-compose -f docker-compose.infra.yml up -d
   docker-compose -f docker-compose.apps.yml up -d
   
   # View logs
   docker-compose -f docker-compose.apps.yml logs -f auth-service
   
   # Stop services
   docker-compose -f docker-compose.apps.yml down
   ```

#### Environment Variables

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - JWT access token secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret

**Optional Variables (with defaults):**
- `AUTH_PORT` - Auth service port (default: 6401)
- `NODE_ENV` - Environment (default: production)
- `LOG_LEVEL` - Log level (default: info)
- `CORS_ORIGIN` - CORS origin (default: http://localhost:3000)
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit (default: 100)

**Service-Specific Variables:**
- `SMTP_*` - Email configuration
- `BCRYPT_ROUNDS` - Password hashing rounds
- `TOKEN_EXPIRY_*` - Token expiration settings

#### File Structure

```
microplate-be/
├── .env                    # Main environment file
├── env.example            # Environment template
├── docker-compose.infra.yml    # Infrastructure services
├── docker-compose.apps.yml     # Application services
└── services/
    └── auth-service/
        ├── .env           # Service-specific overrides
        └── env.example    # Service environment template
```

#### Environment File Priority

1. Service-specific `.env` (e.g., `services/auth-service/.env`)
2. Main `.env` file
3. Default values in docker-compose.yml

## 🔧 Configuration

### Environment Variables

The system uses a centralized environment configuration approach:

#### Docker Compose Setup (Recommended)

```bash
# 1. Copy main environment template
cd microplate-be
cp env.example .env

# 2. Update .env with your values
# 3. Run Docker Compose
docker-compose -f docker-compose.infra.yml up -d
docker-compose -f docker-compose.apps.yml up -d
```

**Main .env file location:** `microplate-be/.env`

```env
# Database
DATABASE_URL="postgresql://postgres:microplate123@localhost:35432/microplates"

# JWT Secrets (32+ characters)
JWT_ACCESS_SECRET="your-access-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"

# Service Ports
AUTH_PORT=6401
IMAGE_PORT=6402
LABWARE_PORT=6403
RESULT_PORT=6404
INFERENCE_PORT=6405
PREDICTION_DB_PORT=6406

# File Storage
FILE_STORAGE_BASE_PATH="./shared-storage"
FILE_BASE_URL="http://localhost:6400/files"

# Cache
REDIS_URL="redis://localhost:6379"

# Monitoring
PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3001"
JAEGER_URL="http://localhost:16686"
```

#### Local Development Setup

For individual service development:

```bash
# 1. Copy service-specific template
cd microplate-be/services/auth-service
cp env.example .env

# 2. Update .env for local development
# 3. Run service
yarn dev
```

**Service .env files location:** `microplate-be/services/{service-name}/.env`

```env
# Database (use localhost for local development)
DATABASE_URL="postgresql://postgres:microplate123@localhost:35432/microplates"

# JWT Secrets
JWT_ACCESS_SECRET="your-access-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"

# Service Configuration
PORT=6401
NODE_ENV="development"
LOG_LEVEL="info"
```

### Environment File Priority

1. **Service-specific .env** (e.g., `services/auth-service/.env`)
2. **Main .env file** (`microplate-be/.env`)
3. **Default values** in docker-compose.yml

### Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | **35432** | Database (mapped from container port 5432) |
| **API Gateway** | 6400 | Main entry point |
| **Auth Service** | 6401 | Authentication |
| **Image Ingestion** | 6402 | Image storage |
| **Labware Interface** | 6403 | CSV generation |
| **Result API** | 6404 | Data aggregation |
| **Vision Inference** | 6405 | AI inference |
| **Prediction DB** | 6406 | Database operations |

> **Important**: PostgreSQL uses port **35432** to avoid conflicts with existing PostgreSQL services.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**: Check PostgreSQL is running on port **35432** and credentials are correct
2. **Service Communication**: Verify all services are running and ports are available
3. **Environment Variables**: Ensure `.env` files are properly configured
4. **Port Conflicts**: Check if ports are already in use

### Environment Setup Issues

#### Docker Compose Issues
```bash
# Check if main .env exists
ls -la microplate-be/.env

# Verify environment variables
docker-compose -f docker-compose.apps.yml config

# Check specific service environment
docker exec microplate-auth-service env | grep JWT
```

#### Local Development Issues
```bash
# Check if service .env exists
ls -la microplate-be/services/auth-service/.env

# Verify database connection
psql -h localhost -p 35432 -U postgres -d microplates

# Check port availability
netstat -an | grep 35432
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
make health

# Or manually test
curl -s http://localhost:35432 > /dev/null && echo "PostgreSQL is running" || echo "PostgreSQL is not responding"

# Check container logs
docker-compose -f docker-compose.infra.yml logs postgres
```

### Port Configuration Issues

```bash
# Check if port is available
netstat -an | grep 6401

# Check Docker container status
docker-compose -f docker-compose.apps.yml ps

# Verify port mappings
docker-compose -f docker-compose.apps.yml config
```

### Debug Mode

Set `LOG_LEVEL=debug` in environment variables for detailed logging.

### Health Checks

```bash
# Check all service health
make health

# Check service status
make status

# View logs
make logs

# Check specific service logs
docker-compose -f docker-compose.apps.yml logs -f auth-service
```

### Security Notes

- Never commit `.env` files to version control
- Use strong, unique secrets for production (32+ characters)
- Rotate JWT secrets regularly
- Use environment-specific configurations

## 📚 Documentation

- [Architecture Overview](docs/01-Architecture-Overview.md)
- [Database Schema](docs/02-Database-Schema.md)
- [Auth Service](docs/03-Auth-Service.md)
- [Image Ingestion Service](docs/04-Image-Ingestion-Service.md)
- [Vision Inference Service](docs/05-Vision-Inference-Service.md)
- [Result API Service](docs/06-Result-API-Service.md)
- [Labware Interface Service](docs/07-Labware-Interface-Service.md)
- [Vision Capture Service](docs/08-Vision-Capture-Service.md)
- [API Gateway](docs/09-API-Gateway.md)
- [Implementation Guide](docs/11-Implementation-Guide.md)
- [Deployment Guide](docs/12-Deployment-Guide.md)

## 📋 Recent Changes

### Service Port Allocation Updates

The system has been updated with a new service architecture and port allocation:

| Service | Old Port | New Port | Status |
|---------|----------|----------|---------|
| **API Gateway** | 6400 | 6400 | ✅ Unchanged |
| **Auth Service** | 6401 | 6401 | ✅ Unchanged |
| **Image Ingestion** | 6402 | 6402 | ✅ Unchanged |
| **Labware Interface** | 6405 | 6403 | 🔄 **Updated** |
| **Result API** | - | 6404 | 🆕 **New** |
| **Vision Inference** | 6403 | 6405 | 🔄 **Updated** |
| **Prediction DB** | - | 6406 | 🆕 **New** |
| **PostgreSQL** | 5432 | 35432 | 🔄 **Updated** |

### Key Changes

1. **New Services Added:**
   - **Result API Service** (Port 6404) - Data aggregation and real-time updates
   - **Prediction DB Service** (Port 6406) - Database operations for prediction data

2. **Port Reorganization:**
   - **Labware Interface Service** moved from 6405 to 6403
   - **Vision Inference Service** moved from 6403 to 6405
   - **PostgreSQL** moved from 5432 to 35432 to avoid conflicts

3. **Gateway Integration:**
   - JWT, CORS, and Rate Limiting are now handled by the API Gateway
   - Services receive user information via headers from the Gateway
   - Simplified service configuration and security management

4. **Environment Configuration:**
   - Centralized `.env` file management for Docker Compose
   - Service-specific `.env` files for local development
   - Clear separation between Docker and local development setups

### Migration Notes

If you have existing applications:
- Update connection strings to use PostgreSQL port **35432**
- Update service URLs to reflect new port allocations
- Ensure `.env` files are properly configured for your deployment method

## 🤝 Contributing

1. Follow the coding standards defined in each service
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## 📄 License

This project is proprietary and confidential.

---

# Gateway Removal and Service Authentication Implementation

## Overview
This document summarizes the changes made to remove the API Gateway and implement direct authentication in all services.

## Changes Made

### 1. Shared Authentication Middleware
- **Created**: `microplate-be/shared/auth-middleware.ts`
- **Purpose**: Reusable JWT authentication middleware for Express services
- **Features**:
  - Token validation with configurable issuer/audience
  - Optional authentication support
  - Role-based authorization
  - Service-to-service authentication
  - Comprehensive error handling

### 2. Service Conversions

#### Image Ingestion Service
- **Converted**: Fastify → Express
- **Changes**:
  - Updated `package.json` dependencies
  - Converted `server.ts` to Express
  - Updated routes to use Express middleware
  - Added JWT authentication to all endpoints
  - Implemented multer for file uploads

#### Prediction DB Service
- **Converted**: Fastify → Express
- **Changes**:
  - Updated `package.json` dependencies
  - Converted `server.ts` to Express
  - Added JWT authentication to protected endpoints
  - Maintained health check endpoints without auth

#### Result API Service
- **Converted**: Fastify → Express
- **Changes**:
  - Updated `package.json` dependencies
  - Completely rewrote `server.ts` for Express
  - Added WebSocket support using `ws` library
  - Implemented JWT authentication
  - Added Swagger documentation

#### Vision Inference Service
- **Status**: Python FastAPI (kept as-is)
- **Changes**:
  - Added JWT token validation to all endpoints
  - Implemented `verify_token` dependency function
  - Added authentication to all API endpoints

#### Labware Interface Service
- **Created**: New Express service
- **Features**:
  - Basic Express server setup
  - JWT authentication middleware
  - Health check endpoints
  - Swagger documentation
  - Prisma integration ready

### 3. Docker Configuration
- **Updated**: `docker-compose.apps.yml`
- **Changes**:
  - Removed gateway service completely
  - Removed all `depends_on: gateway` references
  - Added labware-interface service
  - Updated port mappings

### 4. Environment Configuration
- **Updated**: All service `env.example` files
- **Added**:
  - `JWT_SECRET` configuration
  - `JWT_ISSUER` configuration
  - `JWT_AUDIENCE` configuration
  - `CORS_ORIGIN` configuration

## Service Ports
- **Auth Service**: 6401
- **Image Ingestion**: 6402
- **Vision Inference**: 6403
- **Result API**: 6404
- **Labware Interface**: 6405
- **Prediction DB**: 6406

## Authentication Flow
1. Client authenticates with Auth Service (port 6401)
2. Auth Service returns JWT token
3. Client includes token in `Authorization: Bearer <token>` header
4. Each service validates token using shared middleware
5. Services extract user information from token payload

## Security Features
- JWT token validation with configurable secret
- Token expiration handling
- Invalid token rejection
- Role-based access control (ready for implementation)
- Service-to-service authentication support
- CORS configuration
- Rate limiting
- Security headers (helmet)

## Next Steps
1. **Update Frontend**: Modify frontend to call services directly instead of through gateway
2. **Service Discovery**: Implement service discovery or load balancer if needed
3. **Monitoring**: Update monitoring to track individual services
4. **Documentation**: Update API documentation to reflect direct service access
5. **Testing**: Test authentication flow end-to-end

## Breaking Changes
- **Frontend**: Must now call services directly on their individual ports
- **Service Communication**: Services must include JWT tokens in inter-service calls
- **Deployment**: Gateway service is no longer needed in deployment

## Benefits
- **Reduced Complexity**: Eliminated gateway layer
- **Better Performance**: Direct service access
- **Simplified Architecture**: Fewer moving parts
- **Individual Scaling**: Each service can be scaled independently
- **Direct Debugging**: Easier to debug individual services

---

# Login Test Guide

## ✅ Problem Fixed!

The issue was a **field name mismatch** between frontend and backend:

- **Frontend was sending**: `usernameOrEmail`
- **Backend expected**: `username`

## 🔧 Changes Made

1. **Updated Frontend Types** (`src/services/auth.service.ts`):
   ```typescript
   export type LoginRequest = {
     username: string  // Changed from usernameOrEmail
     password: string
   }
   ```

2. **Updated Frontend Login Call** (`src/pages/AuthPage.tsx`):
   ```typescript
   await authService.login({ username: username || email, password });
   ```

## 🧪 Test Login

Now you can test login with the existing user:

### User Credentials
- **Email**: `qi@qi.com`
- **Username**: `qiadmin`
- **Password**: `[original password]` (the one you used when creating the user)

### Test Steps

1. **Open Frontend**: http://localhost:6410
2. **Go to Login Page**
3. **Enter Credentials**:
   - Username/Email: `qi@qi.com` or `qiadmin`
   - Password: `[your original password]`
4. **Click Login**

### Expected Result
- ✅ Login successful
- ✅ JWT token received
- ✅ Redirected to main app
- ✅ Token stored in localStorage

## 🔍 Debug Information

### Frontend Network Tab
Look for:
- **Request**: `POST http://localhost:6401/api/v1/auth/login`
- **Request Body**: `{"username":"qi@qi.com","password":"..."}`
- **Response**: `{"success":true,"data":{"accessToken":"...","user":{...}}}`

### Auth Service Logs
Should show:
```
Request started: POST /api/v1/auth/login
Request completed: 200 OK
```

## 🚨 If Still Not Working

### Check Password
The user password is hashed with Argon2. If you don't remember the original password:

1. **Create a new user** via registration
2. **Or reset password** via forgot password flow

### Check Database
Verify user exists:
```sql
SELECT email, username, isActive, emailVerified 
FROM auth."User" 
WHERE email = 'qi@qi.com';
```

### Check Auth Service
Test directly with curl:
```bash
curl -X POST http://localhost:6401/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"qi@qi.com","password":"YOUR_PASSWORD"}'
```

## 🎉 Success!

Once login works, you should see:
- JWT token in browser localStorage
- All API calls include `Authorization: Bearer <token>` header
- Access to protected routes and services

---

**The login should now work perfectly!** 🚀

---

# Troubleshooting Guide - Auth Service

## Problem: ERR_EMPTY_RESPONSE on Login

### Symptoms
- Frontend shows `ERR_EMPTY_RESPONSE` when calling auth service
- Auth service logs show `INVALID_CREDENTIALS` error
- Server crashes instead of returning proper error response

### Root Causes
1. **No users in database** - Auth service can't find user to authenticate
2. **Error handling issues** - Server crashes instead of returning error response
3. **CORS issues** - Browser blocks the request

### Solutions

#### 1. Fix Error Handling ✅
- Updated auth service to use custom error classes
- Fixed error handling in routes to return proper HTTP responses
- Added proper error logging

#### 2. Create Test Users
Run the seed script to create test users:

```bash
cd microplate-be/services/auth-service
npm run prisma:seed
# or
yarn prisma:seed
```

This will create:
- **Test User**: `test@example.com` / `testuser` / `password123`
- **Admin User**: `admin@example.com` / `admin` / `password123`

#### 3. Test Auth Service
Run the test script to verify auth service is working:

```bash
cd microplate-be
node test-auth.js
```

#### 4. Check Database Connection
Ensure PostgreSQL is running and accessible:

```bash
# Check if database is accessible
psql -h localhost -U microplate -d microplate_db -c "SELECT 1;"
```

#### 5. Verify Service is Running
Check if auth service is running on port 6401:

```bash
curl http://localhost:6401/healthz
```

Should return: `{"status":"ok"}`

### Step-by-Step Fix

1. **Start Database** (if not running):
   ```bash
   cd microplate-be
   docker-compose -f docker-compose.infra.yml up -d postgres
   ```

2. **Run Database Migrations**:
   ```bash
   cd microplate-be/services/auth-service
   npm run prisma:deploy
   ```

3. **Seed Database**:
   ```bash
   npm run prisma:seed
   ```

4. **Start Auth Service**:
   ```bash
   npm run dev
   ```

5. **Test Login**:
   ```bash
   curl -X POST http://localhost:6401/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"usernameOrEmail":"test@example.com","password":"password123"}'
   ```

### Expected Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "username": "testuser"
    }
  }
}
```

### Frontend Testing
1. Open browser developer tools
2. Go to Network tab
3. Try to login with:
   - Email: `test@example.com`
   - Password: `password123`
4. Check if request returns proper response

### Common Issues

#### Issue: "User not found"
**Solution**: Run the seed script to create test users

#### Issue: "Database connection failed"
**Solution**: 
1. Check if PostgreSQL is running
2. Verify DATABASE_URL in .env file
3. Run migrations

#### Issue: "CORS error"
**Solution**: 
1. Check CORS_ORIGIN in auth service config
2. Ensure frontend URL is allowed

#### Issue: "JWT secret not set"
**Solution**: 
1. Set JWT_ACCESS_SECRET in .env file
2. Restart auth service

### Debug Commands

```bash
# Check auth service logs
docker logs microplate-auth-service

# Check database connection
psql -h localhost -U microplate -d microplate_db

# Test auth service directly
curl -v http://localhost:6401/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"test@example.com","password":"password123"}'

# Check if port is open
netstat -tulpn | grep 6401
```

### Environment Variables
Make sure these are set in `microplate-be/services/auth-service/.env`:

```env
DATABASE_URL=postgresql://microplate:microplate123@postgres:5432/microplate_db?schema=auth
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
PORT=6401
CORS_ORIGIN=true
NODE_ENV=development
```

---

**After following these steps, the auth service should work properly!** 🚀