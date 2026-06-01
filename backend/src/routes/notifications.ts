import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as notificationService from '../services/notification.service';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user!.id);
    res.json(notifications);
  } catch (err) { next(err); }
});

router.get('/unread-count', async (req: AuthRequest, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    res.json({ count });
  } catch (err) { next(err); }
});

router.patch('/mark-read', async (req: AuthRequest, res, next) => {
  try {
    await notificationService.markAllRead(req.user!.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
