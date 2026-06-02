import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as volunteerService from '../services/volunteer.service';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// Skills list — placed before /:id to avoid route conflict
router.get('/skills/list', async (_req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({ where: { isApproved: true }, orderBy: { name: 'asc' } });
    res.json(skills);
  } catch (err) { next(err); }
});

// List opportunities
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const opps = await volunteerService.listOpportunities(req.query.status as string);
    res.json(opps);
  } catch (err) { next(err); }
});

// Create opportunity
router.post('/', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const opp = await volunteerService.createOpportunity({ ...req.body, createdById: req.user!.id });
    res.status(201).json(opp);
  } catch (err) { next(err); }
});

// Get opportunity details
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const opp = await prisma.opportunity.findUnique({
      where: { id: req.params.id },
      include: {
        requiredSkills: { include: { skill: true } },
        registrations: {
          include: { volunteer: { include: { user: { select: { name: true } } } } },
        },
      },
    });
    if (!opp) return res.status(404).json({ error: 'Not found' });
    res.json(opp);
  } catch (err) { next(err); }
});

// List registrations for an opportunity (for attendance marking)
router.get('/:id/registrations', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const regs = await prisma.eventRegistration.findMany({
      where: { opportunityId: req.params.id },
      include: { volunteer: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    res.json(regs.map(r => ({
      id: r.id,
      userId: r.volunteer.user.id,
      attended: r.attended,
      volunteer: { user: { name: r.volunteer.user.name, email: r.volunteer.user.email } },
    })));
  } catch (err) { next(err); }
});

// Register for opportunity
router.post('/:id/register', async (req: AuthRequest, res, next) => {
  try {
    const reg = await volunteerService.registerForOpportunity(req.params.id, req.user!.id);
    res.status(201).json(reg);
  } catch (err) { next(err); }
});

// Mark attendance for an event — supports batch (attendedVolunteerIds) or single (volunteerUserId, attended)
router.post('/:id/attendance', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const { attendedVolunteerIds, volunteerUserId, attended } = req.body;
    if (Array.isArray(attendedVolunteerIds)) {
      const regs = await prisma.eventRegistration.findMany({
        where: { opportunityId: req.params.id },
        include: { volunteer: { select: { userId: true } } },
      });
      const attendedSet = new Set(attendedVolunteerIds);
      for (const r of regs) {
        await volunteerService.markAttendance(req.params.id, r.volunteer.userId, attendedSet.has(r.volunteer.userId), req.user!.id);
      }
      return res.json({ marked: regs.length });
    }
    const result = await volunteerService.markAttendance(req.params.id, volunteerUserId, attended, req.user!.id);
    res.json(result);
  } catch (err) { next(err); }
});

// Update opportunity status
router.patch('/:id/status', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const opp = await prisma.opportunity.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    res.json(opp);
  } catch (err) { next(err); }
});

export default router;
