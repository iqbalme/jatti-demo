import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { mockAlumni, mockInactiveAlumni, mockAdmin, mockWilayah } from './helpers/fixtures';

const prismaMock = vi.hoisted(() => {
  function d() {
    return {
      findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(),
      create: vi.fn(), update: vi.fn(), updateMany: vi.fn(),
      delete: vi.fn(), deleteMany: vi.fn(), count: vi.fn(),
      groupBy: vi.fn(), upsert: vi.fn(), aggregate: vi.fn(),
    };
  }
  return {
    alumni: d(), admin: d(),
    education: d(), certificate: d(), organization: d(),
    business: d(), socialLink: d(), wilayah: d(),
    $disconnect: vi.fn(), $connect: vi.fn(), $on: vi.fn(),
  };
});

vi.mock('../utils/db', () => ({ prisma: prismaMock }));

const jwtPayload = { id: mockAdmin.id, email: mockAdmin.email, role: mockAdmin.role, iat: 0, exp: 9999999999 };
vi.mock('../utils/jwt', () => ({
  verifyToken: vi.fn(() => jwtPayload),
  signToken: vi.fn(() => 'test-signed-token'),
}));

vi.mock('../utils/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({}),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        createUser: vi.fn().mockResolvedValue({ data: null, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
    storage: { listBuckets: vi.fn().mockResolvedValue({ data: [], error: null }), createBucket: vi.fn() },
  })),
}));

import pageRoutes from '../routes/pages';

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/', pageRoutes);

function setAuthCookie(): string[] {
  return ['sb-access-token=test-token'];
}

