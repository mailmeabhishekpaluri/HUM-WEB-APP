import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { parseISTDate } from '../lib/datetime';
import * as edu from '../services/education.service';

const router = Router();
router.use(requireAuth);

const MANAGERS = ['SUPER_ADMIN', 'PROGRAM_MANAGER'] as const;

function handle(p: Promise<any>, res: any, next: any, code = 200) {
  p.then(d => res.status(code).json(d)).catch(next);
}

// ── Static routes (must precede /:id) ───────────────────────────────────────

// My teaching schedule (volunteer)
router.get('/schedule/me', async (req: AuthRequest, res, next) => {
  try {
    const from = req.query.from ? parseISTDate(String(req.query.from)) : undefined;
    const to = req.query.to ? parseISTDate(String(req.query.to)) : undefined;
    res.json(await edu.getVolunteerSchedule(req.user!.id, from, to));
  } catch (err) { next(err); }
});

// Open substitution board
router.get('/substitution-requests', async (_req: AuthRequest, res, next) => {
  handle(edu.listOpenSubstitutions(), res, next);
});

// Accept an open substitution (any eligible volunteer/manager)
router.post('/substitution-requests/:id/accept', async (req: AuthRequest, res, next) => {
  edu.acceptSubstitution(req.params.id, req.user!.id)
    .then(d => res.json(d))
    .catch(err => next(err));
});

// List class sessions (filter by section / mine / date range)
router.get('/sessions', async (req: AuthRequest, res, next) => {
  try {
    const filters: any = {};
    if (req.query.sectionId) filters.sectionId = String(req.query.sectionId);
    if (req.query.mine === 'true') filters.mineUserId = req.user!.id;
    if (req.query.from) filters.from = parseISTDate(String(req.query.from));
    if (req.query.to) filters.to = parseISTDate(String(req.query.to));
    res.json(await edu.listSessions(filters));
  } catch (err) { next(err); }
});

router.get('/sessions/:id', async (req: AuthRequest, res, next) => {
  handle(edu.getSessionDetail(req.params.id), res, next);
});

router.post('/sessions/:id/plan', async (req: AuthRequest, res, next) => {
  edu.submitLessonPlan(req.params.id, req.user!.id, req.user!.role, req.body.lessonPlan, req.body.topic)
    .then(d => res.json(d)).catch(next);
});

router.post('/sessions/:id/feedback', async (req: AuthRequest, res, next) => {
  edu.submitClassFeedback(req.params.id, req.user!.id, req.user!.role, req.body.classFeedback)
    .then(d => res.json(d)).catch(next);
});

router.post('/sessions/:id/attendance', async (req: AuthRequest, res, next) => {
  edu.markClassAttendance(req.params.id, req.user!.id, req.user!.role, req.body.records || [])
    .then(d => res.json(d)).catch(next);
});

router.post('/sessions/:id/substitution-request', async (req: AuthRequest, res, next) => {
  edu.requestSubstitution(req.params.id, req.user!.id, req.user!.role, req.body.reason)
    .then(d => res.status(201).json(d)).catch(next);
});

// ── Section routes ──────────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    res.json(await edu.listSections({
      academicYear: req.query.academicYear as string,
      grade: req.query.grade as string,
      active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
    }));
  } catch (err) { next(err); }
});

router.post('/', requireRole(...MANAGERS), async (req: AuthRequest, res, next) => {
  handle(edu.createSection(req.body), res, next, 201);
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  handle(edu.getSection(req.params.id), res, next);
});

router.patch('/:id', requireRole(...MANAGERS), async (req: AuthRequest, res, next) => {
  handle(edu.updateSection(req.params.id, req.body), res, next);
});

router.post('/:id/enroll', requireRole(...MANAGERS), async (req: AuthRequest, res, next) => {
  handle(edu.enrollChild(req.params.id, req.body.childId), res, next, 201);
});

router.delete('/:id/enroll/:childId', requireRole(...MANAGERS), async (req: AuthRequest, res, next) => {
  edu.unenrollChild(req.params.id, req.params.childId).then(() => res.json({ ok: true })).catch(next);
});

export default router;
