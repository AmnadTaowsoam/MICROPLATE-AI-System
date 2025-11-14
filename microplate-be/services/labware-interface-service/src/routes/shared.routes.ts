/**
 * Shared routes for other services to access InterfaceFile data
 * These routes provide read-only access to interface file information
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sharedInterfaceService } from '../services/shared-interface.service';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const getInterfaceFilesSchema = z.object({
  sampleNo: z.string().optional(),
  status: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
});

/**
 * @swagger
 * /api/v1/labware/shared/interface-files:
 *   get:
 *     summary: Get interface files (shared access)
 *     tags: [Shared Interface]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sampleNo
 *         schema:
 *           type: string
 *         description: Filter by sample number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of interface files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       sampleNo:
 *                         type: string
 *                       fileName:
 *                         type: string
 *                       filePath:
 *                         type: string
 *                       fileSize:
 *                         type: string
 *                       status:
 *                         type: string
 *                       generatedAt:
 *                         type: string
 *                         format: date-time
 *                       deliveredAt:
 *                         type: string
 *                         format: date-time
 *                       errorMsg:
 *                         type: string
 *                       createdBy:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/interface-files', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const validation = getInterfaceFilesSchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validation.error.errors,
        },
      });
      return;
    }

    const query = validation.data;
    const files = await sharedInterfaceService.getInterfaceFiles(query as any);

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    logger.error('Get shared interface files error', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/labware/shared/interface-files/{id}:
 *   get:
 *     summary: Get interface file by ID (shared access)
 *     tags: [Shared Interface]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Interface file ID
 *     responses:
 *       200:
 *         description: Interface file details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     sampleNo:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                     filePath:
 *                       type: string
 *                     fileSize:
 *                       type: string
 *                     status:
 *                       type: string
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                     deliveredAt:
 *                       type: string
 *                       format: date-time
 *                     errorMsg:
 *                       type: string
 *                     createdBy:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Interface file not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/interface-files/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Interface file ID is required',
        },
      });
      return;
    }

    const file = await sharedInterfaceService.getInterfaceFile(id);

    if (!file) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Interface file not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    logger.error('Get shared interface file error', { error, params: req.params });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/labware/shared/interface-files/sample/{sampleNo}:
 *   get:
 *     summary: Get interface files by sample number (shared access)
 *     tags: [Shared Interface]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sampleNo
 *         required: true
 *         schema:
 *           type: string
 *         description: Sample number
 *     responses:
 *       200:
 *         description: List of interface files for the sample
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/interface-files/sample/:sampleNo', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sampleNo } = req.params;

    if (!sampleNo) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Sample number is required',
        },
      });
      return;
    }

    const files = await sharedInterfaceService.getInterfaceFilesBySample(sampleNo);

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    logger.error('Get shared interface files by sample error', { error, params: req.params, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/labware/shared/interface-files/statistics:
 *   get:
 *     summary: Get interface file statistics (shared access)
 *     tags: [Shared Interface]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Interface file statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     byStatus:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     bySample:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/interface-files/statistics', async (req: Request, res: Response): Promise<void> => {
  try {
    const statistics = await sharedInterfaceService.getStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    logger.error('Get shared interface statistics error', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

export default router;
