import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getDashboardStats } from '../services/cci.service';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAuth);
// Org-wide dashboards are staff-only; volunteers have their own personal dashboard
router.use(requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'));

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

router.get('/programmes', async (_req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      classSessionsThisWeek,
      pendingPlans,
      pendingFeedback,
      openSubstitutions,
      sundayP2,
      sundayP3,
      upcomingCheckup,
      monthlyAwareness,
      libraryUpcoming,
      readingTotals,
    ] = await Promise.all([
      // P1 — class sessions this week (any subject), plan/feedback nudges, open subs
      prisma.classSession.count({ where: { date: { gte: weekStart, lt: weekEnd } } }),
      prisma.classSession.count({ where: { date: { gte: now, lte: horizon }, lessonPlanSubmittedAt: null, status: { in: ['SCHEDULED', 'SUBSTITUTION_REQUESTED'] } } }),
      prisma.classSession.count({ where: { date: { lt: now }, feedbackSubmittedAt: null, status: { in: ['SCHEDULED', 'SUBSTITUTION_REQUESTED'] } } }),
      prisma.substitutionRequest.count({ where: { status: 'OPEN' } }),
      // P2 / P3 — Sunday sessions in the next 30 days
      prisma.opportunity.count({ where: { programmeArea: 'P2_SEL', dateTime: { gte: now, lte: horizon } } }),
      prisma.opportunity.count({ where: { programmeArea: 'P3_DIGITAL_LITERACY', dateTime: { gte: now, lte: horizon } } }),
      // P4 — next quarterly checkup + next monthly awareness
      prisma.opportunity.findFirst({ where: { programmeArea: 'P4_HEALTH_NUTRITION', healthEventType: 'QUARTERLY_CHECKUP', dateTime: { gte: now } }, orderBy: { dateTime: 'asc' }, include: { cci: { select: { name: true } } } }),
      prisma.opportunity.findFirst({ where: { programmeArea: 'P4_HEALTH_NUTRITION', healthEventType: 'MONTHLY_AWARENESS', dateTime: { gte: now } }, orderBy: { dateTime: 'asc' }, include: { cci: { select: { name: true } } } }),
      // P5 — next library activity + reading-level snapshot
      prisma.opportunity.findFirst({ where: { programmeArea: 'P5_LIBRARY', dateTime: { gte: now } }, orderBy: { dateTime: 'asc' }, include: { cci: { select: { name: true } } } }),
      prisma.readingAssessment.findMany({ orderBy: { date: 'desc' }, select: { childId: true, level: true, date: true } }),
    ]);

    // Reading snapshot: each child's latest level only
    const latestByChild: Record<string, string> = {};
    for (const a of readingTotals) if (!latestByChild[a.childId]) latestByChild[a.childId] = a.level;
    const readingSnapshot: Record<string, number> = { BEGINNER: 0, LETTER: 0, WORD: 0, PARAGRAPH: 0, STORY: 0 };
    for (const l of Object.values(latestByChild)) if (readingSnapshot[l] !== undefined) readingSnapshot[l]++;

    res.json({
      P1_EDUCATION: { sessionsThisWeek: classSessionsThisWeek, pendingPlans, pendingFeedback, openSubstitutions },
      P2_SEL: { upcomingSessions: sundayP2 },
      P3_DIGITAL_LITERACY: { upcomingSessions: sundayP3 },
      P4_HEALTH_NUTRITION: {
        nextCheckup: upcomingCheckup && { date: upcomingCheckup.dateTime, cci: upcomingCheckup.cci?.name },
        nextAwareness: monthlyAwareness && { date: monthlyAwareness.dateTime, cci: monthlyAwareness.cci?.name },
      },
      P5_LIBRARY: {
        nextActivity: libraryUpcoming && { date: libraryUpcoming.dateTime, cci: libraryUpcoming.cci?.name },
        readingSnapshot,
      },
    });
  } catch (err) { next(err); }
});

export default router;
