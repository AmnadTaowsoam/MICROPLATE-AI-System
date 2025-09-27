/**
 * Shared types for InterfaceFile that can be used by other services
 * without requiring the full Prisma model
 */

export interface InterfaceFileData {
  id: string;
  sampleNo: string;
  fileName: string;
  filePath: string;
  fileSize: string | undefined;
  status: 'pending' | 'generated' | 'delivered' | 'failed';
  generatedAt: Date | undefined;
  deliveredAt: Date | undefined;
  errorMsg: string | undefined;
  createdBy: string | undefined;
  createdAt: Date;
}

export interface InterfaceFileCreateInput {
  sampleNo: string;
  fileName: string;
  filePath: string;
  fileSize?: bigint;
  status?: string;
  createdBy?: string;
}

export interface InterfaceFileUpdateInput {
  fileName?: string;
  filePath?: string;
  fileSize?: bigint;
  status?: string;
  generatedAt?: Date;
  deliveredAt?: Date;
  errorMsg?: string;
}

export interface InterfaceFileQuery {
  sampleNo?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface InterfaceFileResponse {
  success: boolean;
  data?: InterfaceFileData | InterfaceFileData[];
  error?: {
    code: string;
    message: string;
  };
}
