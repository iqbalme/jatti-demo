import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/db';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';

const router = Router();

const alumniInclude = {
  education: true,
  certificates: true,
  organizations: true,
  portfolios: true,
  businesses: true,
  socialLinks: true,
} as const;

const ADMIN_ROLES = ['admin', 'super_admin'];

function isAdmin(req: { user?: { role?: string } }): boolean {
  return !!req.user && !!req.user.role && ADMIN_ROLES.includes(req.user.role);
}

function isSuperAdmin(req: { user?: { role?: string } }): boolean {
  return req.user?.role === 'super_admin';
}

async function getAdminEmailSet(): Promise<Set<string>> {
  const admins = await prisma.admin.findMany({ select: { email: true } });
  return new Set(admins.map(a => a.email.toLowerCase()));
}

async function getAdminRoleMap(): Promise<Map<string, { role: string; isBuiltin: boolean }>> {
  const admins = await prisma.admin.findMany({ select: { email: true, role: true, isBuiltin: true } });
  const map = new Map<string, { role: string; isBuiltin: boolean }>();
  if (admins) {
    for (const a of admins) {
      map.set(a.email.toLowerCase(), { role: a.role, isBuiltin: a.isBuiltin ?? false });
    }
  }
  return map;
}

async function getBuiltinAdminEmailSet(): Promise<Set<string>> {
  const admins = await prisma.admin.findMany({ where: { isBuiltin: true }, select: { email: true } });
  return new Set(admins.map(a => a.email.toLowerCase()));
}

const REQUIRED_FIELDS = ['name', 'nik'] as const;

router.post('/', optionalAuth, async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((f) => !req.body[f] || !String(req.body[f]).trim());
    if (missing.length) {
      return sendError(res, 400, `Field wajib diisi: ${missing.join(', ')}`);
    }

    if (!/^\d{16}$/.test(req.body.nik)) {
      return sendError(res, 400, 'NIK harus 16 digit angka');
    }

    const { education: edu, certificates: cert, organizations: org, portfolios: port, businesses: bus, socialLinks: social, ...alumniData } = req.body;

    const existing = await prisma.alumni.findUnique({ where: { nik: alumniData.nik as string } });
    if (existing) {
      return sendError(res, 409, 'NIK sudah terdaftar');
    }

    const isAdminUser = isAdmin(req);
    const emailVal = alumniData.email as string | undefined;
    if (emailVal) {
      const dupEmail = await prisma.alumni.findFirst({ where: { email: emailVal } });
      if (dupEmail) return sendError(res, 409, 'Email sudah terdaftar');
      if (!isAdminUser) {
        const adminWithEmail = await prisma.admin.findUnique({ where: { email: emailVal } });
        if (adminWithEmail) return sendError(res, 409, 'Email tidak dapat digunakan');
      }
    }

    const created = await prisma.alumni.create({
      data: {
        ...alumniData,
        products: undefined,
        isActive: isAdminUser ? true : false,
        password: bcrypt.hashSync('user123', 10),
        education: edu?.length ? { createMany: { data: edu.map((e: Record<string, unknown>) => e) } } : undefined,
        certificates: cert?.length ? { createMany: { data: cert.map((c: Record<string, unknown>) => c) } } : undefined,
        organizations: org?.length ? { createMany: { data: org.map((o: Record<string, unknown>) => o) } } : undefined,
        portfolios: port?.length ? { createMany: { data: port.map((p: Record<string, unknown>) => p) } } : undefined,
        businesses: bus?.length ? { createMany: { data: bus.map((b: Record<string, unknown>) => {
          let products = b.products;
          if (typeof products === 'string' && products) {
            try { products = JSON.parse(products as string); } catch { products = (products as string).split(',').map((s: string) => s.trim()).filter(Boolean); }
          }
          return { ...b, products: Array.isArray(products) && products.length ? JSON.stringify(products) : null };
        }) } } : undefined,
        socialLinks: social?.length ? { createMany: { data: social.map((s: Record<string, unknown>) => s) } } : undefined,
      },
      include: alumniInclude,
    });

    sendSuccess(res, created, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return sendError(res, 409, 'NIK sudah terdaftar');
    }
    sendError(res, 400, (err as Error).message);
  }
});

