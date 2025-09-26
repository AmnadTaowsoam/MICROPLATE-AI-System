import { Request, Response, NextFunction } from 'express';
import { ApiError, ErrorResponse } from '@/types/result.types';

// Custom error classes
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, id });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

export class CacheError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'CACHE_ERROR', details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(`External service error (${service}): ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      ...details,
    });
  }
}

export class WebSocketError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'WEBSOCKET_ERROR', details);
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error,
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const requestId = (request as any).id || 'unknown';
  
  // Log the error
  console.error('Request error occurred:', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    requestId,
    method: request.method,
    url: request.url,
    statusCode: (error as any).statusCode || 500,
  });

  // Determine error response
  let statusCode = (error as any).statusCode || 500;
  let code = 'INTERNAL_ERROR';
  let message = error.message || 'Internal server error';
  let details: any = undefined;

  // Handle custom application errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  }
  // Handle validation errors
  else if ((error as any).validation) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = (error as any).validation;
  }
  // Handle JWT errors
  else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid or missing authentication token';
  }
  // Handle rate limit errors
  else if ((error as any).statusCode === 429) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests';
  }
  // Handle not found errors
  else if ((error as any).statusCode === 404) {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      requestId,
      timestamp: new Date(),
    },
  };

  // Send response
  response.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (request: Request, response: Response, next: NextFunction) => {
    return Promise.resolve(fn(request, response, next)).catch((error) => {
      errorHandler(error, request, response, next);
    });
  };
};

// Error factory functions
export const createError = {
  validation: (message: string, details?: any) => new ValidationError(message, details),
  notFound: (resource: string, id?: string | number) => new NotFoundError(resource, id),
  unauthorized: (message?: string) => new UnauthorizedError(message),
  forbidden: (message?: string) => new ForbiddenError(message),
  conflict: (message: string, details?: any) => new ConflictError(message, details),
  rateLimit: (message?: string) => new RateLimitError(message),
  database: (message: string, details?: any) => new DatabaseError(message, details),
  cache: (message: string, details?: any) => new CacheError(message, details),
  externalService: (service: string, message: string, details?: any) => 
    new ExternalServiceError(service, message, details),
  websocket: (message: string, details?: any) => new WebSocketError(message, details),
};

// Error response helpers
export const sendError = (response: Response, error: AppError) => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      requestId: (response as any).request?.id || 'unknown',
      timestamp: new Date(),
    },
  };

  response.status(error.statusCode).json(errorResponse);
};

export const sendSuccess = <T>(response: Response, data: T, statusCode: number = 200) => {
  response.status(statusCode).json({
    success: true,
    data,
  });
};

// Error logging helpers
export const logError = (error: Error, context?: any) => {
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

export const logAppError = (error: AppError, context?: any) => {
  console.error('Application error:', {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    context,
    timestamp: new Date().toISOString(),
  });
};
