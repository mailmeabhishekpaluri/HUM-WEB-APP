import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '../lib/prisma';
import { parseISTDate } from '../lib/datetime';
import { generateSessionsForSeries } from '../services/scheduling.service';

const router = Router();
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'));

// List recurring series (optional ?programme= & ?active= filters)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const where: any = {};
    if (req.query.programme) where.programmeArea = String(req.query.programme);
    if (req.query.active !== undefined) where.isActive = req.query.active === 'true';
    const series = await prisma.recurringSeries.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(series);
  } catch (err) { next(err); }
});

// Get a single series
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const series = await prisma.recurringSeries.findUnique({ where: { id: req.params.id } });
    if (!series) return res.status(404).json({ error: 'Series not found' });
    res.json(series);
  } catch (err) { next(err); }
});

// Preview the session datetimes a series would generate up to a date
router.get('/:id/sessions', async (req: AuthRequest, res, next) => {
  try {
    const until = req.query.until ? parseISTDate(String(req.query.until)) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const dates = await generateSessionsForSeries(req.params.id, until);
    res.json({ count: dates.length, sessions: dates });
  } catch (err) { next(err); }
});

// Create a recurring series
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const b = req.body;
    const series = await prisma.recurringSeries.create({
      data: {
        title: b.title,
        programmeArea: b.programmeArea,
        cadence: b.cadence,
        deliveryMode: b.deliveryMode || 'ON_GROUND',
        cciId: b.cciId || null,
        startDate: parseISTDate(b.startDate),
        endDate: b.endDate ? parseISTDate(b.endDate) : null,
        defaultStartTime: b.defaultStartTime || '17:00',
        durationMinutes: b.durationMinutes ?? 60,
        requiredCount: b.requiredCount ?? 1,
        config: b.config ?? undefined,
        createdById: req.user!.id,
      },
    });
    res.status(201).json(series);
  } catch (err) { next(err); }
});

// Update a recurring series
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const b = req.body;
    const data: any = {};
    for (const f of ['title', 'programmeArea', 'cadence', 'deliveryMode', 'defaultStartTime', 'durationMinutes', 'requiredCount', 'isActive', 'config']) {
      if (b[f] !== undefined) data[f] = b[f];
    }
    if (b.cciId !== undefined) data.cciId = b.cciId || null;
    if (b.startDate !== undefined) data.startDate = parseISTDate(b.startDate);
    if (b.endDate !== undefined) data.endDate = b.endDate ? parseISTDate(b.endDate) : null;
    const series = await prisma.recurringSeries.update({ where: { id: req.params.id }, data });
    res.json(series);
  } catch (err) { next(err); }
});

// Deactivate (soft delete) a series
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const series = await prisma.recurringSeries.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json(series);
  } catch (err) { next(err); }
});

export default router;
