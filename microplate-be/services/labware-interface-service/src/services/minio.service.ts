import { Client } from 'minio';
import { Readable } from 'stream';
import { logger } from '@/utils/logger';

export class MinioService {
  private client: Client;
  private bucketName: string;
  private publicEndpoint: URL;
  private signedUrlExpiry: number;

  constructor() {
    // Parse endpoint to extract hostname and port
    const endpoint = process.env['OBJECT_STORAGE_ENDPOINT'] || 'http://minio:9000';
    const url = new URL(endpoint);
    const publicEndpoint = process.env['OBJECT_STORAGE_PUBLIC_ENDPOINT'] || 'http://localhost:9000';
    
    this.client = new Client({
      endPoint: url.hostname,
      port: parseInt(url.port || '9000'),
      useSSL: url.protocol === 'https:',
      accessKey: process.env['OBJECT_STORAGE_ACCESS_KEY'] || 'minioadmin',
      secretKey: process.env['OBJECT_STORAGE_SECRET_KEY'] || 'minioadmin123',
    });

    this.bucketName = process.env['OBJECT_STORAGE_BUCKET_INTERFACE'] || 'interface-file';
    this.publicEndpoint = new URL(publicEndpoint);
    this.signedUrlExpiry = parseInt(process.env['OBJECT_STORAGE_SIGNED_URL_TTL'] || '3600', 10);
  }

  async initialize(): Promise<void> {
    try {
      // Check if bucket exists, create if not
      const bucketExists = await this.client.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        logger.info(`Created bucket: ${this.bucketName}`);
      }
      logger.info(`Minio service initialized with bucket: ${this.bucketName}`);
    } catch (error) {
      logger.error('Failed to initialize Minio service', { error });
      throw error;
    }
  }

  async uploadFile(
    objectName: string,
    filePath: string,
    contentType: string = 'text/csv'
  ): Promise<string> {
    try {
      await this.client.fPutObject(
        this.bucketName,
        objectName,
        filePath,
        {
          'Content-Type': contentType,
        }
      );
      
      logger.info(`File uploaded successfully: ${objectName}`);
      return objectName;
    } catch (error) {
      logger.error(`Failed to upload file ${objectName}`, { error });
      throw error;
    }
  }

  async uploadStream(
    objectName: string,
    stream: Readable,
    size: number,
    contentType: string = 'text/csv'
  ): Promise<string> {
    try {
      await this.client.putObject(
        this.bucketName,
        objectName,
        stream,
        size,
        {
          'Content-Type': contentType,
        }
      );
      
      logger.info(`Stream uploaded successfully: ${objectName}`);
      return objectName;
    } catch (error) {
      logger.error(`Failed to upload stream ${objectName}`, { error });
      throw error;
    }
  }

  async getFileUrl(objectName: string): Promise<string> {
    try {
      const signedUrl = await this.client.presignedGetObject(
        this.bucketName,
        objectName,
        this.signedUrlExpiry,
      );

      const signedUrlObj = new URL(signedUrl);
      signedUrlObj.protocol = this.publicEndpoint.protocol;
      signedUrlObj.host = this.publicEndpoint.host;

      return signedUrlObj.toString();
    } catch (error) {
      logger.error(`Failed to get file URL for ${objectName}`, { error });
      throw error;
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, objectName);
      logger.info(`File deleted successfully: ${objectName}`);
    } catch (error) {
      logger.error(`Failed to delete file ${objectName}`, { error });
      throw error;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const objectsList: string[] = [];
      const stream = this.client.listObjects(this.bucketName, prefix, true);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (obj.name) {
            objectsList.push(obj.name);
          }
        });
        
        stream.on('error', reject);
        stream.on('end', () => resolve(objectsList));
      });
    } catch (error) {
      logger.error('Failed to list files', { error });
      throw error;
    }
  }
}

export const minioService = new MinioService();
