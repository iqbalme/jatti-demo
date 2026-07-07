import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../utils/supabase';
import { prisma } from '../utils/db';
import { verifyToken, signToken } from '../utils/jwt';
import { authProvider } from '../middleware/auth';
import { env } from '../config/env';
import { loadSettings } from './settings';
import type { Request, Response, NextFunction } from 'express';
import type { Prisma } from '@prisma/client';

const router = Router();

function parseProducts(item: Record<string, unknown>): Record<string, unknown> {
  if (item && typeof item.products === 'string') {
    try { item.products = JSON.parse(item.products as string); } catch { item.products = []; }
  }
  return item;
}

async function loadUser(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.['sb-access-token'] as string | undefined;
  if (!token) return next();

  try {
    const decoded = verifyToken(token);
    if (decoded.source === 'alumni') {
      const alumni = await prisma.alumni.findUnique({ where: { id: decoded.id } });
      if (alumni) {
        res.locals.user = { id: alumni.id, email: alumni.email || '', role: 'user', fullName: alumni.name, source: 'alumni', photoUrl: alumni.photoUrl || null };
      }
    } else {
      const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
      if (admin) {
        res.locals.user = { id: admin.id, email: admin.email, role: admin.role, fullName: admin.name, source: 'admin', isBuiltin: admin.isBuiltin };
      }
    }
  } catch {}
  next();
}

function requirePageAuth(req: Request, res: Response, next: NextFunction) {
  if (!res.locals.user) return res.redirect('/login');
  next();
}

router.use(loadUser);
router.use(loadSettings);

router.get('/', (_req, res) => {
  res.render('pages/index');
});

