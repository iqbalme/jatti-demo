import { Router } from 'express';
import { prisma } from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendError } from '../utils/response';

const router = Router();

router.get('/alumni', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const format = (req.query.format as string) || 'json';
    const data = await prisma.alumni.findMany({
      include: { education: true, certificates: true, organizations: true, businesses: true, socialLinks: true },
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=alumni.json');
      return res.json(data);
    }

    if (format === 'csv') {
      const headers = ['NIK', 'Nama', 'Jenis Kelamin', 'Status Perkawinan', 'Telepon', 'Email', 'Provinsi', 'Alamat', 'Status Karir', 'Institusi', 'Posisi'];
      const rows = data.map((a) => [a.nik || '', a.name, a.gender || '', a.maritalStatus || '', a.phone || '', a.email || '', a.province || '', (a.address || '').replace(/"/g, '""'), a.careerStatus || '', a.institutionName || '', a.position || ''].map((v) => `"${v}"`).join(','));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=alumni.csv');
      return res.send([headers.join(','), ...rows].join('\n'));
    }

    return sendError(res, 400, 'Unsupported format. Use: json, csv');
  } catch (err) {
    sendError(res, 500, (err as Error).message);
  }
});

export default router as Router;
