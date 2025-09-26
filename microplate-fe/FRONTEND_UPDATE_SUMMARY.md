# Frontend Update Summary - Direct Service Access

## Overview
Updated the frontend to call microservices directly instead of through the API Gateway.

## Changes Made

### 1. Environment Configuration
- **Created**: `env.example` with service-specific URLs
- **Service URLs**:
  - Auth Service: `http://localhost:6401`
  - Image Service: `http://localhost:6402`
  - Vision Service: `http://localhost:6403`
  - Results Service: `http://localhost:6404`
  - Labware Service: `http://localhost:6405`
  - Prediction Service: `http://localhost:6406`

### 2. Vite Configuration
- **Updated**: `vite.config.ts`
- **Removed**: Gateway proxy configuration
- **Result**: Direct service calls without proxy

### 3. API Service Architecture
- **Updated**: `src/services/api.ts`
- **Added**: Service-specific API instances
  - `authApi` - Auth Service (port 6401)
  - `imageApi` - Image Ingestion Service (port 6402)
  - `visionApi` - Vision Inference Service (port 6403)
  - `resultsApi` - Results API Service (port 6404)
  - `labwareApi` - Labware Interface Service (port 6405)
  - `predictionApi` - Prediction DB Service (port 6406)

### 4. Service Updates

#### Auth Service (`src/services/auth.service.ts`)
- **Updated**: Uses `authApi` instead of generic `api`
- **Enhanced**: Token management across all API instances
- **Features**:
  - Login sets token for all services
  - Logout clears token from all services
  - Token loading applies to all services

#### Image Service (`src/services/image.service.ts`)
- **Updated**: Uses `imageApi` for uploads, `visionApi` for predictions
- **Endpoints**:
  - Upload: `POST /api/v1/images` (Image Service)
  - Prediction: `POST /api/v1/inference/predict` (Vision Service)
  - Capture: `POST /api/v1/capture/snap` (Vision Service)

#### Results Service (`src/services/results.service.ts`)
- **Updated**: Uses `resultsApi` instead of generic `api`
- **Endpoints**:
  - Get Sample: `GET /api/v1/results/samples/{sampleNo}`

### 5. Documentation Updates
- **Updated**: `README.md`
- **Added**: Service-specific endpoint documentation
- **Updated**: Environment variable configuration
- **Added**: Port mapping information

## Authentication Flow

### Login Process
1. User submits credentials to Auth Service (port 6401)
2. Auth Service returns JWT token
3. Frontend stores token in localStorage
4. Token is automatically set for all API instances
5. All subsequent requests include `Authorization: Bearer <token>` header

### Token Management
- **Login**: Sets token for all 6 API instances
- **Logout**: Clears token from all 6 API instances
- **Page Load**: Loads token from localStorage and applies to all instances
- **Automatic**: No manual token management required

## Service Communication

### Direct Service Calls
- **No Gateway**: Services called directly on their ports
- **JWT Authentication**: All services validate JWT tokens
- **CORS**: Each service handles CORS independently
- **Error Handling**: Service-specific error responses

### API Instance Management
```typescript
// Each service has its own API instance
const authApi = new ApiService('http://localhost:6401')
const imageApi = new ApiService('http://localhost:6402')
// ... etc

// Token is set for all instances
authApi.setAccessToken(token)
imageApi.setAccessToken(token)
// ... etc
```

## Benefits

### Performance
- **Reduced Latency**: No gateway overhead
- **Direct Communication**: Faster service-to-service calls
- **Better Caching**: Service-specific caching strategies

### Scalability
- **Independent Scaling**: Each service can be scaled separately
- **Load Balancing**: Can be implemented per service
- **Service Isolation**: Failures don't affect other services

### Development
- **Easier Debugging**: Direct service access
- **Independent Testing**: Test services individually
- **Clear Dependencies**: Explicit service relationships

## Breaking Changes

### Frontend
- **Environment Variables**: Must configure service URLs
- **API Calls**: Now go directly to services
- **WebSocket**: Now connects to Results Service (port 6404)

### Configuration
- **No Gateway**: Remove gateway from deployment
- **Service URLs**: Configure each service URL
- **CORS**: Ensure services allow frontend origin

## Migration Steps

### For Development
1. **Copy Environment**: `cp env.example .env`
2. **Start Services**: Start all microservices
3. **Start Frontend**: `yarn dev`
4. **Test**: Verify all API calls work

### For Production
1. **Update Environment**: Set production service URLs
2. **Deploy Services**: Deploy all microservices
3. **Deploy Frontend**: Deploy with new configuration
4. **Monitor**: Check service health and performance

## Testing Checklist

### Authentication
- [ ] Register new user
- [ ] Login with credentials
- [ ] Token persistence across page reloads
- [ ] Logout functionality
- [ ] Password reset flow

### Image Processing
- [ ] Image upload to Image Service
- [ ] Prediction request to Vision Service
- [ ] Camera capture (if available)
- [ ] Error handling for failed uploads

### Results
- [ ] Sample results from Results Service
- [ ] WebSocket connection for real-time updates
- [ ] Data visualization and charts

### Error Handling
- [ ] Network errors
- [ ] Authentication errors
- [ ] Service unavailable errors
- [ ] Token expiration handling

## Next Steps

1. **Testing**: Comprehensive end-to-end testing
2. **Monitoring**: Set up service monitoring
3. **Documentation**: Update API documentation
4. **Performance**: Monitor and optimize service calls
5. **Security**: Review authentication and authorization

---

**Frontend is now ready for direct service access!** 🚀
