import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { mockAdmin } from './helpers/fixtures';

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
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
  })),
}));

import authRoutes from '../routes/auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRoutes);

function adminAuth(): { authorization: string } {
  return { authorization: 'Bearer test-token' };
}

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns current user info when authenticated', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      const res = await supertest(app)
        .get('/api/v1/auth/me')
        .set(adminAuth());
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(mockAdmin.email);
      expect(res.body.data.role).toBe(mockAdmin.role);
    });

    it('returns 401 when not authenticated', async () => {
      const res = await supertest(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 when admin not found in database', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(null);
      const res = await supertest(app)
        .get('/api/v1/auth/me')
        .set(adminAuth());
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    it('updates profile name', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      prismaMock.admin.update.mockResolvedValue({ ...mockAdmin, name: 'New Name' });
      const res = await supertest(app)
        .put('/api/v1/auth/profile')
        .set(adminAuth())
        .send({ fullName: 'New Name' });
      expect(res.status).toBe(200);
      expect(prismaMock.admin.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'New Name' } }),
      );
    });
  });

  describe('PUT /api/v1/auth/password', () => {
    it('changes password when current password is correct', async () => {
      const bcrypt = await vi.importActual<typeof import('bcryptjs')>('bcryptjs');
      const hashedCurrent = await bcrypt.hash('correct-password', 10);
      prismaMock.admin.findUnique.mockResolvedValue({ ...mockAdmin, password: hashedCurrent });
      prismaMock.admin.update.mockResolvedValue(mockAdmin);
      const res = await supertest(app)
        .put('/api/v1/auth/password')
        .set(adminAuth())
        .send({ currentPassword: 'correct-password', newPassword: 'new-password' });
      expect(res.status).toBe(200);
    });

    it('rejects when current password is wrong', async () => {
      const bcrypt = await vi.importActual<typeof import('bcryptjs')>('bcryptjs');
      const hashedCurrent = await bcrypt.hash('correct-password', 10);
      prismaMock.admin.findUnique.mockResolvedValue({ ...mockAdmin, password: hashedCurrent });
      const res = await supertest(app)
        .put('/api/v1/auth/password')
        .set(adminAuth())
        .send({ currentPassword: 'wrong-password', newPassword: 'new-password' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Current password is incorrect');
    });

    it('validates new password length', async () => {
      prismaMock.admin.findUnique.mockResolvedValue(mockAdmin);
      const res = await supertest(app)
        .put('/api/v1/auth/password')
        .set(adminAuth())
        .send({ currentPassword: 'any', newPassword: '12345' });
      expect(res.status).toBe(400);
    });
  });
});
