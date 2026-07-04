import { Router } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, countries);
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

export default router as Router;
