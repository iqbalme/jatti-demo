import { Request, Response, NextFunction } from 'express';
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
        source?: 'admin' | 'alumni';
      };
    }
  }
}

const authProvider = (process.env.AUTH_PROVIDER || 'supabase') as 'supabase' | 'local';

async function lookupUser(decoded: { id: string; email: string; role: string; source?: string }) {
  if (decoded.source === 'alumni') {
    const alumni = await prisma.alumni.findUnique({ where: { id: decoded.id } });
    if (!alumni) return null;
    return { id: alumni.id, email: alumni.email || '', role: 'user', fullName: alumni.name, source: 'alumni' as const };
  }
  const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
  if (!admin) return null;
  return { id: admin.id, email: admin.email, role: admin.role, fullName: admin.name, source: 'admin' as const };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized: missing token');
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyToken(token);
    const user = await lookupUser(decoded);
    if (!user) return sendError(res, 401, 'Unauthorized: user not found');

    req.user = user;
    return next();
  } catch {
    return sendError(res, 401, 'Unauthorized: invalid token');
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);

  try {
    const decoded = verifyToken(token);
    const user = await lookupUser(decoded);
    if (user) req.user = user;
  } catch {}
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
