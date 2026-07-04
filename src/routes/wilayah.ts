import { Router } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const parent = req.query.parent as string | undefined;

    let rows: { id: number; kode: string; nama: string }[];

    if (!parent) {
      rows = await prisma.$queryRaw<{ id: number; kode: string; nama: string }[]>`
        SELECT id, kode, nama FROM wilayah WHERE LENGTH(kode) = 2 ORDER BY nama
      `;
    } else {
      const level = parent.length;
      const targetLen = level < 6 ? level + 2 : level + 4;
      rows = await prisma.$queryRaw<{ id: number; kode: string; nama: string }[]>`
        SELECT id, kode, nama FROM wilayah WHERE LENGTH(kode) = ${targetLen} AND LEFT(kode, ${level}) = ${parent} ORDER BY nama
      `;
    }

    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

export default router as Router;
