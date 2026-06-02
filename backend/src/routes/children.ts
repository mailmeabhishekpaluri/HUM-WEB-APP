import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { childSchema } from '../lib/validators';
import * as childService from '../services/child.service';
import { logAudit } from '../services/audit.service';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// List children
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role === 'VOLUNTEER') return res.status(403).json({ error: 'Access denied' });
    const cciId = req.query.cciId as string | undefined;
    const children = await childService.listChildren(req.user!.id, req.user!.role, cciId);
    res.json(children);
  } catch (err) { next(err); }
});

// Create child
router.post('/', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const data = childSchema.parse(req.body);
    const child = await childService.createChild(data);
    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'CHILD', entityId: child.id, action: 'CREATED', ipAddress: req.ip });
    res.status(201).json(child);
  } catch (err) { next(err); }
});

// Reports — must come before /:id to avoid route collision
router.get('/reports/beneficiary', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const report = await childService.generateBeneficiaryReport(
      req.query.cciId as string,
      req.query.dateFrom as string,
      req.query.dateTo as string,
    );
    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'REPORT', entityId: 'beneficiary', action: 'EXPORTED', newValue: req.query as object, ipAddress: req.ip });
    res.json(report);
  } catch (err) { next(err); }
});

// Attendance bulk — must come before /:id
router.post('/attendance/bulk', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const result = await childService.markAttendanceBulk(req.body.records, req.user!.id);
    res.json(result);
  } catch (err) { next(err); }
});

// Batch attendance sheet for a CCI — must come before /:id
router.get('/cci/:cciId/attendance-sheet', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const children = await prisma.child.findMany({
      where: { cciId: req.params.cciId, isActive: true },
      select: { id: true, childId: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    });
    res.json(children);
  } catch (err) { next(err); }
});

// Case event amendment — must come before /:id
router.post('/cases/:caseEventId/amend', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const amendment = await childService.amendCaseEvent(req.params.caseEventId, req.body.amendment, req.user!.id);
    res.status(201).json(amendment);
  } catch (err) { next(err); }
});

// Get child
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role === 'VOLUNTEER') return res.status(403).json({ error: 'Access denied' });
    const child = await childService.getChild(req.params.id, req.user!.role);
    if (req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'PROGRAM_MANAGER') {
      await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'CHILD', entityId: req.params.id, action: 'VIEWED', ipAddress: req.ip });
    }
    res.json(child);
  } catch (err) { next(err); }
});

// Update child
router.patch('/:id', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const child = await childService.updateChild(req.params.id, req.body);
    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'CHILD', entityId: child.id, action: 'UPDATED', newValue: req.body, ipAddress: req.ip });
    res.json(child);
  } catch (err) { next(err); }
});

// Attendance for a child
router.get('/:id/attendance', async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role === 'VOLUNTEER') return res.status(403).json({ error: 'Access denied' });
    const records = await childService.getAttendance(req.params.id, Number(req.query.months) || 3);
    res.json(records);
  } catch (err) { next(err); }
});

// Mark single attendance record
router.post('/:id/attendance', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const record = await prisma.attendanceRecord.create({
      data: {
        childId: req.params.id,
        date: new Date(req.body.date || Date.now()),
        sessionType: req.body.sessionType,
        status: req.body.status,
        note: req.body.note || req.body.notes,
        markedById: req.user!.id,
      },
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});

// Get all health records (growth + vaccinations + illnesses)
router.get('/:id/health', async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role === 'VOLUNTEER') return res.status(403).json({ error: 'Access denied' });
    const [growth, vaccinations, illnesses] = await Promise.all([
      prisma.healthGrowth.findMany({ where: { childId: req.params.id }, orderBy: { date: 'desc' } }),
      prisma.vaccination.findMany({ where: { childId: req.params.id }, orderBy: { recommendedDate: 'asc' } }),
      prisma.illness.findMany({ where: { childId: req.params.id }, orderBy: { date: 'desc' } }),
    ]);
    res.json({ growth, vaccinations, illnesses });
  } catch (err) { next(err); }
});

// Unified health POST — dispatch by type
router.post('/:id/health', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const { type, ...body } = req.body;
    let record;
    if (type === 'GROWTH') record = await childService.addGrowthRecord(req.params.id, body, (req.user as any).name || req.user!.id);
    else if (type === 'VACCINATION') record = await childService.addVaccination(req.params.id, body);
    else if (type === 'ILLNESS') record = await childService.addIllness(req.params.id, body);
    else return res.status(400).json({ error: 'Invalid health record type' });
    res.status(201).json(record);
  } catch (err) { next(err); }
});

// Get progress notes
router.get('/:id/progress', async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role === 'VOLUNTEER') return res.status(403).json({ error: 'Access denied' });
    const notes = await prisma.progressNote.findMany({
      where: { childId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notes);
  } catch (err) { next(err); }
});

// Get case events
router.get('/:id/cases', async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role === 'VOLUNTEER') return res.status(403).json({ error: 'Access denied' });
    const events = await prisma.caseEvent.findMany({
      where: { childId: req.params.id },
      orderBy: { date: 'desc' },
      include: { amendments: true },
    });
    const role = req.user!.role;
    const sanitized = (role !== 'SUPER_ADMIN' && role !== 'PROGRAM_MANAGER')
      ? events.map(e => e.isSensitive ? { ...e, description: '[Sensitive — access restricted]', amendments: [] } : e)
      : events;
    res.json(sanitized);
  } catch (err) { next(err); }
});

// Health
router.post('/:id/health/growth', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const record = await childService.addGrowthRecord(req.params.id, req.body, (req.user as any).name || req.user!.id);
    res.status(201).json(record);
  } catch (err) { next(err); }
});

router.post('/:id/health/vaccination', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const record = await childService.addVaccination(req.params.id, req.body);
    res.status(201).json(record);
  } catch (err) { next(err); }
});

router.post('/:id/health/illness', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const record = await childService.addIllness(req.params.id, req.body);
    res.status(201).json(record);
  } catch (err) { next(err); }
});

// Progress notes
router.post('/:id/progress', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const note = await childService.addProgressNote(req.params.id, req.body, req.user!.id);
    res.status(201).json(note);
  } catch (err) { next(err); }
});

// Case events
router.post('/:id/cases', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'), async (req: AuthRequest, res, next) => {
  try {
    const event = await childService.addCaseEvent(req.params.id, req.body, req.user!.id);
    res.status(201).json(event);
  } catch (err) { next(err); }
});

export default router;
