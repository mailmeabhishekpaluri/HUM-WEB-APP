import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '../lib/prisma';
import { logAudit } from '../services/audit.service';

const router = Router();
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'));

// Monthly Beneficiary Register — sex-disaggregated counts per CCI
async function beneficiaryHandler(req: AuthRequest, res: any, next: any) {
  try {
    const { month, cciId } = req.query;
    const where: any = {};
    if (cciId && cciId !== 'all') where.cciId = String(cciId);
    if (month) {
      const [y, m] = String(month).split('-').map(Number);
      if (y && m) {
        const end = new Date(y, m, 0, 23, 59, 59);
        where.admissionDate = { lte: end };
      }
    }

    const children = await prisma.child.findMany({
      where,
      include: { cci: { select: { name: true } } },
    });

    const byCCIMap: Record<string, any> = {};
    for (const c of children) {
      const key = c.cciId || 'unassigned';
      if (!byCCIMap[key]) {
        byCCIMap[key] = { cciName: c.cci?.name || 'Unassigned', name: c.cci?.name || 'Unassigned', male: 0, female: 0, other: 0, total: 0 };
      }
      byCCIMap[key].total++;
      if (c.gender === 'MALE') byCCIMap[key].male++;
      else if (c.gender === 'FEMALE') byCCIMap[key].female++;
      else byCCIMap[key].other++;
    }

    const data = Object.values(byCCIMap);
    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'REPORT', entityId: 'beneficiary', action: 'EXPORTED', ipAddress: req.ip });
    res.json({ generatedAt: new Date().toISOString(), totalChildren: children.length, data, byCCI: data });
  } catch (err) { next(err); }
}

// Volunteer hours summary
async function volunteerHoursHandler(req: AuthRequest, res: any, next: any) {
  try {
    const from = req.query.from || req.query.dateFrom;
    const to = req.query.to || req.query.dateTo;
    const where: any = { attended: true };
    if (from || to) {
      where.opportunity = { dateTime: {} };
      if (from) where.opportunity.dateTime.gte = new Date(String(from));
      if (to) where.opportunity.dateTime.lte = new Date(String(to));
    }

    const registrations = await prisma.eventRegistration.findMany({
      where,
      include: {
        volunteer: { include: { user: { select: { name: true } } } },
        opportunity: { select: { title: true, programmeArea: true, dateTime: true, durationMinutes: true } },
      },
    });

    const byVolunteer: Record<string, any> = {};
    for (const reg of registrations) {
      const vid = reg.volunteerId;
      if (!byVolunteer[vid]) {
        byVolunteer[vid] = { name: reg.volunteer.user.name, totalHours: 0, sessions: 0, programmes: new Set<string>() };
      }
      byVolunteer[vid].totalHours += reg.hoursLogged || 0;
      byVolunteer[vid].sessions++;
      byVolunteer[vid].programmes.add(reg.opportunity.programmeArea);
    }

    const summary = Object.values(byVolunteer).map((v: any) => ({
      ...v,
      programmes: Array.from(v.programmes).join('; '),
    })).sort((a: any, b: any) => b.totalHours - a.totalHours);

    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'REPORT', entityId: 'volunteer-hours', action: 'EXPORTED', ipAddress: req.ip });
    res.json({ generatedAt: new Date().toISOString(), totalVolunteers: summary.length, data: summary });
  } catch (err) { next(err); }
}

// CCI compliance summary
async function complianceHandler(req: AuthRequest, res: any, next: any) {
  try {
    const ccis = await prisma.cCI.findMany({ include: { complianceItems: true }, orderBy: { name: 'asc' } });
    const data = ccis.map(cci => {
      const total = cci.complianceItems.length;
      const compliant = cci.complianceItems.filter(i => i.status === 'COMPLIANT').length;
      const overdue = cci.complianceItems.filter(i => i.status === 'OVERDUE').length;
      return {
        id: cci.id, name: cci.name, district: cci.district,
        score: total > 0 ? Math.round((compliant / total) * 100) : 100,
        total, compliant, overdue, status: cci.status,
      };
    });
    res.json({ generatedAt: new Date().toISOString(), data });
  } catch (err) { next(err); }
}

// Attendance summary
async function attendanceHandler(req: AuthRequest, res: any, next: any) {
  try {
    const { cciId } = req.query;
    const from = req.query.from || req.query.dateFrom;
    const to = req.query.to || req.query.dateTo;
    const where: any = {};
    if (cciId && cciId !== 'all') where.child = { cciId: String(cciId) };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(String(from));
      if (to) where.date.lte = new Date(String(to));
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: { child: { select: { childId: true, firstName: true, lastName: true, cciId: true, cci: { select: { name: true } } } } },
    });

    const byChild: Record<string, any> = {};
    for (const r of records) {
      const key = r.childId;
      if (!byChild[key]) byChild[key] = { childId: r.child.childId, firstName: r.child.firstName, lastName: r.child.lastName, cciName: r.child.cci?.name, total: 0, present: 0, absent: 0 };
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
}

// Routes (names match frontend) + legacy aliases
router.get('/beneficiary', beneficiaryHandler);
router.get('/volunteer-hours', volunteerHoursHandler);
router.get('/compliance', complianceHandler);
router.get('/compliance-summary', complianceHandler);
router.get('/attendance', attendanceHandler);
router.get('/attendance-summary', attendanceHandler);

export default router;
