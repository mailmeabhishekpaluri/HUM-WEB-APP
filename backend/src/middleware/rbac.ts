import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../lib/prisma';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireCCIAccess(cciIdParam: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    const { role, id } = req.user;
    if (role === 'SUPER_ADMIN' || role === 'PROGRAM_MANAGER') return next();
    const cciId = req.params[cciIdParam];
    const link = await prisma.userCCI.findUnique({ where: { userId_cciId: { userId: id, cciId } } });
    if (!link) return res.status(403).json({ error: 'No access to this CCI' });
    next();
  };
}
