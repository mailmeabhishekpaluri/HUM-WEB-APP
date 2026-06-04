import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '../lib/prisma';
import { Programme, ReadingLevel, DedicatedTeamRole } from '@prisma/client';
import { assignToProgramme, removeAssignment, listProgrammeTeam } from '../services/team.service';
import { getReadingProgress, recordAssessment } from '../services/library.service';

const router = Router();
router.use(requireAuth);

// Reading progress dashboard — all four library-relevant roles see the same shape.
router.get(
  '/progress',
  requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'VOLUNTEER'),
  async (req: AuthRequest, res, next) => {
    try {
      const cciId = (req.query.cciId as string) || undefined;
      res.json(await getReadingProgress(cciId));
    } catch (err) { next(err); }
  },
);

// Record a single Pratham-style reading assessment.
router.post(
  '/assessments',
  requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'VOLUNTEER'),
  async (req: AuthRequest, res, next) => {
    try {
      const { childId, opportunityId, date, level, bookTitle, prathamGroup, notes } = req.body;
      if (!childId || !date || !level) {
        return res.status(400).json({ error: 'childId, date and level are required' });
      }
      const assessment = await recordAssessment(
        { childId, opportunityId, date, level: level as ReadingLevel, bookTitle, prathamGroup, notes },
        req.user!.id,
      );
      res.status(201).json(assessment);
    } catch (err) { next(err); }
  },
);

// Dedicated Library team roster (read).
router.get(
  '/team',
  requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'VOLUNTEER'),
  async (_req: AuthRequest, res, next) => {
    try {
      res.json(await listProgrammeTeam(Programme.P5_LIBRARY));
    } catch (err) { next(err); }
  },
);

// Add a volunteer to the Library roster.
router.post(
  '/team',
  requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'),
  async (req: AuthRequest, res, next) => {
    try {
      const { volunteerId, teamRole } = req.body;
      if (!volunteerId) return res.status(400).json({ error: 'volunteerId required' });
      const assignment = await assignToProgramme(
        volunteerId,
        Programme.P5_LIBRARY,
        (teamRole as DedicatedTeamRole) || DedicatedTeamRole.DEDICATED,
        req.user!.id,
      );
      res.status(201).json(assignment);
    } catch (err) { next(err); }
  },
);

// Remove a volunteer from the Library roster.
router.delete(
  '/team/:volunteerId',
  requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'),
  async (req: AuthRequest, res, next) => {
    try {
      await removeAssignment(req.params.volunteerId, Programme.P5_LIBRARY);
      res.json({ ok: true });
    } catch (err) { next(err); }
  },
);

// Upcoming Library activities. Opportunity has no relation back to CCI, so we
// hydrate the CCI side-by-side ourselves to keep the payload shape predictable.
router.get(
  '/activities',
  requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'VOLUNTEER'),
  async (_req: AuthRequest, res, next) => {
    try {
      const activities = await prisma.opportunity.findMany({
        where: { programmeArea: Programme.P5_LIBRARY, dateTime: { gte: new Date() } },
        orderBy: { dateTime: 'asc' },
        take: 20,
      });
      const cciIds = Array.from(new Set(activities.map(a => a.cciId).filter((x): x is string => !!x)));
      const ccis = cciIds.length
        ? await prisma.cCI.findMany({ where: { id: { in: cciIds } }, select: { id: true, name: true, district: true } })
        : [];
      const cciMap = new Map(ccis.map(c => [c.id, c]));
      res.json(activities.map(a => ({ ...a, cci: a.cciId ? cciMap.get(a.cciId) ?? null : null })));
    } catch (err) { next(err); }
  },
);

export default router;