router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const filters: Prisma.AlumniWhereInput[] = [];

    const isAdminUser = isAdmin(req);

    if (!isAdminUser) {
      filters.push({ isActive: true });
    }

    if (req.query.isActive !== undefined && isAdminUser) {
      const val = req.query.isActive as string;
      if (val === 'true') filters.push({ isActive: true });
      else if (val === 'false') filters.push({ isActive: false });
    }

    if (req.query.search) {
      const s = req.query.search as string;
      filters.push({
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { nik: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    if (req.query.provinceCode) filters.push({ provinceCode: req.query.provinceCode as string });
    if (req.query.regencyCode) filters.push({ regencyCode: req.query.regencyCode as string });
    if (req.query.districtCode) filters.push({ districtCode: req.query.districtCode as string });
    if (req.query.villageCode) filters.push({ villageCode: req.query.villageCode as string });
    if (req.query.gender) filters.push({ gender: req.query.gender as string });
    if (req.query.careerStatus) filters.push({ careerStatus: req.query.careerStatus as string });

    if (req.query.graduationYear || req.query.major) {
      const eduFilters: Prisma.EducationWhereInput[] = [];
      if (req.query.graduationYear) eduFilters.push({ graduationYear: Number(req.query.graduationYear) });
      if (req.query.major) eduFilters.push({ major: { contains: req.query.major as string, mode: 'insensitive' } });

      const filtered = await prisma.education.groupBy({
        by: ['alumniId'],
        where: { AND: eduFilters },
      });

      if (filtered.length) {
        filters.push({ id: { in: filtered.map((f) => f.alumniId) } });
      }
    }

    const where: Prisma.AlumniWhereInput | undefined = filters.length ? { AND: filters } : undefined;

    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    const orderBy = { [sortBy]: sortOrder } as Prisma.AlumniOrderByWithRelationInput;

    const [total, data] = await Promise.all([
      prisma.alumni.count({ where }),
      prisma.alumni.findMany({ where, orderBy, take: limit, skip: offset, include: alumniInclude }),
    ]);

    sendPaginated(res, data, total, page, limit);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.post('/bulk/delete', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return sendError(res, 400, 'IDs required');

    const alumni = await prisma.alumni.findMany({ where: { id: { in: ids } } });
    if (!alumni.length) return sendError(res, 404, 'No alumni found');

    const adminRoleMap = await getAdminRoleMap();

    const canDelete: string[] = [];
    const blocked: string[] = [];

    for (const a of alumni) {
      const adminInfo = a.email ? adminRoleMap.get(a.email.toLowerCase()) : undefined;

      if (!adminInfo) {
        canDelete.push(a.id);
      } else if (!adminInfo.isBuiltin && adminInfo.role !== req.user!.role) {
        canDelete.push(a.id);
      } else {
        blocked.push(a.name);
      }
    }

    if (canDelete.length) {
      await prisma.alumni.deleteMany({ where: { id: { in: canDelete } } });
    }

    sendSuccess(res, {
      deleted: canDelete.length,
      blocked,
      message: blocked.length
        ? `${canDelete.length} berhasil dihapus. ${blocked.length} tidak bisa dihapus: ${blocked.join(', ')}`
        : `${canDelete.length} alumni berhasil dihapus`,
    });
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.post('/bulk/status', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { ids, isActive } = req.body;
    if (!Array.isArray(ids) || !ids.length) return sendError(res, 400, 'IDs required');

    const result = await prisma.alumni.updateMany({
      where: { id: { in: ids } },
      data: { isActive: isActive === true },
    });

    sendSuccess(res, { updated: result.count });
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await prisma.alumni.findUnique({
      where: { id: req.params.id as string },
      include: alumniInclude,
    });

    if (!result) return sendError(res, 404, 'Alumni not found');

    if (!result.isActive && !isAdmin(req)) return sendError(res, 404, 'Alumni not found');

    sendSuccess(res, result);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

async function checkSameLevelAdmin(req: { user?: { role?: string } }, email: string | null): Promise<boolean> {
  if (!email) return false;
  const adminRoleMap = await getAdminRoleMap();
  const info = adminRoleMap.get(email.toLowerCase());
  return !!info && info.role === req.user?.role;
}

router.put('/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const alumniId = req.params.id as string;
    const existing = await prisma.alumni.findUnique({ where: { id: alumniId } });
    if (!existing) return sendError(res, 404, 'Alumni not found');
    if (await checkSameLevelAdmin(req, existing.email)) return sendError(res, 403, 'Tidak bisa mengedit admin yang selevel');

    if (req.body.nik) {
      if (!/^\d{16}$/.test(req.body.nik)) {
        return sendError(res, 400, 'NIK harus 16 digit angka');
      }
      if (req.body.nik !== existing.nik) {
        const dup = await prisma.alumni.findUnique({ where: { nik: req.body.nik as string } });
        if (dup) return sendError(res, 409, 'NIK sudah terdaftar');
      }
    }

    const { education: edu, certificates: cert, organizations: org, portfolios: port, businesses: bus, socialLinks: social, ...alumniData } = req.body;

    const updateData: Prisma.AlumniUpdateInput = {
      ...alumniData,
      products: undefined,
      education: edu !== undefined ? {
        deleteMany: {},
        createMany: edu.length ? { data: edu.map((e: Record<string, unknown>) => e) } : undefined,
      } : undefined,
      certificates: cert !== undefined ? {
        deleteMany: {},
        createMany: cert.length ? { data: cert.map((c: Record<string, unknown>) => c) } : undefined,
      } : undefined,
      organizations: org !== undefined ? {
        deleteMany: {},
        createMany: org.length ? { data: org.map((o: Record<string, unknown>) => o) } : undefined,
      } : undefined,
      portfolios: port !== undefined ? {
        deleteMany: {},
        createMany: port.length ? { data: port.map((p: Record<string, unknown>) => p) } : undefined,
      } : undefined,
      businesses: bus !== undefined ? {
        deleteMany: {},
        createMany: bus.length ? { data: bus.map((b: Record<string, unknown>) => {
          let products = b.products;
          if (typeof products === 'string' && products) {
            try { products = JSON.parse(products as string); } catch { products = (products as string).split(',').map((s: string) => s.trim()).filter(Boolean); }
          }
          return { ...b, products: Array.isArray(products) && products.length ? JSON.stringify(products) : null };
        }) } : undefined,
      } : undefined,
      socialLinks: social !== undefined ? {
        deleteMany: {},
        createMany: social.length ? { data: social.map((s: Record<string, unknown>) => s) } : undefined,
      } : undefined,
    };
    if (!existing.password) updateData.password = bcrypt.hashSync('user123', 10);

    await prisma.alumni.update({
      where: { id: alumniId },
      data: updateData,
    });

    const result = await prisma.alumni.findUnique({
      where: { id: alumniId },
      include: alumniInclude,
    });

    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return sendError(res, 409, 'NIK sudah terdaftar');
    }
    sendError(res, 400, (err as Error).message);
  }
});

router.patch('/:id/status', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const alumniId = req.params.id as string;
    const existing = await prisma.alumni.findUnique({ where: { id: alumniId } });
    if (!existing) return sendError(res, 404, 'Alumni not found');
    if (await checkSameLevelAdmin(req, existing.email)) return sendError(res, 403, 'Tidak bisa mengubah status admin yang selevel');

    const updated = await prisma.alumni.update({
      where: { id: alumniId },
      data: { isActive: req.body.isActive === true },
    });

    sendSuccess(res, updated);
  } catch (err) {
    sendError(res, 400, (err as Error).message);
  }
});

router.post('/:id/make-admin', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const alumni = await prisma.alumni.findUnique({ where: { id: req.params.id as string } });
    if (!alumni) return sendError(res, 404, 'Alumni not found');
    if (!alumni.email) return sendError(res, 400, 'Alumni tidak memiliki email');

    const existing = await prisma.admin.findUnique({ where: { email: alumni.email } });
    if (existing) return sendError(res, 409, 'Email ini sudah terdaftar sebagai admin');

    const hashed = bcrypt.hashSync('admin123', 10);
    const [admin] = await Promise.all([
      prisma.admin.create({
        data: { email: alumni.email, name: alumni.name, role: 'admin', password: hashed, isBuiltin: false },
      }),
      prisma.alumni.update({
        where: { id: req.params.id as string },
        data: { isActive: true },
      }),
    ]);
    sendSuccess(res, { id: admin.id, email: admin.email, role: admin.role, name: admin.name }, 201);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.put('/:id/reset-password', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const alumni = await prisma.alumni.findUnique({ where: { id: req.params.id as string } });
    if (!alumni) return sendError(res, 404, 'Alumni not found');
    const hashed = bcrypt.hashSync('user123', 10);
    await prisma.alumni.update({ where: { id: req.params.id as string }, data: { password: hashed } });
    sendSuccess(res, { message: 'Password berhasil direset ke default' });
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.delete('/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const alumniId = req.params.id as string;
    const existing = await prisma.alumni.findUnique({ where: { id: alumniId } });
    if (!existing) return sendError(res, 404, 'Alumni not found');

    const adminRoleMap = await getAdminRoleMap();
    const adminInfo = existing.email ? adminRoleMap.get(existing.email.toLowerCase()) : undefined;

    if (adminInfo) {
      if (adminInfo.isBuiltin) return sendError(res, 403, 'Tidak bisa menghapus alumni admin built-in');
      if (adminInfo.role === req.user!.role) return sendError(res, 403, 'Tidak bisa menghapus admin yang selevel');
    }

    const deleteAdmin = req.query.deleteAdmin === '1';
    if (deleteAdmin && existing.email && adminInfo) {
      await prisma.admin.deleteMany({ where: { email: existing.email } }).catch(() => {});
    }

    await prisma.alumni.delete({ where: { id: alumniId } });
    sendSuccess(res, { message: 'Alumni deleted' });
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

export default router as Router;
