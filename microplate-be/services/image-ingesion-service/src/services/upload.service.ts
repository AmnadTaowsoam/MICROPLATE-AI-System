import path from 'path';
import { randomUUID } from 'crypto';
import mime from 'mime';
import { storageConfig } from '../config/storage';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export type FileType = 'raw' | 'annotated' | 'thumbnail';

export interface UploadParams {
  sampleNo: string;
  runId?: string;
  fileType: FileType;
  filename?: string;
  buffer: Buffer;
  mimeType?: string;
  description?: string;
}

export async function saveImage(params: UploadParams) {
  const detectedMime = params.mimeType || mime.getType(params.filename || '') || 'application/octet-stream';
  if (!storageConfig.allowedMimeTypes.includes(detectedMime)) {
    throw new Error(`Unsupported mime type: ${detectedMime}`);
  }

  const timestamp = new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14);
  const ext = mime.getExtension(detectedMime) || 'bin';
  const uuid = randomUUID();
  const subdir = params.runId ? path.join(params.sampleNo, params.runId) : params.sampleNo;
  const fileName = `${params.sampleNo}_${timestamp}_${uuid}${params.fileType === 'thumbnail' ? '_thumb' : ''}.${ext}`;
  const relPath = path.join(subdir, fileName).replace(/\\/g, '/');

  const bucket = params.fileType === 'annotated'
    ? storageConfig.s3.annotatedBucket
    : storageConfig.s3.rawBucket;

  const s3 = new S3Client({
    endpoint: storageConfig.s3.endpoint,
    region: storageConfig.s3.region,
    credentials: {
      accessKeyId: storageConfig.s3.accessKeyId,
      secretAccessKey: storageConfig.s3.secretAccessKey
    },
    forcePathStyle: storageConfig.s3.forcePathStyle
  });

  console.log(`Uploading to MinIO: bucket=${bucket}, key=${relPath}, size=${params.buffer.length}`);
  
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: relPath,
    Body: params.buffer,
    ContentType: detectedMime
  }));

  console.log(`Successfully uploaded to MinIO: ${bucket}/${relPath}`);

  // Generate signed URL using external endpoint
  const result = await generateSignedUrl(bucket, relPath);

  return {
    sampleNo: params.sampleNo,
    runId: params.runId ? Number(params.runId) : null,
    fileType: params.fileType,
    fileName,
    filePath: relPath,
    fileSize: params.buffer.length,
    mimeType: detectedMime,
    bucketName: params.fileType === 'annotated' ? 'annotated-images' : 'raw-images',
    objectKey: relPath,
    signedUrl: result.signedUrl,
    urlExpiresAt: result.expiresAt,
    description: params.description || ''
  };
}

/**
 * Generate a signed URL for an existing image in MinIO
 * @param bucket - Bucket name (e.g., 'raw-images' or 'annotated-images')
 * @param objectKey - Object key/path in the bucket
 * @param expiresIn - URL expiration time in seconds (default: from config)
 */
export async function generateSignedUrl(bucket: string, objectKey: string, expiresIn?: number) {
  // Use external endpoint for signed URL generation if available
  // This should be the URL accessible from browser (e.g., http://localhost:9000)
  const externalEndpoint = process.env.OBJECT_STORAGE_EXTERNAL_ENDPOINT || storageConfig.s3.endpoint;
  
  const s3 = new S3Client({
    endpoint: externalEndpoint,
    region: storageConfig.s3.region,
    credentials: {
      accessKeyId: storageConfig.s3.accessKeyId,
      secretAccessKey: storageConfig.s3.secretAccessKey
    },
    forcePathStyle: storageConfig.s3.forcePathStyle
  });

  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
    { expiresIn: expiresIn || storageConfig.s3.signedUrlExpiry }
  );

  console.log(`Generated signed URL for ${bucket}/${objectKey}: ${signedUrl}`);

  return {
    signedUrl,
    expiresAt: new Date(Date.now() + (expiresIn || storageConfig.s3.signedUrlExpiry) * 1000).toISOString(),
    bucket,
    objectKey
  };
}


