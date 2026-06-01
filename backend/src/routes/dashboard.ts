import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDashboardStats } from '../services/cci.service';

const router = Router();
router.use(requireAuth);

router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) { next(err); }
});

export default router;
