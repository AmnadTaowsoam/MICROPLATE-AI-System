import { FastifyRequest, FastifyReply } from 'fastify';

export const requestLogger = async (request: FastifyRequest, _reply: FastifyReply) => {
  const startTime = Date.now();

  // Add request ID to request object
  (request as any).requestId = request.id;

  // Log request start
  request.log.info({
    requestId: request.id,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    timestamp: new Date().toISOString()
  }, 'Request started');

  // Store start time for response logging
  (request as any).startTime = startTime;
};
