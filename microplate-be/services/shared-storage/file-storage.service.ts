// Example file storage service implementation
// This can be used in your services instead of MinIO client

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface FileStorageConfig {
  basePath: string;
  rawImagesPath: string;
  annotatedImagesPath: string;
  interfaceFilesPath: string;
  tempFilesPath: string;
  baseUrl: string;
}

export interface UploadResult {
  filename: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
}

export interface FileInfo {
  filename: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FileStorageService {
  private config: FileStorageConfig;

  constructor(config: FileStorageConfig) {
    this.config = config;
    this.ensureDirectoriesExist();
  }

  /**
   * Ensure all storage directories exist
   */
  private async ensureDirectoriesExist(): Promise<void> {
    const directories = [
      this.config.basePath,
      this.config.rawImagesPath,
      this.config.annotatedImagesPath,
      this.config.interfaceFilesPath,
      this.config.tempFilesPath,
      path.join(this.config.rawImagesPath, 'original'),
      path.join(this.config.rawImagesPath, 'processed'),
      path.join(this.config.annotatedImagesPath, 'predictions'),
      path.join(this.config.annotatedImagesPath, 'overlays'),
      path.join(this.config.interfaceFilesPath, 'csv'),
      path.join(this.config.interfaceFilesPath, 'exports'),
      path.join(this.config.tempFilesPath, 'uploads'),
      path.join(this.config.tempFilesPath, 'processing')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore error
      }
    }
  }

  /**
   * Generate unique filename
   */
  private generateUniqueFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const base = path.basename(originalFilename, ext);
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${base}_${timestamp}_${hash}${ext}`;
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    file: Buffer,
    originalFilename: string,
    category: 'raw-images' | 'annotated-images' | 'interface-files' | 'temp-files',
    subcategory?: string
  ): Promise<UploadResult> {
    const uniqueFilename = this.generateUniqueFilename(originalFilename);
    let targetPath: string;

    switch (category) {
      case 'raw-images':
        targetPath = subcategory 
          ? path.join(this.config.rawImagesPath, subcategory, uniqueFilename)
          : path.join(this.config.rawImagesPath, 'original', uniqueFilename);
        break;
      case 'annotated-images':
        targetPath = subcategory
          ? path.join(this.config.annotatedImagesPath, subcategory, uniqueFilename)
          : path.join(this.config.annotatedImagesPath, 'predictions', uniqueFilename);
        break;
      case 'interface-files':
        targetPath = subcategory
          ? path.join(this.config.interfaceFilesPath, subcategory, uniqueFilename)
          : path.join(this.config.interfaceFilesPath, 'csv', uniqueFilename);
        break;
      case 'temp-files':
        targetPath = subcategory
          ? path.join(this.config.tempFilesPath, subcategory, uniqueFilename)
          : path.join(this.config.tempFilesPath, 'uploads', uniqueFilename);
        break;
      default:
        throw new Error(`Invalid category: ${category}`);
    }

    // Ensure target directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    // Write file
    await fs.writeFile(targetPath, file);

    // Generate URL
    const relativePath = path.relative(this.config.basePath, targetPath);
    const url = `${this.config.baseUrl}/${relativePath.replace(/\\/g, '/')}`;

    return {
      filename: uniqueFilename,
      path: targetPath,
      url,
      size: file.length,
      mimetype: this.getMimeType(originalFilename)
    };
  }

  /**
   * Download file from storage
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore error
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      const relativePath = path.relative(this.config.basePath, filePath);
      const url = `${this.config.baseUrl}/${relativePath.replace(/\\/g, '/')}`;

      return {
        filename: path.basename(filePath),
        path: filePath,
        url,
        size: stats.size,
        mimetype: this.getMimeType(path.basename(filePath)),
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * List files in directory
   */
  async listFiles(
    category: 'raw-images' | 'annotated-images' | 'interface-files' | 'temp-files',
    subcategory?: string
  ): Promise<FileInfo[]> {
    let targetPath: string;

    switch (category) {
      case 'raw-images':
        targetPath = subcategory 
          ? path.join(this.config.rawImagesPath, subcategory)
          : this.config.rawImagesPath;
        break;
      case 'annotated-images':
        targetPath = subcategory
          ? path.join(this.config.annotatedImagesPath, subcategory)
          : this.config.annotatedImagesPath;
        break;
      case 'interface-files':
        targetPath = subcategory
          ? path.join(this.config.interfaceFilesPath, subcategory)
          : this.config.interfaceFilesPath;
        break;
      case 'temp-files':
        targetPath = subcategory
          ? path.join(this.config.tempFilesPath, subcategory)
          : this.config.tempFilesPath;
        break;
      default:
        throw new Error(`Invalid category: ${category}`);
    }

    try {
      const files = await fs.readdir(targetPath);
      const fileInfos: FileInfo[] = [];

      for (const file of files) {
        const filePath = path.join(targetPath, file);
        const fileInfo = await this.getFileInfo(filePath);
        if (fileInfo) {
          fileInfos.push(fileInfo);
        }
      }

      return fileInfos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate signed URL for file access (simple implementation)
   */
  async generateSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const relativePath = path.relative(this.config.basePath, filePath);
    return `${this.config.baseUrl}/${relativePath.replace(/\\/g, '/')}`;
  }

  /**
   * Copy file to different category
   */
  async copyFile(
    sourcePath: string,
    targetCategory: 'raw-images' | 'annotated-images' | 'interface-files' | 'temp-files',
    targetSubcategory?: string
  ): Promise<UploadResult> {
    const sourceBuffer = await this.downloadFile(sourcePath);
    const filename = path.basename(sourcePath);
    
    return this.uploadFile(sourceBuffer, filename, targetCategory, targetSubcategory);
  }

  /**
   * Move file to different location
   */
  async moveFile(
    sourcePath: string,
    targetCategory: 'raw-images' | 'annotated-images' | 'interface-files' | 'temp-files',
    targetSubcategory?: string
  ): Promise<UploadResult> {
    const result = await this.copyFile(sourcePath, targetCategory, targetSubcategory);
    await this.deleteFile(sourcePath);
    return result;
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.tiff': 'image/tiff',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    categoryStats: Record<string, { files: number; size: number }>;
  }> {
    const categories = ['raw-images', 'annotated-images', 'interface-files', 'temp-files'];
    let totalFiles = 0;
    let totalSize = 0;
    const categoryStats: Record<string, { files: number; size: number }> = {};

    for (const category of categories) {
      const files = await this.listFiles(category as any);
      const size = files.reduce((sum, file) => sum + file.size, 0);
      
      categoryStats[category] = {
        files: files.length,
        size
      };

      totalFiles += files.length;
      totalSize += size;
    }

    return {
      totalFiles,
      totalSize,
      categoryStats
    };
  }

  /**
   * Clean up temporary files older than specified days
   */
  async cleanupTempFiles(olderThanDays: number = 7): Promise<number> {
    const tempFiles = await this.listFiles('temp-files');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;
    for (const file of tempFiles) {
      if (file.createdAt < cutoffDate) {
        await this.deleteFile(file.path);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}
