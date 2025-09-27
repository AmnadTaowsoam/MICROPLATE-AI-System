# Sample Summary Integration Guide

This document explains how the Labware Interface Service integrates with SampleSummary data from the Result API Service.

## Overview

The Labware Interface Service needs access to `prediction_result.sample_summary` data to generate CSV files. Since this data is primarily managed by the Result API Service, we use a hybrid approach:

1. **Primary**: Call Result API Service to get SampleSummary data
2. **Fallback**: Direct database access if API is unavailable
3. **Caching**: Optional caching for performance

## Architecture

```
┌─────────────────────┐    API Call    ┌─────────────────────┐
│ labware-interface   │ ──────────────► │ result-api-service  │
│ service             │                │                     │
└─────────────────────┘                └─────────────────────┘
         │                                       │
         │ Direct DB Access (Fallback)          │
         ▼                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                          │
│                prediction_result.sample_summary             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Sample Summary Service

The `SampleSummaryService` handles communication with the Result API Service:

```typescript
// Get sample summary via API
const sampleSummary = await sampleSummaryService.getSampleSummary('TEST002');

// With fallback to direct database access
const sampleSummary = await sampleSummaryService.getSampleSummaryWithFallback('TEST002');
```

### 2. CSV Generation

The CSV service uses SampleSummary data to generate interface files:

```typescript
// In csv.service.ts
const sampleSummary = await this.sampleSummaryService.getSampleSummary(sampleNo);
const distribution = sampleSummary.summary.distribution;
const csvData = this.generateCsvData(sampleNo, distribution);
```

### 3. Error Handling

The service includes robust error handling:

- **API Unavailable**: Falls back to direct database access
- **Sample Not Found**: Returns appropriate error message
- **Network Timeout**: Retries with exponential backoff
- **Invalid Data**: Validates and transforms data

## Configuration

### Environment Variables

```bash
# Result API Service URL
RESULT_API_SERVICE_URL=http://result-api-service:6403

# Service authentication token
SERVICE_TOKEN=your-service-jwt-token

# Timeout settings
SAMPLE_SUMMARY_TIMEOUT=10000
```

### Service Configuration

```typescript
const sampleSummaryService = createSampleSummaryService({
  resultApiServiceUrl: process.env.RESULT_API_SERVICE_URL,
  token: process.env.SERVICE_TOKEN,
  timeout: parseInt(process.env.SAMPLE_SUMMARY_TIMEOUT || '10000'),
});
```

## Data Flow

### 1. Generate Interface File Request

```
1. User requests interface file generation
2. labware-interface-service receives request
3. Service calls result-api-service for SampleSummary
4. If API fails, falls back to direct database access
5. Service generates CSV from SampleSummary data
6. Service uploads CSV to Minio
7. Service returns download URL
```

### 2. Sample Summary Data Structure

```typescript
interface SampleSummaryData {
  sampleNo: string;
  summary: {
    distribution: {
      positive: number;
      negative: number;
      invalid: number;
    };
    concentration?: {
      positive_percentage: number;
      negative_percentage: number;
    };
    quality_metrics?: {
      average_confidence: number;
      high_confidence_percentage: number;
    };
  };
  totalRuns: number;
  lastRunAt: Date | null;
  lastRunId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### Result API Service Endpoints

The labware-interface-service calls these endpoints:

```bash
# Get sample summary
GET /api/v1/result/samples/{sampleNo}/summary

# Response
{
  "success": true,
  "data": {
    "sampleNo": "TEST002",
    "summary": {
      "distribution": {
        "positive": 37,
        "negative": 59,
        "invalid": 0
      }
    },
    "totalRuns": 5,
    "lastRunAt": "2024-01-01T00:00:00.000Z",
    "lastRunId": 123,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Fallback Strategy

### 1. API First Approach

```typescript
try {
  // Try API first
  const sampleSummary = await this.sampleSummaryService.getSampleSummary(sampleNo);
} catch (apiError) {
  // Fallback to direct database access
  const dbSummary = await prisma.sampleSummary.findUnique({
    where: { sampleNo },
  });
}
```

### 2. Benefits of Fallback

- **Resilience**: Service continues working if Result API is down
- **Performance**: Direct database access can be faster
- **Independence**: Reduces dependency on external services
- **Reliability**: Ensures interface file generation always works

## Monitoring

### Key Metrics

1. **API Success Rate**: Percentage of successful API calls
2. **Fallback Usage**: How often fallback is used
3. **Response Times**: API vs database response times
4. **Error Rates**: API errors vs database errors

### Logging

```typescript
// API call success
console.log('Sample summary retrieved via API:', { sampleNo, responseTime });

// Fallback usage
console.warn('API call failed, using database fallback:', { sampleNo, error });

// Error logging
console.error('Failed to get sample summary:', { sampleNo, error });
```

## Testing

### Unit Tests

```typescript
describe('SampleSummaryService', () => {
  it('should get sample summary via API', async () => {
    const service = createSampleSummaryService(mockConfig);
    const result = await service.getSampleSummary('TEST002');
    expect(result.sampleNo).toBe('TEST002');
  });

  it('should fallback to database when API fails', async () => {
    // Mock API failure
    mockApiCall.mockRejectedValue(new Error('API Error'));
    
    const service = createSampleSummaryService(mockConfig);
    const result = await service.getSampleSummaryWithFallback('TEST002');
    expect(result.sampleNo).toBe('TEST002');
  });
});
```

### Integration Tests

```typescript
describe('CSV Generation Integration', () => {
  it('should generate CSV with sample summary data', async () => {
    const csvService = new CsvService();
    const result = await csvService.generateInterfaceFile('TEST002');
    
    expect(result.fileName).toContain('TEST002');
    expect(result.fileSize).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

1. **API Timeout**: Increase timeout or check network connectivity
2. **Authentication Error**: Verify SERVICE_TOKEN is valid
3. **Sample Not Found**: Check if sample exists in database
4. **Data Format Error**: Validate SampleSummary data structure

### Debug Mode

```typescript
// Enable debug logging
const sampleSummaryService = createSampleSummaryService({
  ...config,
  debug: true,
});
```

## Performance Optimization

### 1. Caching

```typescript
// Add caching layer
const cachedSummary = await cache.get(`sample:${sampleNo}:summary`);
if (cachedSummary) {
  return cachedSummary;
}

const summary = await this.sampleSummaryService.getSampleSummary(sampleNo);
await cache.set(`sample:${sampleNo}:summary`, summary, 300); // 5 minutes
```

### 2. Connection Pooling

```typescript
// Configure database connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  __internal: {
    engine: {
      connectionLimit: 10,
    },
  },
});
```

## Security

### 1. Service Authentication

- Use JWT tokens for service-to-service communication
- Implement token rotation
- Validate tokens on each request

### 2. Data Access

- Limit database access to necessary tables
- Use read-only connections where possible
- Implement proper error handling to prevent data leaks

## Future Improvements

1. **Caching Layer**: Add Redis caching for SampleSummary data
2. **Event-Driven**: Use message queues for real-time updates
3. **GraphQL**: Consider GraphQL for more efficient data fetching
4. **Monitoring**: Add comprehensive monitoring and alerting
5. **Testing**: Expand test coverage for edge cases
