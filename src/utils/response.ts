import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  res.status(200).json({
    success: true,
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ success: false, error: message });
}
