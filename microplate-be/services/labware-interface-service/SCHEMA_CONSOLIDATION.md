# InterfaceFile Schema Consolidation

## Overview

The `InterfaceFile` model has been consolidated from multiple services into the `labware-interface-service` to follow the Single Responsibility Principle and eliminate code duplication.

## Changes Made

### ✅ Removed InterfaceFile from:
- `result-api-service/prisma/schema.prisma`
- `prediction-db-service/prisma/schema.prisma`

### ✅ Kept InterfaceFile in:
- `labware-interface-service/prisma/schema.prisma` (primary owner)

## Database Schema

The `interface_file` table remains in the `prediction_result` schema and is accessible by all services that connect to the same database.

### Table Structure
```sql
CREATE TABLE prediction_result.interface_file (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_no TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    status TEXT NOT NULL DEFAULT 'pending',
    generated_at TIMESTAMP(3),
    delivered_at TIMESTAMP(3),
    error_msg TEXT,
    created_by UUID,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_interface_file_sample_no ON prediction_result.interface_file(sample_no);
CREATE INDEX idx_interface_file_status ON prediction_result.interface_file(status);
```

## Service Responsibilities

### labware-interface-service
- **Primary owner** of InterfaceFile model
- Manages all CRUD operations
- Generates CSV files
- Uploads to Minio storage
- Provides API endpoints for file management

### Other Services
- Can access data through direct SQL queries if needed
- Should not have Prisma models for InterfaceFile
- Can call labware-interface-service API for file operations

## Migration Steps

1. **Deploy labware-interface-service** with the InterfaceFile model
2. **Run migration script** to verify database structure
3. **Update other services** to remove InterfaceFile references
4. **Test functionality** to ensure everything works correctly

## API Endpoints

The labware-interface-service provides these endpoints:

```
POST   /api/v1/labware/interface/generate    # Generate CSV file
GET    /api/v1/labware/interface/files       # List files
GET    /api/v1/labware/interface/files/:id   # Get file details
DELETE /api/v1/labware/interface/files/:id   # Delete file
```

## Benefits

1. **Single Source of Truth**: Only one service manages InterfaceFile
2. **Reduced Duplication**: No more duplicate model definitions
3. **Clear Responsibilities**: Each service has a focused purpose
4. **Easier Maintenance**: Changes only need to be made in one place
5. **Better Testing**: Interface file logic is centralized

## Rollback Plan

If issues arise:
1. Restore InterfaceFile model to other services
2. Revert database changes
3. Investigate and fix issues
4. Re-run migration when ready

## Monitoring

After deployment, monitor:
- Interface file generation success rate
- API response times
- Database query performance
- Error rates and logs
