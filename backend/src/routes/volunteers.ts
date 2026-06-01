import { Router } from 'express';
import multer from 'multer';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as volunteerService from '../services/volunteer.service';
import { volunteerRegisterSchema } from '../lib/validators';
import { logAudit } from '../services/audit.service';
import { prisma } from '../lib/prisma';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Public: Register new volunteer
router.post('/register', async (req, res, next) => {
  try {
    const data = volunteerRegisterSchema.parse(req.body);
    const result = await volunteerService.registerVolunteer({ ...data, password: req.body.password });
    res.status(201).json({ userId: result.user.id, profileId: result.profile.id });
  } catch (err) { next(err); }
});

// All routes below require auth
router.use(requireAuth);

// Get quiz questions (no answers)
router.get('/quiz', (req, res) => {
  res.json(volunteerService.SAFEGUARDING_QUIZ.map(({ correct: _, ...q }) => q));
});

// Submit quiz
router.post('/quiz/submit', async (req: AuthRequest, res, next) => {
  try {
    const { answers } = req.body;
    const { score, passed, total } = volunteerService.scoreQuiz(answers);
    await volunteerService.submitQuizResult(req.user!.id, passed);
    res.json({ score, passed, total });
  } catch (err) { next(err); }
});

// Update profile (step 2 of onboarding)
router.patch('/me/profile', async (req: AuthRequest, res, next) => {
  try {
    const profile = await volunteerService.updateVolunteerProfile(req.user!.id, req.body);
    res.json(profile);
  } catch (err) { next(err); }
});

// Update skills
router.patch('/me/skills', async (req: AuthRequest, res, next) => {
  try {
    const skills = await volunteerService.updateSkills(req.user!.id, req.body.skills);
    res.json(skills);
  } catch (err) { next(err); }
});

// Update police verification status
router.patch('/me/police-verification', upload.single('certificate'), async (req: AuthRequest, res, next) => {
  try {
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const profile = await volunteerService.updatePoliceVerification(req.user!.id, req.body.status, fileUrl);
    res.json(profile);
  } catch (err) { next(err); }
});

// Get my profile
router.get('/me', async (req: AuthRequest, res, next) => {
  try {
    const profile = await volunteerService.getVolunteerByUserId(req.user!.id);
    res.json(profile);
  } catch (err) { next(err); }
});

// Leaderboard (public within app) — placed before /:userId to avoid route conflict
router.get('/leaderboard/top', async (req: AuthRequest, res, next) => {
  try {
    const board = await volunteerService.getLeaderboard(req.query.city as string, req.query.period as any);
    res.json(board);
  } catch (err) { next(err); }
});

// Get pending approvals
router.get('/pending', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const pending = await volunteerService.listVolunteers({ status: 'PENDING' });
    res.json(pending);
  } catch (err) { next(err); }
});

// List all volunteers (admin/PM/CCI_MANAGER)
router.get('/', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const volunteers = await volunteerService.listVolunteers({
      city: req.query.city as string,
      skillName: req.query.skill as string,
      status: req.query.status as string,
    });
    res.json(volunteers);
  } catch (err) { next(err); }
});

// Hours claim approve
router.patch('/hours-claims/:claimId/approve', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const claim = await volunteerService.approveHoursClaim(req.params.claimId, req.user!.id);
    res.json(claim);
  } catch (err) { next(err); }
});

// Hours claim submit
router.post('/me/hours-claim', async (req: AuthRequest, res, next) => {
  try {
    const claim = await volunteerService.submitHoursClaim(req.user!.id, req.body);
    res.status(201).json(claim);
  } catch (err) { next(err); }
});

// Approve volunteer
router.patch('/:userId/approve', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const profile = await volunteerService.approveVolunteer(req.params.userId, req.user!.id);
    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'VOLUNTEER', entityId: req.params.userId, action: 'UPDATED', newValue: { status: 'APPROVED' }, ipAddress: req.ip });
    res.json(profile);
  } catch (err) { next(err); }
});

// Reject volunteer
router.patch('/:userId/reject', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const profile = await volunteerService.rejectVolunteer(req.params.userId, req.body.reason);
    res.json(profile);
  } catch (err) { next(err); }
});

// Get volunteer profile (admin view)
router.get('/:userId', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const profile = await volunteerService.getVolunteerByUserId(req.params.userId);
    if (!profile) return res.status(404).json({ error: 'Volunteer not found' });
    res.json(profile);
  } catch (err) { next(err); }
});

export default router;
