import { Request, Response } from 'express';
import { storageConfig } from '../config/storage';
import { ensureBuckets } from '../services/s3.service';
import { saveImage } from '../services/upload.service';
import { publishLog } from '../services/event-bus.service';

export const imageRoutes = (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_FILE_UPLOADED',
        message: 'No file uploaded'
      }
    });
  }

  const sampleNo = req.body.sample_no?.trim();
  const runId = req.body.run_id?.trim();
  const fileType = (req.body.file_type || 'raw').trim();
  const description = req.body.description?.trim();

  if (!sampleNo) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_SAMPLE_NO',
        message: 'sample_no is required'
      }
    });
  }

  if (!['raw', 'annotated', 'thumbnail'].includes(fileType)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: 'invalid file_type'
      }
    });
  }

  saveImage({
    sampleNo,
    runId,
    fileType,
    buffer: file.buffer,
    filename: file.originalname,
    mimeType: file.mimetype,
    description
  })
    .then(data => {
      publishLog({
        level: 'info',
        event: 'image_uploaded',
        meta: { sampleNo, runId, fileType, fileName: data.fileName, size: data.fileSize }
      }).catch(() => {});

      res.status(201).json({ success: true, data });
    })
    .catch(error => {
      console.error('Error saving image:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: 'Failed to save image'
        }
      });
    });
};


