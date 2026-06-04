import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getHealthDashboard, getCheckupWithRoster, recordCheckupMeasurements } from '../services/health.service';
import { assignToProgramme, removeAssignment, listProgrammeTeam } from '../services/team.service';

const router = Router();
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'));

router.get('/dashboard', async (_req: AuthRequest, res, next) => {
  try {
    res.json(await getHealthDashboard());
  } catch (err) { next(err); }
});

router.get('/team', async (_req: AuthRequest, res, next) => {
  try {
    res.json(await listProgrammeTeam('P4_HEALTH_NUTRITION'));
  } catch (err) { next(err); }
});

router.post('/team', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const { volunteerId, teamRole } = req.body;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId required' });
    const assignment = await assignToProgramme(volunteerId, 'P4_HEALTH_NUTRITION', teamRole || 'DEDICATED', req.user!.id);
    res.status(201).json(assignment);
  } catch (err) { next(err); }
});

router.delete('/team/:volunteerId', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    await removeAssignment(req.params.volunteerId, 'P4_HEALTH_NUTRITION');
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/checkups/:opportunityId', async (req: AuthRequest, res, next) => {
  try {
    const data = await getCheckupWithRoster(req.params.opportunityId);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Opportunity not found') return res.status(404).json({ error: err.message });
    next(err);
  }
});

router.post('/checkups/:opportunityId/measurements', async (req: AuthRequest, res, next) => {
  try {
    const records = Array.isArray(req.body?.records) ? req.body.records : [];
    const measuredBy = req.user?.name || req.user?.email || req.user?.id || 'unknown';
    const counts = await recordCheckupMeasurements(req.params.opportunityId, records, measuredBy);
    res.json(counts);
  } catch (err: any) {
    if (err.message === 'Opportunity not found' || err.message?.includes('QUARTERLY_CHECKUP')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
