import { prisma } from '../server';
import { csvService } from './csv.service';
import { minioService } from './minio.service';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface GenerateInterfaceRequest {
  sampleNo: string;
  createdBy?: string;
}

export interface GenerateInterfaceResponse {
  success: boolean;
  data?: {
    id: string;
    sampleNo: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    status: string;
    generatedAt: Date;
    downloadUrl?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class InterfaceService {
  async generateInterfaceFile(request: GenerateInterfaceRequest): Promise<GenerateInterfaceResponse> {
    let interfaceFileId: string | null = null;
    let tempFilePath: string | null = null;

    try {
      // Note: Sample validation should be done by calling prediction-db-service
      // For now, we'll proceed with interface file generation

      // Create interface file record
      const interfaceFile = await prisma.interfaceFile.create({
        data: {
          id: uuidv4(),
          sampleNo: request.sampleNo,
          fileName: `interface_${request.sampleNo}_${Date.now()}.csv`,
          filePath: '', // Will be updated after upload
          status: 'pending',
          createdBy: request.createdBy || null,
        },
      });

      interfaceFileId = interfaceFile.id;

      // Generate CSV file
      const csvResult = await csvService.generateInterfaceFile(request.sampleNo);
      tempFilePath = csvResult.filePath;

      // Update interface file with generated file info
      await prisma.interfaceFile.update({
        where: { id: interfaceFileId },
        data: {
          fileName: csvResult.fileName,
          fileSize: BigInt(csvResult.fileSize),
          status: 'generated',
          generatedAt: new Date(),
        },
      });

      // Upload to Minio
      const objectName = `interface-files/${request.sampleNo}/${csvResult.fileName}`;
      await minioService.uploadFile(objectName, csvResult.filePath);

      // Update interface file with Minio path
      await prisma.interfaceFile.update({
        where: { id: interfaceFileId },
        data: {
          filePath: objectName,
          status: 'delivered',
          deliveredAt: new Date(),
        },
      });

      // Get download URL
      const downloadUrl = await minioService.getFileUrl(objectName);

      // Cleanup temporary file
      await csvService.cleanupFile(tempFilePath);
      tempFilePath = null;

      return {
        success: true,
        data: {
          id: interfaceFile.id,
          sampleNo: interfaceFile.sampleNo,
          fileName: csvResult.fileName,
          filePath: objectName,
          fileSize: csvResult.fileSize,
          status: 'delivered',
          generatedAt: new Date(),
          downloadUrl,
        },
      };
    } catch (error) {
      logger.error('Failed to generate interface file', {
        error,
        sampleNo: request.sampleNo,
        interfaceFileId,
      });

      // Update interface file status to failed
      if (interfaceFileId) {
        try {
          await prisma.interfaceFile.update({
            where: { id: interfaceFileId },
            data: {
              status: 'failed',
              errorMsg: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } catch (updateError) {
          logger.error('Failed to update interface file status', {
            error: updateError,
            interfaceFileId,
            status: 'failed',
          });
        }
      }

      // Cleanup temporary file
      if (tempFilePath) {
        await csvService.cleanupFile(tempFilePath);
      }

      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate interface file',
        },
      };
    }
  }

  async getInterfaceFiles(sampleNo?: string): Promise<{
    success: boolean;
    data?: any[];
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const where = sampleNo ? { sampleNo } : {};
      
      const interfaceFiles = await prisma.interfaceFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to recent 100 files
      });

      return {
        success: true,
        data: interfaceFiles.map(file => ({
          id: file.id,
          sampleNo: file.sampleNo,
          fileName: file.fileName,
          filePath: file.filePath,
          fileSize: file.fileSize?.toString(),
          status: file.status,
          generatedAt: file.generatedAt,
          deliveredAt: file.deliveredAt,
          errorMsg: file.errorMsg,
          createdAt: file.createdAt,
        })),
      };
    } catch (error) {
      logger.error('Failed to get interface files', { error, sampleNo });
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch interface files',
        },
      };
    }
  }

  async getInterfaceFile(id: string): Promise<{
    success: boolean;
    data?: any;
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const interfaceFile = await prisma.interfaceFile.findUnique({
        where: { id },
      });

      if (!interfaceFile) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Interface file not found',
          },
        };
      }

      // Get download URL if file is delivered
      let downloadUrl: string | undefined;
      if (interfaceFile.status === 'delivered' && interfaceFile.filePath) {
        try {
          downloadUrl = await minioService.getFileUrl(interfaceFile.filePath);
        } catch (urlError) {
          logger.error('Failed to get download URL', {
            error: urlError,
            interfaceFileId: interfaceFile.id,
            filePath: interfaceFile.filePath,
          });
        }
      }

      return {
        success: true,
        data: {
          id: interfaceFile.id,
          sampleNo: interfaceFile.sampleNo,
          fileName: interfaceFile.fileName,
          filePath: interfaceFile.filePath,
          fileSize: interfaceFile.fileSize?.toString(),
          status: interfaceFile.status,
          generatedAt: interfaceFile.generatedAt,
          deliveredAt: interfaceFile.deliveredAt,
          errorMsg: interfaceFile.errorMsg,
          createdAt: interfaceFile.createdAt,
          downloadUrl,
        },
      };
    } catch (error) {
      logger.error('Failed to get interface file', { error, interfaceFileId: id });
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch interface file',
        },
      };
    }
  }

  async deleteInterfaceFile(id: string): Promise<{
    success: boolean;
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const interfaceFile = await prisma.interfaceFile.findUnique({
        where: { id },
      });

      if (!interfaceFile) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Interface file not found',
          },
        };
      }

      // Delete from Minio if file exists
      if (interfaceFile.filePath) {
        try {
          await minioService.deleteFile(interfaceFile.filePath);
        } catch (minioError) {
          logger.error('Failed to delete file from Minio', {
            error: minioError,
            filePath: interfaceFile.filePath,
          });
          // Continue with database deletion even if Minio deletion fails
        }
      }

      // Delete from database
      await prisma.interfaceFile.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete interface file', { error, interfaceFileId: id });
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete interface file',
        },
      };
    }
  }
}

export const interfaceService = new InterfaceService();
