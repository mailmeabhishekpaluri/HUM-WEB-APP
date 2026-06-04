import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { CurriculumType, Programme } from '@prisma/client';
import { parseISTDate } from '../lib/datetime';
import * as program from '../services/program.service';

const router = Router();
router.use(requireAuth);

// Curriculum reference (SEL 12 sessions / DLAI 4 modules)
router.get('/curriculum', async (req: AuthRequest, res, next) => {
  try {
    const type = (req.query.type as CurriculumType) || 'SEL';
    res.json(await program.listCurriculum(type));
  } catch (err) { next(err); }
});

// Upcoming SEL / DLAI sessions with curriculum + ratio
router.get('/sessions', async (req: AuthRequest, res, next) => {
  try {
    const programme = (req.query.programme as Programme) || 'P2_SEL';
    res.json(await program.listProgrammeSessions(programme));
  } catch (err) { next(err); }
});

// A single session with its curriculum item + ratio
router.get('/sessions/:id', async (req: AuthRequest, res, next) => {
  try {
    const session = await program.getSessionWithCurriculum(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) { next(err); }
});

// Generate the upcoming alternating-Sunday sessions (managers)
router.post('/generate-sundays', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const until = req.body.until ? parseISTDate(req.body.until) : undefined;
    res.json(await program.createSundaySessionsFromSeries(until));
  } catch (err) { next(err); }
});

export default router;
