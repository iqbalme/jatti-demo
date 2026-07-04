import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, authProvider } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { getSupabaseAdmin } from '../utils/supabase';
import { prisma } from '../utils/db';

const router = Router();

router.get('/me', requireAuth, (req, res) => {
  sendSuccess(res, {
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
    fullName: req.user!.fullName,
    avatarUrl: req.user!.avatarUrl,
  });
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { fullName, avatarUrl } = req.body;

    if (authProvider === 'local') {
      await prisma.admin.update({
        where: { id: req.user!.id },
        data: { name: fullName || undefined },
      });
      return sendSuccess(res, { message: 'Profile updated' });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.admin.updateUserById(req.user!.id, {
      user_metadata: { ...(fullName && { full_name: fullName }), ...(avatarUrl && { avatar_url: avatarUrl }) },
    });

    if (error) return sendError(res, 400, error.message);
    sendSuccess(res, { message: 'Profile updated' });
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current password and new password are required');
    }
    if (newPassword.length < 6) {
      return sendError(res, 400, 'New password must be at least 6 characters');
    }

    if (req.user!.source === 'alumni') {
      const alumni = await prisma.alumni.findUnique({ where: { id: req.user!.id } });
      if (!alumni || !alumni.password) return sendError(res, 400, 'Account not configured for password change');
      const valid = await bcrypt.compare(currentPassword, alumni.password);
      if (!valid) return sendError(res, 400, 'Current password is incorrect');
      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.alumni.update({ where: { id: req.user!.id }, data: { password: hashed } });
      return sendSuccess(res, { message: 'Password changed successfully' });
    }

    if (authProvider === 'local') {
      const admin = await prisma.admin.findUnique({ where: { id: req.user!.id } });
      if (!admin || !admin.password) return sendError(res, 400, 'Account not configured for password change');

      const valid = await bcrypt.compare(currentPassword, admin.password);
      if (!valid) return sendError(res, 400, 'Current password is incorrect');

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.admin.update({ where: { id: req.user!.id }, data: { password: hashed } });

      return sendSuccess(res, { message: 'Password changed successfully' });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.admin.updateUserById(req.user!.id, {
      password: newPassword,
    });

    if (error) return sendError(res, 400, error.message);
    sendSuccess(res, { message: 'Password changed successfully' });
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

export default router as Router;
