import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPER_ADMIN_EMAIL',
  'SUPER_ADMIN_PASSWORD',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const uploadMaxSizeKb = parseInt(process.env.UPLOAD_MAX_FILE_SIZE_KB || '500', 10);
if (isNaN(uploadMaxSizeKb) || uploadMaxSizeKb < 1) {
  throw new Error('UPLOAD_MAX_FILE_SIZE_KB must be a positive number');
}

export const env = {
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'alumni-photos',
  storageProvider: (process.env.STORAGE_PROVIDER || 'supabase') as 'supabase' | 'local',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../public/uploads'),
  uploadMaxFileSize: uploadMaxSizeKb * 1024,
  uploadMaxFileSizeKb: uploadMaxSizeKb,
};
