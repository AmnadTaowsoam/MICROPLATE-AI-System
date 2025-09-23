import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { registerImageRoutes } from './routes/image.routes';
import { ensureBuckets } from './services/s3.service';

dotenv.config();

const app = Fastify({ logger: true });

app.register(sensible);
app.register(cors, { origin: true });
app.register(multipart, { limits: { fileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024) } });

const PORT = Number(process.env.PORT || 6402);

app.register(registerImageRoutes);

async function start() {
  await ensureBuckets();
  await app.listen({ port: PORT, host: '0.0.0.0' });
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});


