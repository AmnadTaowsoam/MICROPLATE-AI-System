import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { interfaceService } from '../services/interface.service';

const router = Router();

// Validation schemas
const generateInterfaceSchema = z.object({
  sampleNo: z.string().min(1, 'Sample number is required'),
});

const getInterfaceFilesSchema = z.object({
  sampleNo: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/labware/interface/generate:
 *   post:
 *     summary: Generate interface CSV file for a sample
 *     tags: [Interface]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sampleNo
 *             properties:
 *               sampleNo:
 *                 type: string
 *                 description: Sample number to generate interface file for
 *                 example: "TEST002"
 *     responses:
 *       200:
 *         description: Interface file generated successfully
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
 *                       type: number
 *                     status:
 *                       type: string
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                     downloadUrl:
 *                       type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validation = generateInterfaceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validation.error.errors,
        },
      });
      return;
    }

    const { sampleNo } = validation.data;
    const createdBy = (req as any).user?.id;

    // Generate interface file
    const result = await interfaceService.generateInterfaceFile({
      sampleNo,
      createdBy,
    });

    if (!result.success) {
      const statusCode = result.error?.code === 'SAMPLE_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Generate interface file error:', error);
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
 * /api/v1/labware/interface/files:
 *   get:
 *     summary: Get list of interface files
 *     tags: [Interface]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sampleNo
 *         schema:
 *           type: string
 *         description: Filter by sample number
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
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/files', async (req: Request, res: Response): Promise<void> => {
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

    const { sampleNo } = validation.data;

    // Get interface files
    const result = await interfaceService.getInterfaceFiles(sampleNo);

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Get interface files error:', error);
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
 * /api/v1/labware/interface/files/{id}:
 *   get:
 *     summary: Get interface file details
 *     tags: [Interface]
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
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     downloadUrl:
 *                       type: string
 *       404:
 *         description: Interface file not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/files/:id', async (req: Request, res: Response): Promise<void> => {
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

    // Get interface file
    const result = await interfaceService.getInterfaceFile(id);

    if (!result.success) {
      const statusCode = result.error?.code === 'FILE_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Get interface file error:', error);
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
 * /api/v1/labware/interface/files/{id}:
 *   delete:
 *     summary: Delete interface file
 *     tags: [Interface]
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
 *         description: Interface file deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Interface file not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/files/:id', async (req: Request, res: Response): Promise<void> => {
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

    // Delete interface file
    const result = await interfaceService.deleteInterfaceFile(id);

    if (!result.success) {
      const statusCode = result.error?.code === 'FILE_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Delete interface file error:', error);
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