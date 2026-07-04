import './config/env';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';

import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import alumniRoutes from './routes/alumni';
import exportRoutes from './routes/export';
import uploadRoutes from './routes/upload';
import wilayahRoutes from './routes/wilayah';
import countryRoutes from './routes/countries';
import adminRoutes from './routes/admins';
import settingsRoutes from './routes/settings';
import pageRoutes from './routes/pages';
import { errorHandler } from './middleware/error-handler';
import { getSupabaseAdmin } from './utils/supabase';
import { prisma } from './utils/db';
import { authProvider } from './middleware/auth';
import { env } from './config/env';
import type { Express } from 'express';

const app: Express = express();
const PORT = Number(process.env.PORT) || 3000;

(async () => {
  if (env.storageProvider !== 'supabase') return;
  const sb = getSupabaseAdmin();
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.some((b) => b.name === env.supabaseStorageBucket)) {
    await sb.storage.createBucket(env.supabaseStorageBucket, { public: true });
  }
})().catch(() => {});

(async () => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) return;

  if (authProvider === 'local') {
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (!existing) {
      const hashed = await bcrypt.hash(password, 10);
      await prisma.admin.create({
        data: { email, name: 'Super Admin', role: 'super_admin', isBuiltin: true, password: hashed },
      });
      console.log('Super admin seeded (local auth)');
    }
    return;
  }

  const sb = getSupabaseAdmin();

  const { data: authUsers } = await sb.auth.admin.listUsers();
  let authUser = authUsers.users.find(u => u.email === email);

  if (!authUser) {
    const { error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'super_admin', full_name: 'Super Admin' },
    });
    if (error) console.error('Failed to seed super admin:', error.message);
  } else {
    await sb.auth.admin.updateUserById(authUser.id, {
      password,
      user_metadata: { ...authUser.user_metadata, role: 'super_admin' },
    });
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (!existing) {
    await prisma.admin.create({
      data: { email, name: 'Super Admin', role: 'super_admin', isBuiltin: true },
    });
  }
})().catch(() => {});

// Seed default settings
(async () => {
  const count = await prisma.setting.count();
  if (count === 0) {
    const defaults = [
      { key: 'site_name', value: 'AlumniLink' },
      { key: 'site_description', value: 'Alumni Directory and Tracer Study Platform' },
      { key: 'site_title', value: 'AlumniLink \u2014 Alumni Directory' },
      { key: 'favicon_url', value: '' },
      { key: 'logo_url', value: '' },
      { key: 'theme_preset', value: 'default' },
      { key: 'theme_primary', value: '#2563eb' },
      { key: 'theme_gradient_from', value: '#2563eb' },
      { key: 'theme_gradient_to', value: '#2dd4bf' },
    ];
    await prisma.setting.createMany({ data: defaults });
    console.log('Default settings seeded');
  }
})().catch(() => {});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

if (env.storageProvider === 'local') {
  app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads')));
}

app.use('/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/alumni', alumniRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/wilayah', wilayahRoutes);
app.use('/api/v1/countries', countryRoutes);
app.use('/api/v1/admins', adminRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/', pageRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`AlumniLink running on http://localhost:${PORT}`);
});

export default app;
