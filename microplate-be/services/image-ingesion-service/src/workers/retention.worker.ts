import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { storageConfig, ensureStorageDirectories } from '../config/storage';
import { publishLog } from '../services/event-bus.service';

dotenv.config();

const settings = {
  checkIntervalMs: Number(process.env.RETENTION_CHECK_INTERVAL_MS || 60 * 60 * 1000),
  moveAfterDays: Number(process.env.RETENTION_MOVE_DAYS || 30),
  deleteAfterDays: Number(process.env.RETENTION_DELETE_DAYS || 90)
};

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: any[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

async function moveOldFilesToBackup(sourceBase: string, label: 'raw-images' | 'annotated-images') {
  const threshold = Date.now() - daysToMs(settings.moveAfterDays);
  for await (const filePath of walk(sourceBase)) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs <= threshold) {
        const rel = path.relative(sourceBase, filePath);
        const dest = path.join(storageConfig.backupPath, label, rel);
        await ensureDir(path.dirname(dest));
        await fs.rename(filePath, dest);
        console.log(`[retention] moved -> ${dest}`);
        publishLog({ level: 'info', event: 'retention_moved', meta: { from: filePath, to: dest } }).catch(() => {});
      }
    } catch (err) {
      console.error('[retention] move error', err);
      publishLog({ level: 'error', event: 'retention_move_error', message: String(err) }).catch(() => {});
    }
  }
}

async function deleteVeryOldBackups() {
  const threshold = Date.now() - daysToMs(settings.deleteAfterDays);
  for await (const filePath of walk(storageConfig.backupPath)) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs <= threshold) {
        await fs.unlink(filePath);
        console.log(`[retention] deleted -> ${filePath}`);
        publishLog({ level: 'info', event: 'retention_deleted', meta: { filePath } }).catch(() => {});
      }
    } catch (err) {
      console.error('[retention] delete error', err);
      publishLog({ level: 'error', event: 'retention_delete_error', message: String(err) }).catch(() => {});
    }
  }
}

async function removeEmptyDirs(dir: string) {
  let entries: any[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(entries.filter(e => e.isDirectory()).map(e => removeEmptyDirs(path.join(dir, e.name))));
  const after = await fs.readdir(dir);
  if (after.length === 0) {
    try { await fs.rmdir(dir); } catch {}
  }
}

async function runOnce() {
  await ensureStorageDirectories();
  await moveOldFilesToBackup(storageConfig.rawPath, 'raw-images');
  await moveOldFilesToBackup(storageConfig.annotatedPath, 'annotated-images');
  await deleteVeryOldBackups();
  await removeEmptyDirs(storageConfig.rawPath);
  await removeEmptyDirs(storageConfig.annotatedPath);
  await removeEmptyDirs(storageConfig.backupPath);
}

async function main() {
  console.log('[retention] worker started');
  publishLog({ level: 'info', event: 'retention_started' }).catch(() => {});
  await runOnce();
  setInterval(runOnce, settings.checkIntervalMs).unref();
}

main().catch(err => {
  console.error('[retention] fatal', err);
  process.exit(1);
});


