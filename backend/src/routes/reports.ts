import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '../lib/prisma';
import { logAudit } from '../services/audit.service';

const router = Router();
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'));

// Volunteer hours summary
router.get('/volunteer-hours', async (req: AuthRequest, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const where: any = { attended: true };
    if (dateFrom || dateTo) {
      where.opportunity = { dateTime: {} };
      if (dateFrom) where.opportunity.dateTime.gte = new Date(String(dateFrom));
      if (dateTo) where.opportunity.dateTime.lte = new Date(String(dateTo));
    }

    const registrations = await prisma.eventRegistration.findMany({
      where,
      include: {
        volunteer: { include: { user: { select: { name: true } }, skills: { include: { skill: true } } } },
        opportunity: { select: { title: true, programmeArea: true, dateTime: true, durationMinutes: true } },
      },
    });

    const byVolunteer: Record<string, any> = {};
    for (const reg of registrations) {
      const vid = reg.volunteerId;
      if (!byVolunteer[vid]) {
        byVolunteer[vid] = {
          name: reg.volunteer.user.name,
          totalHours: 0,
          sessions: 0,
          programmes: new Set<string>(),
        };
      }
      byVolunteer[vid].totalHours += reg.hoursLogged || 0;
      byVolunteer[vid].sessions++;
      byVolunteer[vid].programmes.add(reg.opportunity.programmeArea);
    }

    const summary = Object.values(byVolunteer).map((v: any) => ({
      ...v,
      programmes: Array.from(v.programmes),
    })).sort((a: any, b: any) => b.totalHours - a.totalHours);

    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'REPORT', entityId: 'volunteer-hours', action: 'EXPORTED', ipAddress: req.ip });
    res.json({ generatedAt: new Date().toISOString(), totalVolunteers: summary.length, data: summary });
  } catch (err) { next(err); }
});

// CCI compliance summary
router.get('/compliance-summary', async (req: AuthRequest, res, next) => {
  try {
    const ccis = await prisma.cCI.findMany({
      include: { complianceItems: true },
      orderBy: { name: 'asc' },
    });

    const data = ccis.map(cci => {
      const total = cci.complianceItems.length;
      const compliant = cci.complianceItems.filter(i => i.status === 'COMPLIANT').length;
      const overdue = cci.complianceItems.filter(i => i.status === 'OVERDUE').length;
      return {
        id: cci.id,
        name: cci.name,
        district: cci.district,
        score: total > 0 ? Math.round((compliant / total) * 100) : 100,
        total,
        compliant,
        overdue,
        status: cci.status,
      };
    });

    res.json({ generatedAt: new Date().toISOString(), data });
  } catch (err) { next(err); }
});

// Attendance summary
router.get('/attendance-summary', async (req: AuthRequest, res, next) => {
  try {
    const { cciId, dateFrom, dateTo } = req.query;
    const where: any = {};
    if (cciId) where.child = { cciId: String(cciId) };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(String(dateFrom));
      if (dateTo) where.date.lte = new Date(String(dateTo));
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: { child: { select: { childId: true, firstName: true, lastName: true, cciId: true, cci: { select: { name: true } } } } },
    });

    const byChild: Record<string, any> = {};
    for (const r of records) {
      const key = r.childId;
      if (!byChild[key]) byChild[key] = { ...r.child, total: 0, present: 0, absent: 0 };
      byChild[key].total++;
      if (r.status === 'PRESENT') byChild[key].present++;
      if (r.status === 'ABSENT') byChild[key].absent++;
    }

    const data = Object.values(byChild).map((c: any) => ({
      ...c,
      attendanceRate: c.total > 0 ? Math.round((c.present / c.total) * 100) : 0,
    }));

    res.json({ generatedAt: new Date().toISOString(), totalChildren: data.length, data });
  } catch (err) { next(err); }
});

export default router;
