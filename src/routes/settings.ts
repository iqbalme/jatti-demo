import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const PUBLIC_KEYS = [
  'site_name', 'site_description', 'site_title', 'favicon_url', 'logo_url',
  'theme_preset', 'theme_primary', 'theme_gradient_from', 'theme_gradient_to',
];

router.get('/', async (_req, res) => {
  try {
    const all = await prisma.setting.findMany();
    const map: Record<string, string | null> = {};
    for (const s of all) map[s.key] = s.value;
    sendSuccess(res, map);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.put('/', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const entries = req.body as Record<string, string>;
    const allowed = new Set(PUBLIC_KEYS);
    const results: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(entries)) {
      if (!allowed.has(key)) continue;
      const trimmed = String(value ?? '').trim();
      if (trimmed) {
        await prisma.setting.upsert({
          where: { key },
          update: { value: trimmed },
          create: { key, value: trimmed },
        });
        results[key] = trimmed;
      } else {
        await prisma.setting.upsert({
          where: { key },
          update: { value: null },
          create: { key, value: null },
        });
        results[key] = null;
      }
    }

    sendSuccess(res, results);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.get('/export', requireAuth, requireRole('super_admin'), async (_req, res) => {
  try {
    const [settings, admins, alumni, education, certificates, organizations, portfolios, businesses, socialLinks, countries] = await Promise.all([
      prisma.setting.findMany(),
      prisma.admin.findMany(),
      prisma.alumni.findMany(),
      prisma.education.findMany(),
      prisma.certificate.findMany(),
      prisma.organization.findMany(),
      prisma.portfolio.findMany(),
      prisma.business.findMany(),
      prisma.socialLink.findMany(),
      prisma.country.findMany(),
    ]);

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        settings, admins, alumni, education, certificates,
        organizations, portfolios, businesses, socialLinks, countries,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=alumnilink-backup.json');
    res.json(payload);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.post('/import', requireAuth, requireRole('super_admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return sendError(res, 400, 'File tidak ditemukan');

    const raw = req.file.buffer.toString('utf-8');
    let payload: { version?: number; data?: Record<string, unknown> };

    try { payload = JSON.parse(raw); } catch { return sendError(res, 400, 'Format JSON tidak valid'); }

    if (!payload.data) return sendError(res, 400, 'Struktur backup tidak valid: field "data" tidak ditemukan');

    const data = payload.data;

    await prisma.$transaction(async (tx) => {
      await tx.socialLink.deleteMany();
      await tx.business.deleteMany();
      await tx.portfolio.deleteMany();
      await tx.organization.deleteMany();
      await tx.certificate.deleteMany();
      await tx.education.deleteMany();
      await tx.alumni.deleteMany();
      await tx.admin.deleteMany();
      await tx.setting.deleteMany();
      await tx.country.deleteMany();
      await tx.wilayah.deleteMany();

      if (Array.isArray(data.countries)) {
        for (const c of data.countries) {
          await tx.country.create({ data: { code: c.code, name: c.name, dialCode: c.dialCode, dialCode4: c.dialCode4 } });
        }
      }
      if (Array.isArray(data.settings)) {
        for (const s of data.settings) {
          await tx.setting.create({ data: { key: s.key, value: s.value } });
        }
      }
      if (Array.isArray(data.admins)) {
        for (const a of data.admins) {
          await tx.admin.create({
            data: {
              id: a.id, email: a.email, name: a.name, role: a.role,
              password: a.password, isBuiltin: a.isBuiltin,
            },
          });
        }
      }
      if (Array.isArray(data.alumni)) {
        for (const a of data.alumni) {
          await tx.alumni.create({
            data: {
              id: a.id, nik: a.nik, name: a.name, gender: a.gender,
              maritalStatus: a.maritalStatus, phone: a.phone, email: a.email,
              photoUrl: a.photoUrl, province: a.province,
              provinceCode: a.provinceCode, regencyCode: a.regencyCode,
              regencyName: a.regencyName, districtCode: a.districtCode,
              districtName: a.districtName, villageCode: a.villageCode,
              villageName: a.villageName, address: a.address, bio: a.bio,
              careerStatus: a.careerStatus, careerOther: a.careerOther,
              institutionName: a.institutionName,
              institutionField: a.institutionField, position: a.position,
              isActive: a.isActive,
            },
          });
        }
      }
      const relationMap: Record<string, string> = {
        education: 'education',
        certificates: 'certificate',
        organizations: 'organization',
        portfolios: 'portfolio',
        businesses: 'business',
        socialLinks: 'socialLink',
      };
      for (const [jsonKey, prismaModel] of Object.entries(relationMap)) {
        const rows = data[jsonKey];
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          await (tx as any)[prismaModel].create({ data: row });
        }
      }
    });

    sendSuccess(res, { message: 'Import berhasil. Database telah direstore.' });
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

export async function loadSettings(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  try {
    const all = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of all) if (s.value) map[s.key] = s.value;

    res.locals.settings = {
      site_name: map.site_name || 'AlumniLink',
      site_description: map.site_description || 'Alumni Directory and Tracer Study Platform',
      site_title: map.site_title || 'AlumniLink \u2014 Alumni Directory',
      favicon_url: map.favicon_url || '',
      logo_url: map.logo_url || '',
      theme_preset: map.theme_preset || 'default',
      theme_primary: map.theme_primary || '#2563eb',
      theme_gradient_from: map.theme_gradient_from || '#2563eb',
      theme_gradient_to: map.theme_gradient_to || '#2dd4bf',
    };
  } catch {
    res.locals.settings = {
      site_name: 'AlumniLink',
      site_description: 'Alumni Directory and Tracer Study Platform',
      site_title: 'AlumniLink \u2014 Alumni Directory',
      favicon_url: '',
      logo_url: '',
      theme_preset: 'default',
      theme_primary: '#2563eb',
      theme_gradient_from: '#2563eb',
      theme_gradient_to: '#2dd4bf',
    };
  }
  next();
}

export default router as Router;
