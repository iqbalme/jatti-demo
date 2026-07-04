import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-dev-secret-change-in-production';

export function signToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as { id: string; email: string; role: string; iat: number; exp: number };
}
