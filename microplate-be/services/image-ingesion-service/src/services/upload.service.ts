import path from 'path';
import { randomUUID } from 'crypto';
import { storageConfig } from '../config/storage';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

export type FileType = 'raw' | 'annotated' | 'thumbnail';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/tiff': 'tiff'
};

const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  tif: 'image/tiff',
  tiff: 'image/tiff'
};

const ALLOWED_MIME_SET = new Set(
  storageConfig.allowedMimeTypes.map((mime) => mime.trim().toLowerCase())
);

function resolveMimeType(
  filename?: string,
  providedMime?: string
): { mimeType: string; extension: string } {
  const normalizedProvided = providedMime?.trim().toLowerCase();
  const ext = filename ? path.extname(filename).toLowerCase().replace('.', '') : '';
  const inferredFromExt = ext ? EXTENSION_MIME_MAP[ext] : undefined;
  const mimeType = normalizedProvided || inferredFromExt || 'application/octet-stream';

  if (!ALLOWED_MIME_SET.has(mimeType)) {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  const extension = MIME_EXTENSION_MAP[mimeType] || ext || 'bin';
  return { mimeType, extension };
}

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
  const { mimeType, extension } = resolveMimeType(params.filename, params.mimeType);

  const timestamp = new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14);
  const uuid = randomUUID();
  const subdir = params.runId ? path.join(params.sampleNo, params.runId) : params.sampleNo;
  const fileName = `${params.sampleNo}_${timestamp}_${uuid}${
    params.fileType === 'thumbnail' ? '_thumb' : ''
  }.${extension}`;
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

  logger.info('Uploading image to MinIO', {
    bucket,
    objectKey: relPath,
    size: params.buffer.length,
    sampleNo: params.sampleNo,
    runId: params.runId,
    fileType: params.fileType,
  });
  
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: relPath,
    Body: params.buffer,
    ContentType: mimeType
  }));

  logger.info('Successfully uploaded image to MinIO', {
    bucket,
    objectKey: relPath,
    sampleNo: params.sampleNo,
    runId: params.runId,
    fileType: params.fileType,
  });

  // Generate signed URL using external endpoint
  const result = await generateSignedUrl(bucket, relPath);

  return {
    sampleNo: params.sampleNo,
    runId: params.runId ? Number(params.runId) : null,
    fileType: params.fileType,
    fileName,
    filePath: relPath,
    fileSize: params.buffer.length,
    mimeType,
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

  logger.debug('Generated signed URL for image', {
    bucket,
    objectKey,
    signedUrl,
    expiresIn: expiresIn || storageConfig.s3.signedUrlExpiry,
  });

  return {
    signedUrl,
    expiresAt: new Date(Date.now() + (expiresIn || storageConfig.s3.signedUrlExpiry) * 1000).toISOString(),
    bucket,
    objectKey
  };
}


