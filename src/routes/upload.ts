import { Router } from 'express';
import multer from 'multer';
import { optionalAuth } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { getSupabaseAdmin } from '../utils/supabase';
import { env } from '../config/env';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploadMaxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, GIF, WebP allowed'));
    }
    cb(null, true);
  },
});

const router = Router();

async function ensureBucket() {
  if (env.storageProvider !== 'supabase') return;
  const supabase = getSupabaseAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === env.supabaseStorageBucket)) {
    await supabase.storage.createBucket(env.supabaseStorageBucket, {
      public: true,
    });
  }
}

router.post('/alumni-photo', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return sendError(res, 400, 'No file uploaded');

    await ensureBucket();

    const ext = path.extname(req.file.originalname) || '.jpg';
    const fileName = `alumni/${uuid()}${ext}`;

    if (env.storageProvider === 'local') {
      const uploadDir = path.resolve(env.uploadDir);
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const alumniDir = path.join(uploadDir, 'alumni');
      if (!fs.existsSync(alumniDir)) fs.mkdirSync(alumniDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      const url = `/uploads/${fileName}`;
      return sendSuccess(res, { url }, 201);
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(env.supabaseStorageBucket)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) return sendError(res, 400, error.message);

    const { data: publicUrl } = supabase.storage.from(env.supabaseStorageBucket).getPublicUrl(fileName);

    sendSuccess(res, { url: publicUrl.publicUrl }, 201);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

export default router as Router;
