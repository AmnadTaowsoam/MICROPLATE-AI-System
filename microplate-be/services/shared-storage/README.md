# Shared Storage for Microplate AI

This directory contains the shared file storage system that replaces MinIO object storage with local file system.

## 📁 Folder Structure

```
shared-storage/
├── raw-images/              # Original captured images
│   ├── original/           # Raw camera captures
│   └── processed/          # Preprocessed images
├── annotated-images/        # AI prediction results
│   ├── predictions/        # Prediction overlay images
│   └── overlays/           # Bounding box overlays
├── interface-files/         # Labware integration files
│   ├── csv/               # CSV exports for Labware
│   └── exports/           # Other export formats
├── temp-files/             # Temporary processing files
│   ├── uploads/           # Temporary uploads
│   └── processing/        # Processing intermediates
├── setup-folders.sh       # Linux/Mac setup script
├── setup-folders.bat      # Windows setup script
└── README.md              # This file
```

## 🚀 Setup

### Windows
```cmd
# Run the setup script
setup-folders.bat
```

### Linux/Mac
```bash
# Make script executable and run
chmod +x setup-folders.sh
./setup-folders.sh
```

### Manual Setup
Create the folder structure manually if needed:
```bash
mkdir -p shared-storage/raw-images/original
mkdir -p shared-storage/raw-images/processed
mkdir -p shared-storage/annotated-images/predictions
mkdir -p shared-storage/annotated-images/overlays
mkdir -p shared-storage/interface-files/csv
mkdir -p shared-storage/interface-files/exports
mkdir -p shared-storage/temp-files/uploads
mkdir -p shared-storage/temp-files/processing
```

## 🔧 Configuration

### Environment Variables
Update your service configurations to use file storage instead of MinIO:

```env
# File Storage Configuration (instead of MinIO)
FILE_STORAGE_BASE_PATH=./shared-storage
FILE_STORAGE_RAW_IMAGES_PATH=./shared-storage/raw-images
FILE_STORAGE_ANNOTATED_IMAGES_PATH=./shared-storage/annotated-images
FILE_STORAGE_INTERFACE_FILES_PATH=./shared-storage/interface-files
FILE_STORAGE_TEMP_FILES_PATH=./shared-storage/temp-files

# File URLs (for serving files via HTTP)
FILE_BASE_URL=http://localhost:6400/files
FILE_RAW_IMAGES_URL=http://localhost:6400/files/raw-images
FILE_ANNOTATED_IMAGES_URL=http://localhost:6400/files/annotated-images
FILE_INTERFACE_FILES_URL=http://localhost:6400/files/interface-files
```

### Service Configuration
Each service should be configured to use the file storage paths:

#### Image Ingestion Service
```typescript
// Instead of MinIO client, use file system
import { promises as fs } from 'fs';
import path from 'path';

const config = {
  storage: {
    basePath: process.env.FILE_STORAGE_BASE_PATH || './shared-storage',
    rawImagesPath: process.env.FILE_STORAGE_RAW_IMAGES_PATH || './shared-storage/raw-images',
    annotatedImagesPath: process.env.FILE_STORAGE_ANNOTATED_IMAGES_PATH || './shared-storage/annotated-images',
  }
};
```

#### Labware Interface Service
```typescript
const config = {
  storage: {
    interfaceFilesPath: process.env.FILE_STORAGE_INTERFACE_FILES_PATH || './shared-storage/interface-files',
    exportsPath: process.env.FILE_STORAGE_INTERFACE_FILES_PATH + '/exports' || './shared-storage/interface-files/exports',
  }
};
```

## 📂 File Organization

### Raw Images
- **Original**: Camera captures with original resolution
- **Processed**: Preprocessed images ready for AI inference

### Annotated Images
- **Predictions**: Images with AI prediction overlays
- **Overlays**: Bounding box and detection overlays

### Interface Files
- **CSV**: CSV files for Labware integration
- **Exports**: Other export formats (Excel, JSON, etc.)

### Temp Files
- **Uploads**: Temporary files during upload process
- **Processing**: Intermediate files during AI processing

## 🔐 Security Considerations

1. **File Permissions**: Ensure proper file permissions are set
2. **Access Control**: Implement proper access control in your services
3. **Path Traversal**: Validate file paths to prevent directory traversal attacks
4. **File Size Limits**: Implement file size limits in upload handlers
5. **File Type Validation**: Validate file types before saving

## 🌐 Serving Files via HTTP

### Option 1: Static File Serving
Configure your API Gateway to serve static files:

```typescript
// In your gateway service
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../shared-storage'),
  prefix: '/files/',
  decorateReply: false
});
```

### Option 2: Dedicated File Service
Create a dedicated file service for serving files with proper authentication and authorization.

## 📊 Monitoring

### Disk Usage
Monitor disk usage of the shared storage:

```bash
# Check disk usage
du -sh shared-storage/

# Check disk usage by folder
du -sh shared-storage/*/
```

### File Count
Monitor number of files in each directory:

```bash
# Count files in each directory
find shared-storage/ -type f | wc -l
find shared-storage/raw-images/ -type f | wc -l
find shared-storage/annotated-images/ -type f | wc -l
```

## 🔄 Backup Strategy

### Automated Backup
Set up automated backups for the shared storage:

```bash
# Example backup script
#!/bin/bash
BACKUP_DIR="/backup/microplate-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"
cp -r shared-storage/ "$BACKUP_DIR/"
```

### Cloud Backup
Consider backing up to cloud storage services:
- AWS S3
- Google Cloud Storage
- Azure Blob Storage

## 🚀 Performance Optimization

### File System
- Use SSD storage for better performance
- Consider RAID configuration for redundancy
- Monitor disk I/O performance

### Caching
- Implement file caching in your services
- Use Redis for metadata caching
- Consider CDN for frequently accessed files

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**: Check file permissions and ownership
2. **Disk Space**: Monitor available disk space
3. **Path Not Found**: Verify folder structure is created correctly
4. **File Locking**: Handle concurrent access to files properly

### Debug Commands

```bash
# Check folder structure
ls -la shared-storage/
tree shared-storage/

# Check permissions
ls -la shared-storage/raw-images/
ls -la shared-storage/annotated-images/

# Check disk usage
df -h .
du -sh shared-storage/
```

## 📝 Migration from MinIO

If you were previously using MinIO, you can migrate files:

1. **Export from MinIO**: Download all files from MinIO buckets
2. **Organize Files**: Place files in appropriate shared-storage directories
3. **Update Services**: Modify service configurations to use file storage
4. **Test**: Verify all services work with file storage
5. **Cleanup**: Remove MinIO dependencies

## 🔧 Development vs Production

### Development
- Use local file system
- Simpler setup and debugging
- No additional services required

### Production
- Consider using cloud storage (S3, GCS, Azure)
- Implement proper backup strategies
- Monitor disk usage and performance
- Consider distributed file systems for scalability
