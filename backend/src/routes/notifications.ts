import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as notificationService from '../services/notification.service';
import { saveSubscription } from '../services/webpush.service';

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

// Web Push subscription save (no-op until VAPID env set; row is still stored)
router.post('/push-subscription', async (req: AuthRequest, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'endpoint and keys.p256dh and keys.auth are required' });
    }
    const sub = await saveSubscription(req.user!.id, { endpoint, keys });
    res.status(201).json(sub);
  } catch (err) { next(err); }
});

export default router;
