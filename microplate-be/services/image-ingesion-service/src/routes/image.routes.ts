import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ensureStorageDirectories, storageConfig } from '../config/storage';
import { saveImage } from '../services/upload.service';
import { publishLog } from '../services/event-bus.service';

export async function registerImageRoutes(app: FastifyInstance) {

  app.post('/api/v1/images', async (request: FastifyRequest, reply: FastifyReply) => {
    const mp = await request.file();
    if (!mp) return reply.badRequest('No file uploaded');

    const { fields } = mp as any;
    const getField = (name: string): string => {
      const f = fields?.[name];
      if (!f) return '';
      if (Array.isArray(f)) return String(f[0]?.value ?? '');
      return String(f?.value ?? '');
    };

    const sampleNo = getField('sample_no').trim();
    const runId = getField('run_id').trim();
    const fileType = (getField('file_type') || 'raw').trim() as any;
    const description = getField('description').trim();

    if (!sampleNo) return reply.badRequest('sample_no is required');
    if (!['raw', 'annotated', 'thumbnail'].includes(fileType)) return reply.badRequest('invalid file_type');

    await ensureStorageDirectories();
    const buffer = await mp.toBuffer();

    const data = await saveImage({
      sampleNo,
      runId,
      fileType,
      buffer,
      filename: mp.filename,
      mimeType: mp.mimetype,
      description
    });

    publishLog({
      level: 'info',
      event: 'image_uploaded',
      meta: { sampleNo, runId, fileType, fileName: data.fileName, size: data.fileSize }
    }).catch(() => {});

    return reply.status(201).send({ success: true, data });
  });

  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async () => {
    try {
      await ensureStorageDirectories();
      return { status: 'ready' };
    } catch {
      return { status: 'not-ready' };
    }
  });
}


