import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { mockAlumni, mockInactiveAlumni, mockAdmin } from './helpers/fixtures';

function d() {
  return {
    findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateMany: vi.fn(),
    delete: vi.fn(), deleteMany: vi.fn(), count: vi.fn(),
    groupBy: vi.fn(), upsert: vi.fn(), aggregate: vi.fn(),
  };
}

const prismaMock = vi.hoisted(() => ({
  alumni: d(), admin: d(),
  education: d(), certificate: d(), organization: d(),
  business: d(), socialLink: d(), wilayah: d(),
  $disconnect: vi.fn(), $connect: vi.fn(), $on: vi.fn(),
}));

vi.mock('../utils/db', () => ({ prisma: prismaMock }));

const jwtPayload = { id: mockAdmin.id, email: mockAdmin.email, role: mockAdmin.role, iat: 0, exp: 9999999999 };
vi.mock('../utils/jwt', () => ({
  verifyToken: vi.fn(() => jwtPayload),
  signToken: vi.fn(() => 'test-signed-token'),
}));

import alumniRoutes from '../routes/alumni';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/alumni', alumniRoutes);

function adminAuth(): { authorization: string } {
  return { authorization: 'Bearer test-token' };
}

describe('Alumni API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/alumni', () => {
    it('creates alumni as inactive for public (no auth)', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(null);
      prismaMock.alumni.create.mockResolvedValue({ ...mockAlumni, isActive: false });
      const res = await supertest(app)
        .post('/api/v1/alumni')
        .send({ name: 'Test User', nik: '3273010101950003', email: 'test@test.com' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(prismaMock.alumni.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }),
      );
    });

    it('creates alumni as active for admin', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findUnique.mockResolvedValue(null);
      prismaMock.alumni.create.mockResolvedValue(mockAlumni);
      const res = await supertest(app)
        .post('/api/v1/alumni')
        .set(adminAuth())
        .send({ name: 'Ahmad Al-Faruq', nik: '3273010101950001' });
      expect(res.status).toBe(201);
      expect(prismaMock.alumni.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isActive: true }) }),
      );
    });

    it('returns 409 when NIK already exists', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(mockAlumni);
      const res = await supertest(app)
        .post('/api/v1/alumni')
        .send({ name: 'Test', nik: '3273010101950001' });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('NIK sudah terdaftar');
    });

    it('rejects request with missing required fields gracefully', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(null);
      prismaMock.alumni.create.mockRejectedValue(new Error('name is required'));
      const res = await supertest(app)
        .post('/api/v1/alumni')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/alumni', () => {
    it('returns only active alumni for public', async () => {
      prismaMock.alumni.count.mockResolvedValue(1);
      prismaMock.alumni.findMany.mockResolvedValue([mockAlumni]);
      const res = await supertest(app).get('/api/v1/alumni');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(prismaMock.alumni.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([{ isActive: true }]) }) }),
      );
    });

    it('shows all alumni for admin', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.count.mockResolvedValue(2);
      prismaMock.alumni.findMany.mockResolvedValue([mockAlumni, mockInactiveAlumni]);
      const res = await supertest(app)
        .get('/api/v1/alumni')
        .set(adminAuth());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('filters by isActive for admin', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.count.mockResolvedValue(1);
      prismaMock.alumni.findMany.mockResolvedValue([mockInactiveAlumni]);
      const res = await supertest(app)
        .get('/api/v1/alumni?isActive=false')
        .set(adminAuth());
      expect(res.status).toBe(200);
      expect(prismaMock.alumni.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([{ isActive: false }]) }) }),
      );
    });

    it('searches by name, nik, or email', async () => {
      prismaMock.alumni.count.mockResolvedValue(1);
      prismaMock.alumni.findMany.mockResolvedValue([mockAlumni]);
      const res = await supertest(app).get('/api/v1/alumni?search=Ahmad');
      expect(res.status).toBe(200);
      expect(prismaMock.alumni.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { isActive: true },
              { OR: expect.arrayContaining([{ name: expect.objectContaining({ contains: 'Ahmad' }) }]) },
            ]),
          }),
        }),
      );
    });

    it('paginates results', async () => {
      prismaMock.alumni.count.mockResolvedValue(50);
      prismaMock.alumni.findMany.mockResolvedValue(Array(20).fill(mockAlumni));
      const res = await supertest(app).get('/api/v1/alumni?page=1&limit=20');
      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(20);
      expect(res.body.meta.total).toBe(50);
    });

    it('filters by province code', async () => {
      prismaMock.alumni.count.mockResolvedValue(1);
      prismaMock.alumni.findMany.mockResolvedValue([mockAlumni]);
      const res = await supertest(app).get('/api/v1/alumni?provinceCode=31');
      expect(res.status).toBe(200);
      expect(prismaMock.alumni.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([{ provinceCode: '31' }]) }) }),
      );
    });
  });

  describe('GET /api/v1/alumni/:id', () => {
    it('returns alumni by id for public if active', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(mockAlumni);
      const res = await supertest(app).get('/api/v1/alumni/alumni-1');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('alumni-1');
    });

    it('returns 404 for inactive alumni when public', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(mockInactiveAlumni);
      const res = await supertest(app).get('/api/v1/alumni/alumni-2');
      expect(res.status).toBe(404);
    });

    it('returns inactive alumni for admin', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findUnique.mockResolvedValue(mockInactiveAlumni);
      const res = await supertest(app)
        .get('/api/v1/alumni/alumni-2')
        .set(adminAuth());
      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('returns 404 when alumni not found', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(null);
      const res = await supertest(app).get('/api/v1/alumni/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/alumni/:id', () => {
    it('updates alumni when admin', async () => {
      prismaMock.alumni.findUnique.mockResolvedValue(mockAlumni);
      prismaMock.alumni.update.mockResolvedValue({ ...mockAlumni, name: 'Updated Name' });
      prismaMock.alumni.findUnique.mockResolvedValue({ ...mockAlumni, name: 'Updated Name' });
      const res = await supertest(app)
        .put('/api/v1/alumni/alumni-1')
        .set(adminAuth())
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('rejects non-admin users', async () => {
      const res = await supertest(app)
        .put('/api/v1/alumni/alumni-1')
        .send({ name: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('returns 404 when alumni not found', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findUnique.mockResolvedValue(null);
      const res = await supertest(app)
        .put('/api/v1/alumni/nonexistent')
        .set(adminAuth())
        .send({ name: 'Test' });
      expect(res.status).toBe(404);
    });

    it('returns 409 when updating to duplicate NIK', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findUnique
        .mockResolvedValueOnce(mockAlumni)
        .mockResolvedValueOnce({ ...mockInactiveAlumni, nik: '3273010101950002' });
      const res = await supertest(app)
        .put('/api/v1/alumni/alumni-1')
        .set(adminAuth())
        .send({ nik: '3273010101950002' });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('NIK sudah terdaftar');
    });
  });

  describe('PATCH /api/v1/alumni/:id/status', () => {
    it('toggles alumni active status', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findUnique.mockResolvedValue(mockAlumni);
      prismaMock.alumni.update.mockResolvedValue({ ...mockAlumni, isActive: false });
      const res = await supertest(app)
        .patch('/api/v1/alumni/alumni-1/status')
        .set(adminAuth())
        .send({ isActive: false });
      expect(res.status).toBe(200);
      expect(prismaMock.alumni.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'alumni-1' }, data: { isActive: false } }),
      );
    });

    it('rejects non-admin', async () => {
      const res = await supertest(app)
        .patch('/api/v1/alumni/alumni-1/status')
        .send({ isActive: false });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/alumni/:id', () => {
    it('deletes alumni when admin', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findUnique.mockResolvedValue(mockAlumni);
      prismaMock.admin.findMany.mockResolvedValue([mockAdmin]);
      prismaMock.alumni.delete.mockResolvedValue(mockAlumni);
      const res = await supertest(app)
        .delete('/api/v1/alumni/alumni-1')
        .set(adminAuth());
      expect(res.status).toBe(200);
    });

    it('rejects non-admin', async () => {
      const res = await supertest(app)
        .delete('/api/v1/alumni/alumni-1');
      expect(res.status).toBe(401);
    });

    it('blocks regular admin from deleting admin alumni', async () => {
      const adminAlumniEmail = mockAdmin.email;
      const adminAlumni = { ...mockAlumni, email: adminAlumniEmail };
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findUnique.mockResolvedValue(adminAlumni);
      prismaMock.admin.findMany.mockResolvedValue([mockAdmin]);
      const res = await supertest(app)
        .delete('/api/v1/alumni/alumni-1')
        .set(adminAuth());
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Tidak bisa menghapus alumni yang juga admin');
    });

    it('allows super admin to delete non-builtin admin alumni', async () => {
      const superMock = { ...mockAdmin, id: 'super-1', email: 'super@admin.com', role: 'super_admin', isBuiltin: true };
      const nonBuiltinAdmin = { ...mockAdmin, id: 'admin-2', email: 'admin2@test.com' };
      const targetAlumni = { ...mockAlumni, email: 'admin2@test.com' };
      prismaMock.admin.findUnique.mockResolvedValue(superMock);
      prismaMock.alumni.findUnique.mockResolvedValue(targetAlumni);
      prismaMock.admin.findMany
        .mockResolvedValueOnce([superMock, nonBuiltinAdmin])
        .mockResolvedValueOnce([superMock]);
      prismaMock.alumni.delete.mockResolvedValue(targetAlumni);
      const res = await supertest(app)
        .delete('/api/v1/alumni/alumni-1')
        .set(adminAuth());
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/alumni/bulk/delete', () => {
    it('bulk deletes non-admin alumni', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findMany.mockResolvedValue([mockAlumni, mockInactiveAlumni]);
      prismaMock.admin.findMany.mockResolvedValue([mockAdmin]);
      prismaMock.alumni.deleteMany.mockResolvedValue({ count: 2 });
      const res = await supertest(app)
        .post('/api/v1/alumni/bulk/delete')
        .set(adminAuth())
        .send({ ids: ['alumni-1', 'alumni-2'] });
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(2);
    });

    it('blocks deleted admin alumni when regular admin', async () => {
      const adminAlumni = { ...mockAlumni, email: mockAdmin.email };
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.findMany.mockResolvedValue([adminAlumni]);
      prismaMock.admin.findMany.mockResolvedValue([mockAdmin]);
      const res = await supertest(app)
        .post('/api/v1/alumni/bulk/delete')
        .set(adminAuth())
        .send({ ids: ['alumni-1'] });
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(0);
      expect(res.body.data.blocked).toHaveLength(1);
    });

    it('rejects non-admin', async () => {
      const res = await supertest(app)
        .post('/api/v1/alumni/bulk/delete')
        .send({ ids: ['alumni-1'] });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/alumni/bulk/status', () => {
    it('bulk activates alumni', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.updateMany.mockResolvedValue({ count: 2 });
      const res = await supertest(app)
        .post('/api/v1/alumni/bulk/status')
        .set(adminAuth())
        .send({ ids: ['alumni-1', 'alumni-2'], isActive: true });
      expect(res.status).toBe(200);
      expect(res.body.data.updated).toBe(2);
    });

    it('bulk deactivates alumni', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.alumni.updateMany.mockResolvedValue({ count: 2 });
      const res = await supertest(app)
        .post('/api/v1/alumni/bulk/status')
        .set(adminAuth())
        .send({ ids: ['alumni-1', 'alumni-2'], isActive: false });
      expect(res.status).toBe(200);
      expect(prismaMock.alumni.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });

    it('rejects non-admin', async () => {
      const res = await supertest(app)
        .post('/api/v1/alumni/bulk/status')
        .send({ ids: ['alumni-1'], isActive: true });
      expect(res.status).toBe(401);
    });
  });
});
