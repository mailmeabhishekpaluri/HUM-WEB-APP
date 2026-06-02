import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole, requireCCIAccess } from '../middleware/rbac';
import { cciSchema } from '../lib/validators';
import * as cciService from '../services/cci.service';
import { logAudit } from '../services/audit.service';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);
// CCI module is staff-only; volunteers have no access to institution data
router.use(requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Search CCIs — must be before /:id to avoid route collision
router.get('/search', async (req: AuthRequest, res, next) => {
  try {
    const q = String(req.query.q || '');
    const ccis = await prisma.cCI.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { district: { contains: q, mode: 'insensitive' } },
          { registrationNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
    res.json(ccis);
  } catch (err) { next(err); }
});

// List CCIs
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const ccis = await cciService.listCCIs(req.user!.id, req.user!.role);
    res.json(ccis);
  } catch (err) { next(err); }
});

// Create CCI
router.post('/', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const data = cciSchema.parse(req.body);
    const cci = await cciService.createCCI(data, req.user!.id);
    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'CCI', entityId: cci.id, action: 'CREATED', newValue: cci, ipAddress: req.ip });
    res.status(201).json(cci);
  } catch (err) { next(err); }
});

// Get CCI
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const cci = await cciService.getCCI(req.params.id);
    res.json(cci);
  } catch (err) { next(err); }
});

// Update CCI
router.patch('/:id', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const cci = await cciService.updateCCI(req.params.id, req.body);
    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'CCI', entityId: cci.id, action: 'UPDATED', newValue: cci, ipAddress: req.ip });
    res.json(cci);
  } catch (err) { next(err); }
});

// Update status
router.patch('/:id/status', requireRole('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const cci = await cciService.updateCCIStatus(req.params.id, req.body.status);
    res.json(cci);
  } catch (err) { next(err); }
});

// Compliance items
router.get('/:id/compliance', async (req: AuthRequest, res, next) => {
  try {
    const items = await prisma.complianceItem.findMany({ where: { cciId: req.params.id }, orderBy: { dueDate: 'asc' } });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/:id/compliance', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const item = await cciService.addComplianceItem(req.params.id, req.body);
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.patch('/compliance/:itemId/complete', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const item = await cciService.completeComplianceItem(req.params.itemId, req.body.outcome, req.body.documentId);
    res.json(item);
  } catch (err) { next(err); }
});

// Documents
router.post('/:id/documents', upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const doc = await prisma.document.create({
      data: {
        cciId: req.params.id,
        category: req.body.category,
        name: req.body.name || req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        uploadedBy: req.user!.id,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      },
    });
    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'DOCUMENT', entityId: doc.id, action: 'CREATED', ipAddress: req.ip });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.get('/:id/documents', async (req: AuthRequest, res, next) => {
  try {
    const docs = await prisma.document.findMany({ where: { cciId: req.params.id }, orderBy: { createdAt: 'desc' } });
    res.json(docs);
  } catch (err) { next(err); }
});

// Visit logs
router.get('/:id/visits', async (req: AuthRequest, res, next) => {
  try {
    const logs = await cciService.getVisitLogs(req.params.id);
    res.json(logs);
  } catch (err) { next(err); }
});

router.post('/:id/visits', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const log = await cciService.createVisitLog({ ...req.body, cciId: req.params.id, loggedById: req.user!.id });
    await logAudit({ userId: req.user!.id, userRole: req.user!.role as any, entityType: 'CCI', entityId: req.params.id, action: 'UPDATED', ipAddress: req.ip });
    res.status(201).json(log);
  } catch (err) { next(err); }
});

// Upload photos to visit
router.post('/visits/:visitId/photos', upload.array('photos', 10), async (req: AuthRequest, res, next) => {
  try {
    const files = req.files as Express.Multer.File[];
    const photos = await Promise.all(
      files.map(f => prisma.visitPhoto.create({ data: { visitLogId: req.params.visitId, fileUrl: `/uploads/${f.filename}` } }))
    );
    res.status(201).json(photos);
  } catch (err) { next(err); }
});

router.patch('/visits/:visitId/withdraw', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const log = await cciService.withdrawVisitLog(req.params.visitId, req.body.reason);
    res.json(log);
  } catch (err) { next(err); }
});

router.patch('/visits/:visitId/acknowledge', async (req: AuthRequest, res, next) => {
  try {
    const log = await cciService.acknowledgeVisit(req.params.visitId);
    res.json(log);
  } catch (err) { next(err); }
});

// Issues
router.post('/:id/issues', async (req: AuthRequest, res, next) => {
  try {
    const issue = await cciService.createIssue({ ...req.body, cciId: req.params.id });
    res.status(201).json(issue);
  } catch (err) { next(err); }
});

router.get('/:id/issues', async (req: AuthRequest, res, next) => {
  try {
    const issues = await prisma.issue.findMany({ where: { cciId: req.params.id }, orderBy: { createdAt: 'desc' } });
    res.json(issues);
  } catch (err) { next(err); }
});

router.patch('/issues/:issueId/resolve', requireRole('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const issue = await cciService.resolveIssue(req.params.issueId);
    res.json(issue);
  } catch (err) { next(err); }
});

export default router;
