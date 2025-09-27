import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { databaseService } from '../services/database.service';
import { publishLog } from '../services/event-bus.service';

interface RetentionSettings {
  checkIntervalMs: number;
  deleteAfterDays: number;
  dryRun: boolean;
}

const settings: RetentionSettings = {
  checkIntervalMs: Number(process.env.MINIO_RETENTION_CHECK_INTERVAL_MS || 24 * 60 * 60 * 1000), // 24 hours
  deleteAfterDays: Number(process.env.MINIO_RETENTION_DELETE_DAYS || 60), // 60 days
  dryRun: process.env.MINIO_RETENTION_DRY_RUN === 'true'
};

// Initialize S3 client for MinIO
const s3Client = new S3Client({
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT || 'http://minio:9000',
  region: process.env.OBJECT_STORAGE_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY || 'minioadmin123'
  },
  forcePathStyle: true
});

const buckets = [
  process.env.OBJECT_STORAGE_BUCKET_RAW || 'raw-images',
  process.env.OBJECT_STORAGE_BUCKET_ANNOTATED || 'annotated-images'
];

function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

async function listObjectsInBucket(bucketName: string, continuationToken?: string): Promise<any[]> {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    ContinuationToken: continuationToken,
    MaxKeys: 1000
  });

  const response = await s3Client.send(command);
  let objects = response.Contents || [];

  if (response.NextContinuationToken) {
    const moreObjects = await listObjectsInBucket(bucketName, response.NextContinuationToken);
    objects = objects.concat(moreObjects);
  }

  return objects;
}

async function deleteObjectFromMinIO(bucketName: string, objectKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: objectKey
  });

  await s3Client.send(command);
}

async function deleteImageFileRecord(imageFileId: number): Promise<void> {
  await databaseService.deleteImageFile(imageFileId);
}

async function processBucket(bucketName: string): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;
  const threshold = Date.now() - daysToMs(settings.deleteAfterDays);

  console.log(`[minio-retention] Processing bucket: ${bucketName}`);

  try {
    const objects = await listObjectsInBucket(bucketName);
    
    for (const object of objects) {
      if (!object.Key || !object.LastModified) continue;

      const lastModified = new Date(object.LastModified).getTime();
      
      if (lastModified <= threshold) {
        try {
          // Find corresponding database record
          const imageFile = await databaseService.getImageFilesByBucketAndObjectKey(bucketName, object.Key);

          if (settings.dryRun) {
            console.log(`[minio-retention] DRY RUN: Would delete ${bucketName}/${object.Key} (${object.LastModified})`);
            if (imageFile) {
              console.log(`[minio-retention] DRY RUN: Would delete database record ID: ${imageFile.id}`);
            }
          } else {
            // Delete from MinIO
            await deleteObjectFromMinIO(bucketName, object.Key);
            console.log(`[minio-retention] Deleted from MinIO: ${bucketName}/${object.Key}`);

            // Delete from database
            if (imageFile) {
              await deleteImageFileRecord(imageFile.id);
              console.log(`[minio-retention] Deleted database record ID: ${imageFile.id}`);
            }

            // Log the deletion
            await publishLog({
              level: 'info',
              event: 'minio_retention_deleted',
              meta: {
                bucketName,
                objectKey: object.Key,
                lastModified: object.LastModified,
                imageFileId: imageFile?.id || null
              }
            }).catch(() => {});

            deleted++;
          }
        } catch (error) {
          console.error(`[minio-retention] Error deleting ${bucketName}/${object.Key}:`, error);
          await publishLog({
            level: 'error',
            event: 'minio_retention_error',
            message: `Failed to delete ${bucketName}/${object.Key}: ${String(error)}`
          }).catch(() => {});
          errors++;
        }
      }
    }
  } catch (error) {
    console.error(`[minio-retention] Error processing bucket ${bucketName}:`, error);
    await publishLog({
      level: 'error',
      event: 'minio_retention_bucket_error',
      message: `Failed to process bucket ${bucketName}: ${String(error)}`
    }).catch(() => {});
    errors++;
  }

  return { deleted, errors };
}

async function runRetentionCheck(): Promise<void> {
  console.log(`[minio-retention] Starting retention check (delete files older than ${settings.deleteAfterDays} days)`);
  
  if (settings.dryRun) {
    console.log('[minio-retention] DRY RUN MODE - No files will be actually deleted');
  }

  await publishLog({
    level: 'info',
    event: 'minio_retention_started',
    meta: {
      deleteAfterDays: settings.deleteAfterDays,
      dryRun: settings.dryRun
    }
  }).catch(() => {});

  let totalDeleted = 0;
  let totalErrors = 0;

  for (const bucketName of buckets) {
    const result = await processBucket(bucketName);
    totalDeleted += result.deleted;
    totalErrors += result.errors;
  }

  console.log(`[minio-retention] Retention check completed. Deleted: ${totalDeleted}, Errors: ${totalErrors}`);

  await publishLog({
    level: 'info',
    event: 'minio_retention_completed',
    meta: {
      totalDeleted,
      totalErrors,
      deleteAfterDays: settings.deleteAfterDays,
      dryRun: settings.dryRun
    }
  }).catch(() => {});
}

async function main(): Promise<void> {
  console.log('[minio-retention] MinIO retention worker started');
  console.log(`[minio-retention] Settings:`, {
    checkIntervalMs: settings.checkIntervalMs,
    deleteAfterDays: settings.deleteAfterDays,
    dryRun: settings.dryRun
  });

  // Connect to database
  await databaseService.connect();

  // Run initial check
  await runRetentionCheck();

  // Schedule periodic checks
  setInterval(runRetentionCheck, settings.checkIntervalMs);

  console.log(`[minio-retention] Worker scheduled to run every ${settings.checkIntervalMs / 1000 / 60} minutes`);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('[minio-retention] Received SIGINT, shutting down gracefully...');
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[minio-retention] Received SIGTERM, shutting down gracefully...');
  await databaseService.disconnect();
  process.exit(0);
});

main().catch(error => {
  console.error('[minio-retention] Fatal error:', error);
  process.exit(1);
});
