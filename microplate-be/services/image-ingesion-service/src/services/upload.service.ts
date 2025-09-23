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

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: relPath,
    Body: params.buffer,
    ContentType: detectedMime
  }));

  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: relPath }),
    { expiresIn: storageConfig.s3.signedUrlExpiry }
  );

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
    signedUrl,
    urlExpiresAt: new Date(Date.now() + storageConfig.s3.signedUrlExpiry * 1000).toISOString(),
    description: params.description || ''
  };
}


