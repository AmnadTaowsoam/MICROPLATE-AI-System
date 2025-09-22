import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import mime from 'mime';
import { storageConfig } from '../config/storage';

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
  const baseDir = params.fileType === 'annotated' ? storageConfig.annotatedPath : storageConfig.rawPath;
  const fileName = `${params.sampleNo}_${timestamp}_${uuid}${params.fileType === 'thumbnail' ? '_thumb' : ''}.${ext}`;
  const relPath = path.join(subdir, fileName).replace(/\\/g, '/');
  const fullPath = path.join(baseDir, subdir, fileName);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, params.buffer);

  const urlBase = params.fileType === 'annotated' ? storageConfig.urls.annotated : storageConfig.urls.raw;
  const publicUrl = `${urlBase}/${relPath}`;

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
    signedUrl: publicUrl,
    urlExpiresAt: null as unknown as string | null,
    description: params.description || ''
  };
}


