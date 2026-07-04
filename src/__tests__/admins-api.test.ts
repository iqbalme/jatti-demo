import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { mockAdmin, mockSuperAdmin } from './helpers/fixtures';

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

const superJwtPayload = { id: mockSuperAdmin.id, email: mockSuperAdmin.email, role: mockSuperAdmin.role, iat: 0, exp: 9999999999 };
vi.mock('../utils/jwt', () => ({
  verifyToken: vi.fn(() => superJwtPayload),
  signToken: vi.fn(() => 'test-signed-token'),
}));

vi.mock('../utils/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: null, error: null }),
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        createUser: vi.fn().mockResolvedValue({ data: null, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: null, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
  })),
}));

import * as jwtModule from '../utils/jwt';
import adminRoutes from '../routes/admins';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/admins', adminRoutes);

function adminAuth(): { authorization: string } {
  return { authorization: 'Bearer super-token' };
}

describe('Admins API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/admins', () => {
    it('lists all admins for super admin', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockSuperAdmin);
      prismaMock.admin.findMany.mockResolvedValue([mockSuperAdmin, mockAdmin]);
      const res = await supertest(app)
        .get('/api/v1/admins')
        .set(adminAuth());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('rejects non-super-admin', async () => {
      vi.mocked(jwtModule.verifyToken).mockReturnValueOnce({ ...superJwtPayload, role: 'admin' });
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      const res = await supertest(app)
        .get('/api/v1/admins')
        .set('Authorization', 'Bearer admin-token');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/admins', () => {
    it('creates a new admin', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockSuperAdmin);
      prismaMock.admin.create.mockResolvedValue({ ...mockAdmin, id: 'new-admin' });
      const res = await supertest(app)
        .post('/api/v1/admins')
        .set(adminAuth())
        .send({ email: 'new@test.com', name: 'New Admin', password: 'password123' });
      expect(res.status).toBe(201);
    });

    it('rejects missing required fields', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockSuperAdmin);
      const res = await supertest(app)
        .post('/api/v1/admins')
        .set(adminAuth())
        .send({ email: 'test@test.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/v1/admins/:id/role', () => {
    it('changes admin role', async () => {
      prismaMock.admin.findUnique
        .mockResolvedValueOnce(mockSuperAdmin)
        .mockResolvedValueOnce(mockAdmin);
      prismaMock.admin.update.mockResolvedValue({ ...mockAdmin, role: 'super_admin' });
      const res = await supertest(app)
        .put('/api/v1/admins/admin-1/role')
        .set(adminAuth())
        .send({ role: 'super_admin' });
      expect(res.status).toBe(200);
    });

    it('rejects changing built-in admin role', async () => {
      const builtInAdmin = { ...mockAdmin, isBuiltin: true };
      prismaMock.admin.findUnique
        .mockResolvedValueOnce(mockSuperAdmin)
        .mockResolvedValueOnce(builtInAdmin);
      const res = await supertest(app)
        .put('/api/v1/admins/admin-1/role')
        .set(adminAuth())
        .send({ role: 'super_admin' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/admins/:id', () => {
    it('deletes a non-builtin admin', async () => {
      prismaMock.admin.findUnique
        .mockResolvedValueOnce(mockSuperAdmin)
        .mockResolvedValueOnce(mockAdmin);
      prismaMock.admin.delete.mockResolvedValue(mockAdmin);
      const res = await supertest(app)
        .delete('/api/v1/admins/admin-1')
        .set(adminAuth());
      expect(res.status).toBe(200);
    });

    it('rejects deleting built-in admin', async () => {
      const builtInAdmin = { ...mockAdmin, isBuiltin: true };
      prismaMock.admin.findUnique
        .mockResolvedValueOnce(mockSuperAdmin)
        .mockResolvedValueOnce(builtInAdmin);
      const res = await supertest(app)
        .delete('/api/v1/admins/admin-1')
        .set(adminAuth());
      expect(res.status).toBe(403);
    });
  });
});
