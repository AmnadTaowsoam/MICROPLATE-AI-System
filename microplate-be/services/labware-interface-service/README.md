# Labware Interface Service

This service provides CSV file generation functionality for the Microplate AI system. It generates interface files from prediction results and stores them in Minio for download.

## Features

- Generate CSV interface files from sample summary data
- Store generated files in Minio object storage
- Track file generation status and history
- Provide download URLs for generated files
- Cleanup temporary files automatically

## API Endpoints

### Generate Interface File
```
POST /api/v1/labware/interface/generate
```

**Request Body:**
```json
{
  "sampleNo": "TEST002"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sampleNo": "TEST002",
    "fileName": "interface_TEST002_1234567890.csv",
    "filePath": "interface-files/TEST002/interface_TEST002_1234567890.csv",
    "fileSize": 1024,
    "status": "delivered",
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "downloadUrl": "https://minio.example.com/interface-file/..."
  }
}
```

### List Interface Files
```
GET /api/v1/labware/interface/files?sampleNo=TEST002
```

### Get Interface File Details
```
GET /api/v1/labware/interface/files/{id}
```

### Delete Interface File
```
DELETE /api/v1/labware/interface/files/{id}
```

## CSV Format

The generated CSV files follow the format specified in `interface_sample.csv`:

```csv
SAMPLE_NUMBER,TEST_NUMBER,REPORTED_NAME,ENTRY
TEST002,T001,1,0
TEST002,T001,2,5
TEST002,T001,3,0
...
TEST003,T001,total,40
TEST004,T001,MEAN,3.33
TEST005,T001,SD,5.37
TEST006,T001,CV,1.60963011
```

## Environment Variables

```bash
# Server Configuration
PORT=6405
NODE_ENV=development
HOST=0.0.0.0

# Database Configuration
DATABASE_URL="postgresql://microplate:microplate123@postgres:5432/microplate_db?schema=prediction_result"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ISSUER=microplate-auth-service
JWT_AUDIENCE=microplate-services

# CORS Configuration
CORS_ORIGIN=http://localhost:6410

# Minio Configuration
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_INTERFACE=interface-file

# File Configuration
TEMP_DIR=/tmp/interface-files
MAX_FILE_SIZE=10485760
```

## Development

### Prerequisites
- Node.js 20+
- Yarn
- PostgreSQL
- Minio

### Setup
1. Install dependencies:
   ```bash
   yarn install
   ```

2. Copy environment file:
   ```bash
   cp env.example .env
   ```

3. Generate Prisma client:
   ```bash
   yarn prisma:generate
   ```

4. Run database migrations:
   ```bash
   yarn prisma:migrate
   ```

### Running the Service

#### Development
```bash
yarn dev
```

#### Production
```bash
yarn build
yarn start:prod
```

### Testing
```bash
yarn test
yarn test:watch
yarn test:coverage
```

## Docker

### Build
```bash
docker build -t labware-interface-service .
```

### Run
```bash
docker run -p 6405:6405 --env-file .env labware-interface-service
```

## Database Schema

The service uses the following main tables:

- `sample_summary` - Stores sample analysis results
- `interface_file` - Tracks generated interface files

## File Storage

Generated CSV files are stored in Minio with the following structure:
```
interface-file/
├── interface-files/
│   ├── TEST002/
│   │   └── interface_TEST002_1234567890.csv
│   └── TEST003/
│       └── interface_TEST003_1234567891.csv
```

## Error Handling

The service includes comprehensive error handling:
- Validation errors for invalid requests
- Database connection errors
- Minio storage errors
- File generation errors

## Monitoring

Health check endpoints:
- `GET /health` - Basic health check
- `GET /ready` - Readiness check (includes database connectivity)

## Security

- JWT authentication required for all endpoints
- Rate limiting (100 requests per 15 minutes per IP)
- CORS protection
- Input validation using Zod schemas
