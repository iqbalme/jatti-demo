import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../utils/supabase';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../utils/db';
import { sendError } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        fullName?: string;
        avatarUrl?: string;
      };
    }
  }
}

const authProvider = (process.env.AUTH_PROVIDER || 'supabase') as 'supabase' | 'local';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized: missing token');
  }

  const token = authHeader.slice(7);

  if (authProvider === 'local') {
    try {
      const decoded = verifyToken(token);
      const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
      if (!admin) return sendError(res, 401, 'Unauthorized: admin not found');

      req.user = {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        fullName: admin.name,
      };
      return next();
    } catch {
      return sendError(res, 401, 'Unauthorized: invalid token');
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return sendError(res, 401, 'Unauthorized: invalid token');
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? '',
    role: data.user.user_metadata?.role ?? 'alumni',
    fullName: data.user.user_metadata?.full_name,
    avatarUrl: data.user.user_metadata?.avatar_url,
  };

  next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);

  if (authProvider === 'local') {
    try {
      const decoded = verifyToken(token);
      const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
      if (admin) {
        req.user = { id: admin.id, email: admin.email, role: admin.role, fullName: admin.name };
      }
    } catch {}
    return next();
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase.auth.getUser(token).catch(() => ({ data: null }));
  if (data?.user) {
    req.user = {
      id: data.user.id,
      email: data.user.email ?? '',
      role: data.user.user_metadata?.role ?? 'alumni',
      fullName: data.user.user_metadata?.full_name,
    };
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 403, 'Forbidden: insufficient role');
    }
    next();
  };
}

export { authProvider };
