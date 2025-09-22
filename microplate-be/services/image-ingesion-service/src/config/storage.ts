import { promises as fs } from 'fs';
import path from 'path';

export const storageConfig = {
  basePath: process.env.FILE_STORAGE_BASE_PATH || path.join(__dirname, '../../../shared-storage'),
  rawPath: process.env.FILE_STORAGE_RAW_IMAGES_PATH || path.join(__dirname, '../../../shared-storage/raw-images'),
  annotatedPath: process.env.FILE_STORAGE_ANNOTATED_IMAGES_PATH || path.join(__dirname, '../../../shared-storage/annotated-images'),
  tempPath: process.env.FILE_STORAGE_TEMP_FILES_PATH || path.join(__dirname, '../../../shared-storage/temp-files'),
  backupPath: process.env.FILE_STORAGE_BACKUP_PATH || path.join(__dirname, '../../../shared-storage/backup-images'),
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp,image/tiff').split(','),
  urls: {
    base: process.env.FILE_BASE_URL || 'http://localhost:6400/files',
    raw: process.env.FILE_RAW_IMAGES_URL || 'http://localhost:6400/files/raw-images',
    annotated: process.env.FILE_ANNOTATED_IMAGES_URL || 'http://localhost:6400/files/annotated-images'
  }
};

export async function ensureStorageDirectories(): Promise<void> {
  await fs.mkdir(storageConfig.basePath, { recursive: true });
  await fs.mkdir(storageConfig.rawPath, { recursive: true });
  await fs.mkdir(storageConfig.annotatedPath, { recursive: true });
  await fs.mkdir(storageConfig.tempPath, { recursive: true });
  await fs.mkdir(storageConfig.backupPath, { recursive: true });
}