describe('Page Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('renders index page', async () => {
      const res = await supertest(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('AlumniLink');
    });
  });

  describe('GET /login', () => {
    it('renders login page when not authenticated', async () => {
      const res = await supertest(app).get('/login');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Masuk');
    });

    it('redirects to dashboard when already authenticated', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      const res = await supertest(app)
        .get('/login')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/dashboard');
    });
  });

  describe('POST /login', () => {
    it('rejects invalid credentials', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(null);
      const res = await supertest(app)
        .post('/login')
        .send({ email: 'wrong@test.com', password: 'wrong' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('Invalid credentials');
    });
  });

  describe('GET /alumni', () => {
    it('renders alumni list with active alumni only', async () => {
      prismaMock.alumni.count.mockResolvedValue(1);
      prismaMock.alumni.findMany.mockResolvedValue([mockAlumni]);
      const res = await supertest(app).get('/alumni');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Ahmad Al-Faruq');
      expect(prismaMock.alumni.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([{ isActive: true }]) }) }),
      );
    });

    it('handles empty alumni list', async () => {
      prismaMock.alumni.count.mockResolvedValue(0);
      prismaMock.alumni.findMany.mockResolvedValue([]);
      const res = await supertest(app).get('/alumni');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Belum ada data alumni');
    });
  });

  describe('GET /alumni/baru', () => {
    it('renders public alumni form', async () => {
      const res = await supertest(app).get('/alumni/baru');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Tambah Data Alumni');
      expect(res.text).toContain('Kirim Data');
    });
  });

  describe('POST /alumni/baru', () => {
    it('submits alumni data as inactive', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(null);
      prismaMock.alumni.create.mockResolvedValue({ ...mockAlumni, id: 'new-id' });
      const res = await supertest(app)
        .post('/alumni/baru')
        .send({ name: 'Test User', nik: '3273010101950003' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('window.location.href');
      expect(prismaMock.alumni.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }),
      );
    });

    it('rejects duplicate NIK', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(mockAlumni);
      const res = await supertest(app)
        .post('/alumni/baru')
        .send({ name: 'Test', nik: '3273010101950001' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('NIK sudah terdaftar');
    });

    it('rejects empty name', async () => {
      const res = await supertest(app)
        .post('/alumni/baru')
        .send({ name: '' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('Nama wajib diisi');
    });
  });

  describe('GET /alumni/:id', () => {
    it('shows alumni detail for active alumni', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(mockAlumni);
      const res = await supertest(app).get('/alumni/alumni-1');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Ahmad Al-Faruq');
    });

    it('returns 404 for inactive alumni', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(mockInactiveAlumni);
      const res = await supertest(app).get('/alumni/alumni-2');
      expect(res.status).toBe(404);
    });

    it('returns 404 for nonexistent alumni', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(null);
      const res = await supertest(app).get('/alumni/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /dashboard', () => {
    it('redirects to login when not authenticated', async () => {
      const res = await supertest(app).get('/dashboard');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });

    it('renders dashboard when authenticated', async () => {
      const grouped = [
        { province: 'Jawa Barat', _count: { id: 5 } },
        { province: 'Jawa Timur', _count: { id: 3 } },
      ];
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(3);
      prismaMock.alumni.groupBy.mockResolvedValue(grouped);
      const res = await supertest(app)
        .get('/dashboard')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(200);
      expect(res.text).toContain('Dashboard');
      expect(res.text).toContain('10');
      expect(res.text).toContain('7');
      expect(res.text).toContain('3');
      expect(res.text).toContain('Jawa Barat');
      expect(res.text).toContain('per Provinsi');
    });
  });

  describe('GET /dashboard/alumni', () => {
    it('redirects to login when not authenticated', async () => {
      const res = await supertest(app).get('/dashboard/alumni');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });

    it('lists alumni for admin', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.count.mockResolvedValue(1);
      prismaMock.alumni.findMany.mockResolvedValue([mockAlumni]);
      const res = await supertest(app)
        .get('/dashboard/alumni')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(200);
      expect(res.text).toContain('Kelola Alumni');
    });

    it('filters by active status', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.count.mockResolvedValue(1);
      prismaMock.alumni.findMany.mockResolvedValue([mockInactiveAlumni]);
      const res = await supertest(app)
        .get('/dashboard/alumni?isActive=inactive')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(200);
      expect(prismaMock.alumni.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([{ isActive: false }]) }) }),
      );
    });
  });

  describe('GET /dashboard/alumni/new', () => {
    it('renders form when authenticated', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      const res = await supertest(app)
        .get('/dashboard/alumni/new')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(200);
      expect(res.text).toContain('Tambah');
    });

    it('redirects when not authenticated', async () => {
      const res = await supertest(app).get('/dashboard/alumni/new');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });
  });

  describe('GET /dashboard/alumni/:id/edit', () => {
    it('renders edit form for existing alumni', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findUnique.mockResolvedValue(mockAlumni);
      const res = await supertest(app)
        .get('/dashboard/alumni/alumni-1/edit')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(200);
      expect(res.text).toContain('Ahmad Al-Faruq');
    });

    it('returns 404 for nonexistent alumni', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findUnique.mockResolvedValue(null);
      const res = await supertest(app)
        .get('/dashboard/alumni/nonexistent/edit')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(404);
    });
  });

  describe('GET /dashboard/password', () => {
    it('renders password page when authenticated', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      const res = await supertest(app)
        .get('/dashboard/password')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(200);
      expect(res.text).toContain('Ubah Password');
    });
  });

  describe('GET /dashboard/admins', () => {
    it('redirects non-super-admin', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      const res = await supertest(app)
        .get('/dashboard/admins')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(302);
    });

    it('renders admin list for super admin', async () => {
      const superMock = { ...mockAdmin, role: 'super_admin' };
      prismaMock.admin.findUnique.mockResolvedValue(superMock);
      prismaMock.admin.findMany.mockResolvedValue([superMock]);
      const res = await supertest(app)
        .get('/dashboard/admins')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(200);
      expect(res.text).toContain('Kelola Admin');
    });
  });

  describe('GET /dashboard/admins/new', () => {
    it('renders admin form for super admin', async () => {
      const superMock = { ...mockAdmin, role: 'super_admin' };
      prismaMock.admin.findUnique.mockResolvedValue(superMock);
      const res = await supertest(app)
        .get('/dashboard/admins/new')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(200);
      expect(res.text).toContain('Tambah Admin Baru');
    });

    it('redirects non-super-admin', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      const res = await supertest(app)
        .get('/dashboard/admins/new')
        .set('Cookie', setAuthCookie());
      expect(res.status).toBe(302);
    });
  });

  describe('GET /statistik', () => {
    it('renders statistik page with grouped data', async () => {
      const grouped = [
        { province: 'Jawa Barat', _count: { id: 5 } },
        { province: 'Jawa Timur', _count: { id: 3 } },
        { province: 'DKI Jakarta', _count: { id: 2 } },
      ];
      prismaMock.alumni.groupBy.mockResolvedValue(grouped);
      const res = await supertest(app).get('/statistik');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Statistik Alumni');
      expect(res.text).toContain('Jawa Barat');
      expect(res.text).toContain('Jawa Timur');
      expect(res.text).toContain('10'); // total
    });

    it('handles empty data', async () => {
      prismaMock.alumni.groupBy.mockResolvedValue([]);
      const res = await supertest(app).get('/statistik');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Belum ada data');
    });
  });

  describe('GET /logout', () => {
    it('clears cookie and redirects', async () => {
      const res = await supertest(app).get('/logout');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/');
    });
  });
});
