import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getDashboardStats } from '../services/cci.service';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAuth);

router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) { next(err); }
});

router.get('/summary', async (_req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const in60days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [cciCount, childCount, volunteerCount, pendingVolunteers, complianceItems, deadlines, activity] = await Promise.all([
      prisma.cCI.count({ where: { status: 'ACTIVE' } }),
      prisma.child.count({ where: { isActive: true } }),
      prisma.volunteerProfile.count({ where: { accountStatus: 'ACTIVE' } }),
      prisma.volunteerProfile.count({ where: { accountStatus: 'PENDING' } }),
      prisma.complianceItem.findMany({ where: { completedAt: null } }),
      prisma.complianceItem.findMany({
        where: { completedAt: null, dueDate: { lte: in60days } },
        include: { cci: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 8,
      }),
      prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 8,
        include: { user: { select: { name: true } } },
      }),
    ]);

    const total = complianceItems.length;
    const compliant = complianceItems.filter(i => i.status === 'COMPLIANT').length;
    const complianceScore = total > 0 ? Math.round((compliant / total) * 100) : 100;

    const upcomingDeadlines = deadlines.map(d => {
      const days = Math.ceil((new Date(d.dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const severity = days <= 7 ? 'HIGH' : days <= 30 ? 'MEDIUM' : 'LOW';
      return {
        id: d.id,
        title: String(d.type).replace(/_/g, ' '),
        cciName: d.cci?.name || '—',
        dueDate: d.dueDate,
        severity,
      };
    });

    const recentActivity = activity.map(a => ({
      id: a.id,
      message: `${a.user?.name || 'Someone'} ${String(a.action).toLowerCase()} a ${String(a.entityType).toLowerCase()}`,
      timestamp: a.timestamp,
    }));

    res.json({ cciCount, childCount, volunteerCount, pendingVolunteers, complianceScore, upcomingDeadlines, recentActivity });
  } catch (err) { next(err); }
});

export default router;
