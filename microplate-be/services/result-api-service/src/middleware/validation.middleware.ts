import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';
import { createError } from '@/utils/errors';
import { logger } from '@/utils/logger';

// Generic validation middleware
export const validateSchema = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request data based on the schema
      const validationResult = schema.safeParse({
        body: request.body,
        query: request.query,
        params: request.params,
      });

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code,
        }));

        logger.warn('Validation failed', { 
          requestId: request.id,
          errors,
          url: request.url,
          method: request.method
        });

        throw createError.validation('Validation failed', errors);
      }

      // Replace request data with validated data
      const validatedData = validationResult.data;
      
      if (validatedData.body) {
        request.body = validatedData.body;
      }
      if (validatedData.query) {
        request.query = validatedData.query;
      }
      if (validatedData.params) {
        request.params = validatedData.params;
      }

    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn('Zod validation failed', { 
          requestId: request.id,
          errors,
          url: request.url,
          method: request.method
        });

        throw createError.validation('Validation failed', errors);
      }
      throw error;
    }
  };
};

// Body validation middleware
export const validateBody = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validationResult = schema.safeParse(request.body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code,
        }));

        logger.warn('Body validation failed', { 
          requestId: request.id,
          errors,
          url: request.url,
          method: request.method
        });

        throw createError.validation('Request body validation failed', errors);
      }

      request.body = validationResult.data;

    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw createError.validation('Request body validation failed', errors);
      }
      throw error;
    }
  };
};

// Query parameters validation middleware
export const validateQuery = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validationResult = schema.safeParse(request.query);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code,
        }));

        logger.warn('Query validation failed', { 
          requestId: request.id,
          errors,
          url: request.url,
          method: request.method
        });

        throw createError.validation('Query parameters validation failed', errors);
      }

      request.query = validationResult.data;

    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw createError.validation('Query parameters validation failed', errors);
      }
      throw error;
    }
  };
};

// URL parameters validation middleware
export const validateParams = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validationResult = schema.safeParse(request.params);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code,
        }));

        logger.warn('Params validation failed', { 
          requestId: request.id,
          errors,
          url: request.url,
          method: request.method
        });

        throw createError.validation('URL parameters validation failed', errors);
      }

      request.params = validationResult.data;

    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw createError.validation('URL parameters validation failed', errors);
      }
      throw error;
    }
  };
};

// Headers validation middleware
export const validateHeaders = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validationResult = schema.safeParse(request.headers);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code,
        }));

        logger.warn('Headers validation failed', { 
          requestId: request.id,
          errors,
          url: request.url,
          method: request.method
        });

        throw createError.validation('Headers validation failed', errors);
      }

      request.headers = validationResult.data;

    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw createError.validation('Headers validation failed', errors);
      }
      throw error;
    }
  };
};

// Custom validation middleware for specific use cases
export const validateSampleNo = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const sampleNo = (request.params as any)?.sampleNo;
  
  if (!sampleNo) {
    throw createError.validation('Sample number is required');
  }

  if (typeof sampleNo !== 'string' || sampleNo.length === 0) {
    throw createError.validation('Sample number must be a non-empty string');
  }

  if (sampleNo.length > 50) {
    throw createError.validation('Sample number must be 50 characters or less');
  }

  // Additional validation logic can be added here
  // e.g., format validation, existence check, etc.
};

export const validateRunId = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const runId = (request.params as any)?.runId;
  
  if (!runId) {
    throw createError.validation('Run ID is required');
  }

  const parsedRunId = parseInt(runId, 10);
  
  if (isNaN(parsedRunId) || parsedRunId <= 0) {
    throw createError.validation('Run ID must be a positive integer');
  }

  // Update the params with the parsed value
  (request.params as any).runId = parsedRunId;
};

// Pagination validation middleware
export const validatePagination = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const query = request.query as any;
  
  // Set defaults
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  
  // Validate bounds
  if (page < 1) {
    throw createError.validation('Page must be greater than 0');
  }
  
  if (limit < 1 || limit > 100) {
    throw createError.validation('Limit must be between 1 and 100');
  }

  // Update query with validated values
  query.page = page;
  query.limit = limit;
};

// Date range validation middleware
export const validateDateRange = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const query = request.query as any;
  
  if (query.dateFrom) {
    const dateFrom = new Date(query.dateFrom);
    if (isNaN(dateFrom.getTime())) {
      throw createError.validation('Invalid dateFrom format. Use ISO 8601 format.');
    }
    query.dateFrom = dateFrom;
  }
  
  if (query.dateTo) {
    const dateTo = new Date(query.dateTo);
    if (isNaN(dateTo.getTime())) {
      throw createError.validation('Invalid dateTo format. Use ISO 8601 format.');
    }
    query.dateTo = dateTo;
  }
  
  // Validate date range
  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    throw createError.validation('dateFrom must be before dateTo');
  }
};

// Sanitization middleware
export const sanitizeInput = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Sanitize string inputs to prevent XSS
  const sanitizeString = (str: any): any => {
    if (typeof str === 'string') {
      return str.trim().replace(/[<>]/g, '');
    }
    if (typeof str === 'object' && str !== null) {
      if (Array.isArray(str)) {
        return str.map(sanitizeString);
      }
      const sanitized: any = {};
      for (const [key, value] of Object.entries(str)) {
        sanitized[key] = sanitizeString(value);
      }
      return sanitized;
    }
    return str;
  };

  if (request.body) {
    request.body = sanitizeString(request.body);
  }
  
  if (request.query) {
    request.query = sanitizeString(request.query);
  }
  
  if (request.params) {
    request.params = sanitizeString(request.params);
  }
};

// Request size validation middleware
export const validateRequestSize = (maxSize: number = 1024 * 1024) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSize) {
      throw createError.validation(`Request size exceeds maximum allowed size of ${maxSize} bytes`);
    }
  };
};
