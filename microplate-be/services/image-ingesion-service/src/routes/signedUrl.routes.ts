import { Router, Request, Response } from 'express';
import { generateSignedUrl } from '../services/upload.service';

export const signedUrlRoutes = (): Router => {
  const router = Router();

  /**
   * POST /api/v1/signed-urls
   * Generate a signed URL for an existing image in MinIO
   * 
   * Body:
   * - bucket: string (required) - Bucket name (e.g., 'raw-images' or 'annotated-images')
   * - objectKey: string (required) - Object key/path in the bucket
   * - expiresIn: number (optional) - URL expiration time in seconds
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { bucket, objectKey, expiresIn } = req.body;

      if (!bucket || !objectKey) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'bucket and objectKey are required'
          }
        });
      }

      // Validate bucket name
      if (!['raw-images', 'annotated-images'].includes(bucket)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BUCKET',
            message: 'bucket must be either "raw-images" or "annotated-images"'
          }
        });
      }

      const result = await generateSignedUrl(bucket, objectKey, expiresIn);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SIGNED_URL_ERROR',
          message: 'Failed to generate signed URL'
        }
      });
    }
  });

  /**
   * POST /api/v1/signed-urls/batch
   * Generate signed URLs for multiple images
   * 
   * Body:
   * - images: Array<{bucket: string, objectKey: string}>
   * - expiresIn: number (optional) - URL expiration time in seconds
   */
  router.post('/batch', async (req: Request, res: Response) => {
    try {
      const { images, expiresIn } = req.body;

      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'images must be a non-empty array'
          }
        });
      }

      // Validate all entries
      for (const img of images) {
        if (!img.bucket || !img.objectKey) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_REQUIRED_FIELDS',
              message: 'Each image must have bucket and objectKey'
            }
          });
        }

        if (!['raw-images', 'annotated-images'].includes(img.bucket)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_BUCKET',
              message: 'bucket must be either "raw-images" or "annotated-images"'
            }
          });
        }
      }

      // Generate signed URLs for all images
      const results = await Promise.all(
        images.map(img => 
          generateSignedUrl(img.bucket, img.objectKey, expiresIn)
            .catch(error => ({
              error: error.message,
              bucket: img.bucket,
              objectKey: img.objectKey
            }))
        )
      );

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error generating batch signed URLs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_SIGNED_URL_ERROR',
          message: 'Failed to generate signed URLs'
        }
      });
    }
  });

  return router;
};

