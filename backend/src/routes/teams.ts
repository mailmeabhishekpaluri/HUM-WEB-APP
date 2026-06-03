import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Programme } from '@prisma/client';
import { assignToProgramme, removeAssignment, listProgrammeTeam, ratioStatus } from '../services/team.service';

const router = Router();
router.use(requireAuth);

// View a programme's dedicated team — managers + CCI managers
router.get('/:programme', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const team = await listProgrammeTeam(req.params.programme as Programme);
    res.json(team);
  } catch (err) { next(err); }
});

// Ratio helper — managers planning a session
router.get('/:programme/ratio', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const students = Number(req.query.students) || 0;
    const volunteers = Number(req.query.volunteers) || 0;
    res.json(ratioStatus(students, volunteers));
  } catch (err) { next(err); }
});

// Assign a volunteer to a programme roster — managers only
router.post('/:programme/assign', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const { volunteerId, teamRole } = req.body;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId required' });
    const assignment = await assignToProgramme(
      volunteerId,
      req.params.programme as Programme,
      teamRole || 'DEDICATED',
      req.user!.id,
    );
    res.status(201).json(assignment);
  } catch (err) { next(err); }
});

// Remove a volunteer from a programme roster — managers only
router.delete('/:programme/assign/:volunteerId', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    await removeAssignment(req.params.volunteerId, req.params.programme as Programme);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
