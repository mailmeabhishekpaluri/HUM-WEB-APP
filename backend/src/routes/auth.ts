import { Router } from 'express';
import { login, createUser, refreshAccessToken } from '../services/auth.service';
import { loginSchema, registerSchema } from '../lib/validators';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(email, password);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const result = await refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/users', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await createUser(data as { email: string; password: string; name: string; role: Role; mobile?: string });
    res.status(201).json(user);
  } catch (err) { next(err); }
});

router.get('/users', requireAuth, requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const { prisma } = await import('../lib/prisma');
    const users = await prisma.user.findMany({
      where: { role: { not: 'VOLUNTEER' } },
      select: { id: true, name: true, email: true, role: true, createdAt: true, accountStatus: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

router.patch('/users/:userId/deactivate', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { accountStatus: 'SUSPENDED' },
      select: { id: true, name: true, email: true, role: true, accountStatus: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  res.json(req.user);
});

export default router;
