import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ ccis: [], children: [], volunteers: [] });

    const { role, id: userId } = req.user!;
    const isAdmin = role === 'SUPER_ADMIN' || role === 'PROGRAM_MANAGER';

    // CCIs
    let cciWhere: any = { OR: [{ name: { contains: q, mode: 'insensitive' } }, { district: { contains: q, mode: 'insensitive' } }, { registrationNumber: { contains: q, mode: 'insensitive' } }] };
    if (!isAdmin && role !== 'CCI_STAFF') {
      const links = await prisma.userCCI.findMany({ where: { userId } });
      cciWhere = { ...cciWhere, id: { in: links.map(l => l.cciId) } };
    }
    const ccis = await prisma.cCI.findMany({ where: cciWhere, select: { id: true, name: true, district: true, state: true }, take: 5 });

    // Children (not for volunteers)
    let children: any[] = [];
    if (role !== 'VOLUNTEER') {
      let childWhere: any = { isActive: true, OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { childId: { contains: q, mode: 'insensitive' } }] };
      if (!isAdmin) {
        const links = await prisma.userCCI.findMany({ where: { userId } });
        childWhere.cciId = { in: links.map(l => l.cciId) };
      }
      children = await prisma.child.findMany({ where: childWhere, select: { id: true, childId: true, firstName: true, lastName: true, cci: { select: { name: true } } }, take: 5 });
    }

    // Volunteers (admin/PM/CCI_MANAGER only)
    let volunteers: any[] = [];
    if (isAdmin || role === 'CCI_MANAGER') {
      volunteers = await prisma.volunteerProfile.findMany({
        where: { OR: [{ user: { name: { contains: q, mode: 'insensitive' } } }, { city: { contains: q, mode: 'insensitive' } }] },
        include: { user: { select: { id: true, name: true, email: true } } },
        take: 5,
      });
    }

    res.json({ ccis, children, volunteers });
  } catch (err) { next(err); }
});

export default router;