router.get('/login', (req, res) => {
  if (res.locals.user) return res.redirect('/dashboard');
  res.render('pages/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (authProvider === 'local') {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (admin) {
      if (admin.password && await bcrypt.compare(password, admin.password)) {
        const token = signToken({ id: admin.id, email: admin.email, role: admin.role, source: 'admin' });
        res.cookie('sb-access-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        return res.redirect('/dashboard');
      }
      return res.render('pages/login', { error: 'Email atau password salah' });
    }
    const alumni = await prisma.alumni.findFirst({ where: { email, isActive: true } });
    if (alumni) {
      if (!alumni.password) {
        const h = await bcrypt.hash('user123', 10);
        await prisma.alumni.update({ where: { id: alumni.id }, data: { password: h } });
        alumni.password = h;
      }
      if (await bcrypt.compare(password, alumni.password)) {
        const token = signToken({ id: alumni.id, email: alumni.email || '', role: 'user', source: 'alumni' });
        res.cookie('sb-access-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        return res.redirect('/alumni/' + alumni.id);
      }
    }
    return res.render('pages/login', { error: 'Email atau password salah' });
  }

  const supabase = getSupabaseAdmin();

  if (email === superAdminEmail) {
    if (password !== superAdminPassword) {
      return res.render('pages/login', { error: 'Invalid credentials' });
    }

    const { data: authUsers } = await supabase.auth.admin.listUsers();
    let authUser = authUsers.users.find(u => u.email === email);

    if (!authUser) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { role: 'super_admin', full_name: 'Super Admin' },
      });
      if (createError || !newUser.user) {
        return res.render('pages/login', { error: 'Failed to create admin account' });
      }
      authUser = newUser.user;
    } else {
      await supabase.auth.admin.updateUserById(authUser.id, { password, user_metadata: { ...authUser.user_metadata, role: 'super_admin' } });
    }

    let admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      admin = await prisma.admin.create({
        data: { email, name: 'Super Admin', role: 'super_admin', isBuiltin: true },
      });
    }

    const token = signToken({ id: admin.id, email: admin.email, role: admin.role, source: 'admin' });
    res.cookie('sb-access-token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.redirect('/dashboard');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const adminExists = await prisma.admin.findUnique({ where: { email } });
    if (adminExists) {
      if (adminExists.password && await bcrypt.compare(password, adminExists.password)) {
        const token = signToken({ id: adminExists.id, email: adminExists.email, role: adminExists.role, source: 'admin' });
        res.cookie('sb-access-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        return res.redirect('/dashboard');
      }
      return res.render('pages/login', { error: 'Email atau password salah' });
    }
    const alumni = await prisma.alumni.findFirst({ where: { email, isActive: true } });
    if (alumni) {
      if (!alumni.password) {
        const h = await bcrypt.hash('user123', 10);
        await prisma.alumni.update({ where: { id: alumni.id }, data: { password: h } });
        alumni.password = h;
      }
      if (await bcrypt.compare(password, alumni.password)) {
        const token = signToken({ id: alumni.id, email: alumni.email || '', role: 'user', source: 'alumni' });
        res.cookie('sb-access-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        return res.redirect('/alumni/' + alumni.id);
      }
    }
    return res.render('pages/login', { error: 'Email atau password salah' });
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (admin) {
    const token = signToken({ id: admin.id, email: admin.email, role: admin.role, source: 'admin' });
    res.cookie('sb-access-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.redirect('/dashboard');
  }

  const alumni = await prisma.alumni.findFirst({ where: { email, isActive: true } });
  if (!alumni) {
    return res.render('pages/login', { error: 'Email atau password salah' });
  }

  const token = signToken({ id: alumni.id, email: alumni.email || '', role: 'user', source: 'alumni' });
  res.cookie('sb-access-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.redirect('/alumni/' + alumni.id);
});

router.get('/logout', async (_req, res) => {
  if (authProvider !== 'local') {
    const supabase = getSupabaseAdmin();
    await supabase.auth.signOut().catch(() => {});
  }
  res.clearCookie('sb-access-token');
  res.redirect('/');
});

router.get('/alumni', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const search = (req.query.search as string) || '';
    const province = (req.query.province as string) || '';
    const careerStatus = (req.query.careerStatus as string) || '';
    const offset = (page - 1) * limit;

    const     filters: Prisma.AlumniWhereInput[] = [];

    filters.push({ isActive: true });

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nik: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (province) filters.push({ province });
    if (careerStatus) filters.push({ careerStatus });

    const where = filters.length ? { AND: filters } : undefined;

    const [total, alumniList] = await Promise.all([
      prisma.alumni.count({ where }),
      prisma.alumni.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
    ]);

    res.render('pages/alumni/list', {
      alumni: alumniList, total, page, limit, totalPages: Math.ceil(total / limit),
      search, province, careerStatus,
      provinces: [
        'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi',
        'Sumatera Selatan', 'Bangka Belitung', 'Bengkulu', 'Lampung', 'Banten',
        'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
        'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Kalimantan Barat',
        'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
        'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara',
        'Gorontalo', 'Sulawesi Barat', 'Maluku', 'Maluku Utara', 'Papua',
        'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Luar Negeri',
      ],
      careerStatuses: ['Pekerja', 'Wirausaha', 'Profesional', 'Tenaga Pendidik', 'Pencari Kerja', 'Lainnya'],
    });
  } catch (err) {
    res.render('pages/alumni/list', {
      alumni: [], total: 0, page: 1, limit: 10, totalPages: 0,
      search: '', province: '', careerStatus: '',
      provinces: [], careerStatuses: [], error: (err as Error).message,
    });
  }
});

router.get('/alumni/baru', async (req, res) => {
  res.render('pages/alumni/form', {
    error: null, success: null,
    token: (req.cookies['sb-access-token'] as string) || '',
    maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb,
  });
});

router.post('/alumni/baru', async (req, res) => {
  try {
    const { name, nik, gender, maritalStatus, phone, email, address, province, provinceCode, regencyCode, regencyName, districtCode, districtName, villageCode, villageName, careerStatus } = req.body;

    if (!name || !String(name).trim()) {
      return res.render('pages/alumni/form', { error: 'Nama wajib diisi', success: null, token: (req.cookies['sb-access-token'] as string) || '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb });
    }
    if (!nik || !String(nik).trim()) {
      return res.render('pages/alumni/form', { error: 'NIK wajib diisi', success: null, token: (req.cookies['sb-access-token'] as string) || '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb });
    }
    if (!/^\d{16}$/.test(nik)) {
      return res.render('pages/alumni/form', { error: 'NIK harus 16 digit angka', success: null, token: (req.cookies['sb-access-token'] as string) || '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb });
    }

    const existing = await prisma.alumni.findUnique({ where: { nik } });
    if (existing) {
      return res.render('pages/alumni/form', { error: 'NIK sudah terdaftar', success: null, token: (req.cookies['sb-access-token'] as string) || '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb });
    }

    if (email) {
      const emailAlumni = await prisma.alumni.findFirst({ where: { email } });
      if (emailAlumni) {
        return res.render('pages/alumni/form', { error: 'Email sudah terdaftar', success: null, token: (req.cookies['sb-access-token'] as string) || '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb });
      }
      const emailAdmin = await prisma.admin.findUnique({ where: { email } });
      if (emailAdmin) {
        return res.render('pages/alumni/form', { error: 'Email tidak dapat digunakan', success: null, token: (req.cookies['sb-access-token'] as string) || '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb });
      }
    }

    const created = await prisma.alumni.create({
      data: {
        name, nik,
        gender: gender || undefined,
        maritalStatus: maritalStatus || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        province: province || undefined,
        provinceCode: provinceCode || undefined,
        regencyCode: regencyCode || undefined,
        regencyName: regencyName || undefined,
        districtCode: districtCode || undefined,
        districtName: districtName || undefined,
        villageCode: villageCode || undefined,
        villageName: villageName || undefined,
        careerStatus: careerStatus || undefined,
        isActive: false,
        password: await bcrypt.hash('user123', 10),
      },
    });

    res.render('pages/alumni/form', { error: null, success: 'Data berhasil dikirim. Setelah diverifikasi admin, data akan muncul di directory.', token: (req.cookies['sb-access-token'] as string) || '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb });
  } catch (err) {
    res.render('pages/alumni/form', { error: (err as Error).message, success: null, token: (req.cookies['sb-access-token'] as string) || '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb });
  }
});

router.get('/alumni/:id', async (req, res) => {
  try {
    const alumni = await prisma.alumni.findUnique({
      where: { id: req.params.id as string },
      include: { education: true, certificates: true, organizations: true, portfolios: true, businesses: true, socialLinks: true },
    });

    if (!alumni) return res.status(404).render('pages/alumni/detail', { a: null, error: 'Alumni not found' });

    const isOwner = !!alumni.email && !!res.locals.user && res.locals.user.email === alumni.email;
    if (!alumni.isActive && !isOwner && (!res.locals.user || (res.locals.user.role !== 'admin' && res.locals.user.role !== 'super_admin'))) {
      return res.status(404).render('pages/alumni/detail', { a: null, error: 'Alumni not found' });
    }

    const a: Record<string, unknown> = { ...alumni } as Record<string, unknown>;

    if (alumni.regencyCode) {
      const r = await prisma.wilayah.findUnique({ where: { kode: alumni.regencyCode } });
      if (r) a.regencyName = r.nama;
    }
    if (alumni.districtCode) {
      const d = await prisma.wilayah.findUnique({ where: { kode: alumni.districtCode } });
      if (d) a.districtName = d.nama;
    }
    if (alumni.villageCode) {
      const v = await prisma.wilayah.findUnique({ where: { kode: alumni.villageCode } });
      if (v) a.villageName = v.nama;
    }

    if (Array.isArray(a.businesses)) {
      a.businesses = (a.businesses as Record<string, unknown>[]).map(parseProducts);
    }

    let isAlreadyAdmin = false;
    if (alumni.email) {
      const existingAdmin = await prisma.admin.findUnique({ where: { email: alumni.email } });
      if (existingAdmin) isAlreadyAdmin = true;
    }

    res.render('pages/alumni/detail', { a, error: null, token: (req.cookies['sb-access-token'] as string) || '', isAlreadyAdmin });
  } catch (err) {
    res.status(500).render('pages/alumni/detail', { a: null, error: (err as Error).message });
  }
});

router.get('/statistik', async (req, res) => {
  try {
    const perProvinsi = await prisma.alumni.groupBy({
      by: ['province'],
      _count: { id: true },
      where: { isActive: true, province: { not: null as string | null } },
      orderBy: { _count: { id: 'desc' } },
    });
    const labels = perProvinsi.map(p => p.province!);
    const values = perProvinsi.map(p => p._count.id);
    res.render('pages/statistik', { labels, values, total: values.reduce((a, b) => a + b, 0) });
  } catch (err) {
    res.render('pages/statistik', { labels: [], values: [], total: 0, error: (err as Error).message });
  }
});

router.get('/dashboard', requirePageAuth, async (req, res) => {
  if (res.locals.user?.role === 'user') {
    const alumni = await prisma.alumni.findFirst({ where: { email: res.locals.user.email } });
    if (alumni) return res.redirect('/alumni/' + alumni.id);
    return res.redirect('/alumni');
  }
  try {
    const [total, totalActive, totalInactive, perProvinsi] = await Promise.all([
      prisma.alumni.count(),
      prisma.alumni.count({ where: { isActive: true } }),
      prisma.alumni.count({ where: { isActive: false } }),
      prisma.alumni.groupBy({
        by: ['province'],
        _count: { id: true },
        where: { isActive: true, province: { not: null as string | null } },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);
    const labels = perProvinsi.map(p => p.province!);
    const values = perProvinsi.map(p => p._count.id);
    res.render('pages/dashboard/index', { totalAlumni: total, totalActive, totalInactive, labels, values });
  } catch (err) {
    res.render('pages/dashboard/index', { totalAlumni: 0, totalActive: 0, totalInactive: 0, labels: [], values: [], error: (err as Error).message });
  }
});

router.get('/dashboard/alumni', requirePageAuth, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const search = (req.query.search as string) || '';
    const statusFilter = (req.query.isActive as string) || '';
    const offset = (page - 1) * limit;

    const filters: Prisma.AlumniWhereInput[] = [];

    if (statusFilter === 'active') filters.push({ isActive: true });
    else if (statusFilter === 'inactive') filters.push({ isActive: false });

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nik: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where = filters.length ? { AND: filters } : undefined;

    const [total, alumniList, allAdmins] = await Promise.all([
      prisma.alumni.count({ where }),
      prisma.alumni.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      prisma.admin.findMany({ select: { email: true, role: true, isBuiltin: true } }),
    ]);

    const adminRoleMap: Record<string, { role: string; isBuiltin: boolean }> = {};
    for (const ad of allAdmins) {
      adminRoleMap[ad.email.toLowerCase()] = { role: ad.role, isBuiltin: ad.isBuiltin ?? false };
    }

    res.render('pages/dashboard/alumni-list', {
      alumni: alumniList, total, page, limit, totalPages: Math.ceil(total / limit), search, statusFilter,
      token: (req.cookies['sb-access-token'] as string) || '',
      adminRoleMapJson: JSON.stringify(adminRoleMap),
    });
  } catch (err) {
    res.render('pages/dashboard/alumni-list', { alumni: [], total: 0, page: 1, limit: 10, totalPages: 0, search: '', statusFilter: '', error: (err as Error).message, token: '', adminRoleMapJson: '{}' });
  }
});

router.get('/dashboard/alumni/:id/edit', requirePageAuth, async (req, res) => {
  try {
    const alumni = await prisma.alumni.findUnique({
      where: { id: req.params.id as string },
      include: { education: true, certificates: true, organizations: true, portfolios: true, businesses: true, socialLinks: true },
    });

    if (!alumni) return res.status(404).render('pages/dashboard/alumni-form', { a: null, error: 'Alumni not found', token: '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb });

    const a: Record<string, unknown> = { ...alumni } as Record<string, unknown>;
    if (Array.isArray(a.businesses)) {
      a.businesses = (a.businesses as Record<string, unknown>[]).map(parseProducts);
    }

    let isAlreadyAdmin = false;
    if (alumni.email) {
      const existingAdmin = await prisma.admin.findUnique({ where: { email: alumni.email } });
      if (existingAdmin) isAlreadyAdmin = true;
    }

    res.render('pages/dashboard/alumni-form', { a, error: null, token: (req.cookies['sb-access-token'] as string) || '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb, isAlreadyAdmin });
  } catch (err) {
    res.status(500).render('pages/dashboard/alumni-form', { a: null, error: (err as Error).message, token: '', maxFileSize: 0, maxFileSizeKb: 0 });
  }
});

router.get('/dashboard/alumni/new', requirePageAuth, (req, res) => {
  res.render('pages/dashboard/alumni-form', { a: null, error: null, token: (req.cookies['sb-access-token'] as string) || '', maxFileSize: env.uploadMaxFileSize, maxFileSizeKb: env.uploadMaxFileSizeKb });
});

router.get('/dashboard/admins', requirePageAuth, async (req, res) => {
  const userRole = res.locals.user?.role;
  if (userRole !== 'super_admin') return res.redirect('/dashboard');

  const currentUser = res.locals.user!;

  try {
    const [list, allAlumni] = await Promise.all([
      prisma.admin.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true, name: true, role: true, isBuiltin: true, createdAt: true, updatedAt: true },
      }),
      prisma.alumni.findMany({ select: { id: true, email: true } }),
    ]);

    let filteredList = list;
    if (currentUser.isBuiltin) {
      filteredList = list.filter(a => a.id !== currentUser.id);
    } else {
      filteredList = list.filter(a => a.id !== currentUser.id && a.role === 'admin' && !a.isBuiltin);
    }

    const alumniByEmail: Record<string, string> = {};
    for (const al of allAlumni) {
      if (al.email) alumniByEmail[al.email.toLowerCase()] = al.id;
    }
    res.render('pages/dashboard/admins', { admins: filteredList, error: null, token: (req.cookies['sb-access-token'] as string) || '', alumniByEmailJson: JSON.stringify(alumniByEmail) });
  } catch (err) {
    res.render('pages/dashboard/admins', { admins: [], error: (err as Error).message, token: (req.cookies['sb-access-token'] as string) || '', alumniByEmailJson: '{}' });
  }
});

router.get('/dashboard/admins/new', requirePageAuth, (req, res) => {
  if (res.locals.user?.role !== 'super_admin') return res.redirect('/dashboard');
  res.render('pages/dashboard/admin-form', { error: null, token: (req.cookies['sb-access-token'] as string) || '' });
});

router.get('/dashboard/password', requirePageAuth, (req, res) => {
  res.render('pages/dashboard/password', { error: null, success: null, token: (req.cookies['sb-access-token'] as string) || '' });
});

router.get('/dashboard/settings', requirePageAuth, async (req, res) => {
  if (res.locals.user?.role !== 'super_admin') return res.redirect('/dashboard');
  res.render('pages/dashboard/settings', { error: null, success: null, token: (req.cookies['sb-access-token'] as string) || '' });
});

export default router as Router;
