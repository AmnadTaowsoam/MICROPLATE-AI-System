import { Client } from 'minio';
import { Readable } from 'stream';

export class MinioService {
  private client: Client;
  private bucketName: string;

  constructor() {
    // Parse endpoint to extract hostname and port
    const endpoint = process.env['OBJECT_STORAGE_ENDPOINT'] || 'http://minio:9000';
    const url = new URL(endpoint);
    
    this.client = new Client({
      endPoint: url.hostname,
      port: parseInt(url.port || '9000'),
      useSSL: url.protocol === 'https:',
      accessKey: process.env['OBJECT_STORAGE_ACCESS_KEY'] || 'minioadmin',
      secretKey: process.env['OBJECT_STORAGE_SECRET_KEY'] || 'minioadmin123',
    });

    this.bucketName = process.env['OBJECT_STORAGE_BUCKET_INTERFACE'] || 'interface-file';
  }

  async initialize(): Promise<void> {
    try {
      // Check if bucket exists, create if not
      const bucketExists = await this.client.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        console.log(`Created bucket: ${this.bucketName}`);
      }
      console.log(`Minio service initialized with bucket: ${this.bucketName}`);
    } catch (error) {
      console.error('Failed to initialize Minio service:', error);
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
      
      console.log(`File uploaded successfully: ${objectName}`);
      return objectName;
    } catch (error) {
      console.error(`Failed to upload file ${objectName}:`, error);
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
      
      console.log(`Stream uploaded successfully: ${objectName}`);
      return objectName;
    } catch (error) {
      console.error(`Failed to upload stream ${objectName}:`, error);
      throw error;
    }
  }

  async getFileUrl(objectName: string): Promise<string> {
    try {
      // Use direct MinIO API URL for frontend access
      return `http://localhost:9000/${this.bucketName}/${objectName}`;
    } catch (error) {
      console.error(`Failed to get file URL for ${objectName}:`, error);
      throw error;
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, objectName);
      console.log(`File deleted successfully: ${objectName}`);
    } catch (error) {
      console.error(`Failed to delete file ${objectName}:`, error);
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
      console.error('Failed to list files:', error);
      throw error;
    }
  }
}

export const minioService = new MinioService();
