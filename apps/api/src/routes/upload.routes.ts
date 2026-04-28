import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(12).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin';
    cb(null, `${Date.now()}-${id}${ext}`);
  },
});

const upload = multer({
  storage,
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
  return res.status(201).json({
    url: `/uploads/files/${file.filename}`,
    filename: file.filename,
    size: file.size,
    mime: file.mimetype,
  });
});

// ── Public router (GET files for visitor-facing guide) ─────────────────────
export const uploadPublicRoutes = Router();

uploadPublicRoutes.get('/files/:filename', (req: Request, res: Response) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return res.status(400).end();
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).end();
  }
  return res.sendFile(filePath);
});
