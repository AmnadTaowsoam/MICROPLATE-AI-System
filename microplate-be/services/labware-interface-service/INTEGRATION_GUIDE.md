# Interface Service Integration Guide

This guide explains how other services can integrate with the Labware Interface Service to access InterfaceFile data.

## Overview

The Labware Interface Service is now the **single source of truth** for InterfaceFile data. Other services can access this data through:

1. **Shared API endpoints** (recommended)
2. **Client library** (for TypeScript services)
3. **Direct database queries** (if needed)

## Integration Methods

### 1. Shared API Endpoints (Recommended)

Use the shared API endpoints for read-only access to InterfaceFile data:

```bash
# Get all interface files
GET /api/v1/labware/shared/interface-files

# Get interface files with filters
GET /api/v1/labware/shared/interface-files?sampleNo=TEST002&status=delivered

# Get specific interface file
GET /api/v1/labware/shared/interface-files/{id}

# Get interface files by sample
GET /api/v1/labware/shared/interface-files/sample/{sampleNo}

# Get statistics
GET /api/v1/labware/shared/interface-files/statistics
```

### 2. Client Library (TypeScript Services)

For TypeScript services, use the provided client library:

```typescript
import { createInterfaceClient, defaultInterfaceClientConfig } from './clients/interface-client';

// Create client
const interfaceClient = createInterfaceClient({
  ...defaultInterfaceClientConfig,
  token: 'your-jwt-token',
});

// Get interface files
const files = await interfaceClient.getInterfaceFiles({
  sampleNo: 'TEST002',
  status: 'delivered',
  limit: 10
});

// Get specific file
const file = await interfaceClient.getInterfaceFile('file-id');

// Get files by sample
const sampleFiles = await interfaceClient.getInterfaceFilesBySample('TEST002');

// Get statistics
const stats = await interfaceClient.getStatistics();
```

### 3. Direct Database Access

If you need direct database access, you can query the `prediction_result.interface_file` table:

```sql
-- Get interface files
SELECT * FROM prediction_result.interface_file 
WHERE sample_no = 'TEST002' 
  AND status = 'delivered'
ORDER BY created_at DESC;

-- Get statistics
SELECT 
  status,
  COUNT(*) as count
FROM prediction_result.interface_file 
GROUP BY status;
```

## Service Integration Examples

### Result API Service Integration

```typescript
// In result-api-service
import { createInterfaceClient } from '@labware-interface/client';

class ResultService {
  private interfaceClient = createInterfaceClient({
    baseUrl: process.env.LABWARE_INTERFACE_SERVICE_URL,
    token: process.env.SERVICE_TOKEN,
  });

  async getSampleWithInterfaceFiles(sampleNo: string) {
    // Get sample data
    const sample = await this.getSample(sampleNo);
    
    // Get interface files
    const interfaceFiles = await this.interfaceClient.getInterfaceFilesBySample(sampleNo);
    
    return {
      ...sample,
      interfaceFiles,
    };
  }
}
```

### Prediction DB Service Integration

```typescript
// In prediction-db-service
import { createInterfaceClient } from '@labware-interface/client';

class PredictionService {
  private interfaceClient = createInterfaceClient({
    baseUrl: process.env.LABWARE_INTERFACE_SERVICE_URL,
    token: process.env.SERVICE_TOKEN,
  });

  async getPredictionWithInterfaceFiles(predictionId: string) {
    // Get prediction data
    const prediction = await this.getPrediction(predictionId);
    
    // Get interface files for the sample
    const interfaceFiles = await this.interfaceClient.getInterfaceFilesBySample(
      prediction.sampleNo
    );
    
    return {
      ...prediction,
      interfaceFiles,
    };
  }
}
```

## Environment Variables

Add these environment variables to your service:

```bash
# Labware Interface Service URL
LABWARE_INTERFACE_SERVICE_URL=http://labware-interface-service:6405

# Service token for authentication
SERVICE_TOKEN=your-service-jwt-token
```

## Error Handling

The client library provides proper error handling:

```typescript
try {
  const files = await interfaceClient.getInterfaceFiles();
  // Handle success
} catch (error) {
  if (error.response?.status === 404) {
    // Handle not found
  } else if (error.response?.status === 401) {
    // Handle unauthorized
  } else {
    // Handle other errors
    console.error('Interface service error:', error);
  }
}
```

## Migration from Direct Database Access

If you were previously accessing InterfaceFile data directly:

### Before (Direct Database)
```typescript
// OLD: Direct database access
const files = await prisma.interfaceFile.findMany({
  where: { sampleNo: 'TEST002' }
});
```

### After (Client Library)
```typescript
// NEW: Client library access
const files = await interfaceClient.getInterfaceFilesBySample('TEST002');
```

## Benefits

1. **Single Source of Truth**: All InterfaceFile data managed in one place
2. **Type Safety**: TypeScript client provides type safety
3. **Error Handling**: Consistent error handling across services
4. **Caching**: Client can implement caching strategies
5. **Monitoring**: Centralized logging and monitoring
6. **Versioning**: API versioning for backward compatibility

## Monitoring

Monitor the integration:

- **API Response Times**: Track shared endpoint performance
- **Error Rates**: Monitor 4xx/5xx responses
- **Usage Patterns**: Track which services use which endpoints
- **Data Consistency**: Ensure data integrity across services

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Check JWT token validity
2. **Connection Timeouts**: Verify service URL and network connectivity
3. **Data Not Found**: Check if InterfaceFile exists and is accessible
4. **Permission Errors**: Ensure service has proper permissions

### Debug Mode

Enable debug logging:

```typescript
const interfaceClient = createInterfaceClient({
  ...config,
  debug: true, // Enable debug logging
});
```

## Support

For issues or questions:
1. Check the service logs
2. Verify API endpoint responses
3. Test with the provided test scripts
4. Contact the development team
