import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

// ── Storage strategy ──────────────────────────────────────────────────────
// We use memory storage and respond with a base64 data URL. This is the
// simplest fix to Railway's ephemeral filesystem: the cover image lives
// inside the Exhibition row in Postgres (durable) instead of /uploads on the
// container disk (gone after every redeploy). With a 5MB image cap the
// resulting data URL is ~6.7MB — fine for a single Exhibition row, and the
// dashboard already caches the response for 30s.
//
// Tradeoff: payload is larger than serving the image from disk, but the
// piloto has 1–2 exhibitions per museum so the overhead is negligible. If
// we ever need to scale we can swap memoryStorage for an S3/Supabase
// adapter without touching any callers.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não suportado. Use PNG, JPG ou WebP.'));
    }
    cb(null, true);
  },
});

// ── Authed router (POST upload) ────────────────────────────────────────────
export const uploadRoutes = Router();

uploadRoutes.post('/', upload.single('file'), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Arquivo ausente (campo "file")' });
  // Returning a data URL keeps the image self-contained in the response —
  // no second round-trip and survives container redeploys.
  const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  return res.status(201).json({
    url: dataUrl,
    size: file.size,
    mime: file.mimetype,
  });
});

// ── Public router (GET files for visitor-facing guide) ─────────────────────
// Kept around for backwards-compat with any old rows that still reference
// /uploads/files/<name>. New uploads are stored inline as data URLs so this
// path will see no new traffic. Safe to remove once the DB has been swept.
export const uploadPublicRoutes = Router();

const LEGACY_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');

uploadPublicRoutes.get('/files/:filename', (req: Request, res: Response) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(LEGACY_DIR, safeName);
  if (!filePath.startsWith(LEGACY_DIR)) {
    return res.status(400).end();
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).end();
  }
  return res.sendFile(filePath);
});
