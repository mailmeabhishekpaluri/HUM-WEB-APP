import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'));

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { userId, entityType, action, dateFrom, dateTo, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (userId) where.userId = String(userId);
    if (entityType) where.entityType = String(entityType);
    if (action) where.action = String(action);
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = new Date(String(dateFrom));
      if (dateTo) where.timestamp.lte = new Date(String(dateTo));
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { timestamp: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
});

export default router;
