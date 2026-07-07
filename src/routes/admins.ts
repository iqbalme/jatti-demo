import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole, authProvider } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { getSupabaseAdmin } from '../utils/supabase';
import { prisma } from '../utils/db';

const router = Router();

router.use(requireAuth);
router.use(requireRole('super_admin'));

router.get('/', async (_req, res) => {
  try {
    const list = await prisma.admin.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, role: true, isBuiltin: true, createdAt: true, updatedAt: true },
    });
    sendSuccess(res, list);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) {
      return sendError(res, 400, 'Email, name, and password are required');
    }

    if (authProvider === 'local') {
      const hashed = await bcrypt.hash(password, 10);
      const admin = await prisma.admin.create({
        data: { email, name, password: hashed, role: role === 'super_admin' ? 'super_admin' : 'admin' },
      });
      return sendSuccess(res, {
        id: admin.id, email: admin.email, name: admin.name,
        role: admin.role, isBuiltin: admin.isBuiltin, createdAt: admin.createdAt, updatedAt: admin.updatedAt,
      }, 201);
    }

    const supabase = getSupabaseAdmin();
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const existingUser = authUsers.users.find(u => u.email === email);

    if (existingUser) {
      await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: { role: role === 'super_admin' ? 'super_admin' : 'admin', full_name: name },
      });
    } else {
      const { error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: role === 'super_admin' ? 'super_admin' : 'admin', full_name: name },
      });
      if (authError) return sendError(res, 400, authError.message);
    }

    const newRole = role === 'super_admin' ? 'super_admin' : 'admin';
    const existingAdmin = await prisma.admin.findUnique({ where: { email } });

    let admin: Record<string, unknown>;
    if (existingAdmin) {
      admin = await prisma.admin.update({
        where: { email },
        data: { name, role: newRole },
      });
    } else {
      admin = await prisma.admin.create({
        data: { email, name, role: newRole, isBuiltin: false },
      });
    }

    sendSuccess(res, admin, 201);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.put('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'super_admin'].includes(role)) {
      return sendError(res, 400, 'Role must be admin or super_admin');
    }

    const existing = await prisma.admin.findUnique({ where: { id: req.params.id } });
    if (!existing) return sendError(res, 404, 'Admin not found');
    if (existing.isBuiltin) return sendError(res, 403, 'Cannot change role of built-in admin');
    if (!req.user!.isBuiltin) {
      if (existing.id === req.user!.id) return sendError(res, 403, 'Tidak bisa mengubah role sendiri');
      if (existing.role === req.user!.role) return sendError(res, 403, 'Tidak bisa mengubah role admin yang selevel');
    }

    if (authProvider !== 'local') {
      const supabase = getSupabaseAdmin();
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers.users.find(u => u.email === existing.email);
      if (authUser) {
        await supabase.auth.admin.updateUserById(authUser.id, {
          user_metadata: { ...authUser.user_metadata, role },
        });
      }
    }

    const updated = await prisma.admin.update({
      where: { id: req.params.id },
      data: { role },
    });
    sendSuccess(res, updated);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.put('/:id/reset-password', async (req, res) => {
  try {
    const existing = await prisma.admin.findUnique({ where: { id: req.params.id } });
    if (!existing) return sendError(res, 404, 'Admin not found');
    if (existing.isBuiltin) return sendError(res, 403, 'Cannot reset password of built-in admin');

    if (authProvider !== 'local') {
      const supabase = getSupabaseAdmin();
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers.users.find(u => u.email === existing.email);
      if (authUser) {
        await supabase.auth.admin.updateUserById(authUser.id, {
          password: 'admin123',
        });
      }
    }

    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.admin.update({
      where: { id: req.params.id },
      data: { password: hashed },
    });
    sendSuccess(res, { message: 'Password berhasil direset ke admin123' });
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.admin.findUnique({ where: { id: req.params.id } });
    if (!existing) return sendError(res, 404, 'Admin not found');
    if (existing.isBuiltin) return sendError(res, 403, 'Cannot delete built-in admin');
    if (existing.email === req.user!.email) return sendError(res, 403, 'Cannot delete yourself');

    if (authProvider !== 'local') {
      const supabase = getSupabaseAdmin();
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers.users.find(u => u.email === existing.email);
      if (authUser) {
        await supabase.auth.admin.deleteUser(authUser.id).catch(() => {});
      }
    }

    const deleteAlumni = req.query.deleteAlumni as string;
    if (deleteAlumni && existing.email) {
      await prisma.alumni.deleteMany({ where: { email: existing.email } }).catch(() => {});
    }

    await prisma.admin.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Admin deleted' });
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

export default router as Router;
