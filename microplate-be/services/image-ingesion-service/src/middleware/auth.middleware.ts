import { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (String(process.env.DISABLE_AUTH || '').toLowerCase() === 'true') {
    return;
  }

  const auth = request.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' } });
  }

  const token = auth.slice('Bearer '.length).trim();
  if (!token) {
    return reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }

  // Trust the API Gateway's JWT verification. Optionally add local verification in future.
}


