import { prisma } from '../lib/prisma';
import { cciSchema } from '../lib/validators';
import { z } from 'zod';
import { CCIStatus, ComplianceStatus, ComplianceType } from '@prisma/client';

// Lead times in days for each compliance type
export const COMPLIANCE_LEAD_TIMES: Record<ComplianceType, number> = {
  JJ_ACT_RENEWAL: 60,
  STATE_INSPECTION: 30,
  CWC_CASE_REVIEW: 14,
  FIRE_SAFETY: 60,
  HEALTH_AUDIT: 30,
  STAFF_POLICE_VERIFICATION: 30,
  FINANCIAL_AUDIT: 30,
  CWC_VISIT: 7,
};

export async function createCCI(data: z.infer<typeof cciSchema>, createdById: string) {
  const existing = await prisma.cCI.findUnique({ where: { registrationNumber: data.registrationNumber } });
  if (existing) throw new Error('Registration number already exists');

  const cci = await prisma.cCI.create({
    data: {
      name: data.name,
      type: data.type as any,
      registrationNumber: data.registrationNumber,
      district: data.district,
      state: data.state,
      fullAddress: data.fullAddress,
      latitude: data.latitude,
      longitude: data.longitude,
      sanctionedCapacityBoys: data.sanctionedCapacityBoys,
      sanctionedCapacityGirls: data.sanctionedCapacityGirls,
      currentOccupancy: data.currentOccupancy,
      superintendentName: data.superintendentName,
      superintendentPhone: data.superintendentPhone,
      superintendentEmail: data.superintendentEmail,
      managingSociety: data.managingSociety,
      dateOfEstablishment: data.dateOfEstablishment ? new Date(data.dateOfEstablishment) : undefined,
      fundingType: data.fundingType as any,
      notes: data.notes,
    },
  });

  // Assign primary manager if provided
  if (data.primaryManagerId) {
    await prisma.userCCI.create({ data: { userId: data.primaryManagerId, cciId: cci.id } });
  }

  return cci;
}

export async function listCCIs(userId: string, role: string) {
  if (role === 'SUPER_ADMIN' || role === 'PROGRAM_MANAGER') {
    return prisma.cCI.findMany({
      include: {
        _count: { select: { children: { where: { isActive: true } }, complianceItems: true } },
        managers: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }
  // CCI_MANAGER and CCI_STAFF: only assigned CCIs
  const links = await prisma.userCCI.findMany({ where: { userId } });
  const cciIds = links.map(l => l.cciId);
  return prisma.cCI.findMany({
    where: { id: { in: cciIds } },
    include: {
      _count: { select: { children: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getCCI(id: string) {
  const cci = await prisma.cCI.findUnique({
    where: { id },
    include: {
      complianceItems: { orderBy: { dueDate: 'asc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      visitLogs: {
        orderBy: { visitDate: 'desc' },
        take: 5,
        include: { loggedBy: { select: { name: true } }, photographs: true, actionItems: true },
      },
      issues: { where: { isResolved: false }, orderBy: { createdAt: 'desc' } },
      managers: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { children: { where: { isActive: true } }, visitLogs: true } },
    },
  });
  if (!cci) throw new Error('CCI not found');
  return { ...cci, complianceScore: computeComplianceScore(cci.complianceItems) };
}

export function computeComplianceScore(items: { status: ComplianceStatus }[]): number {
  if (!items.length) return 100;
  const compliant = items.filter(i => i.status === 'COMPLIANT').length;
  return Math.round((compliant / items.length) * 100);
}

export async function updateCCIStatus(id: string, status: CCIStatus) {
  return prisma.cCI.update({ where: { id }, data: { status } });
}

export async function updateCCI(id: string, data: Partial<z.infer<typeof cciSchema>>) {
  return prisma.cCI.update({ where: { id }, data: {
    name: data.name,
    currentOccupancy: data.currentOccupancy,
    superintendentName: data.superintendentName,
    superintendentPhone: data.superintendentPhone,
    notes: data.notes,
    status: (data as any).status,
  } as any });
}

// Compliance
export async function addComplianceItem(cciId: string, data: {
  type: string; dueDate: string; notes?: string;
}) {
  return prisma.complianceItem.create({
    data: {
      cciId,
      type: data.type as ComplianceType,
      dueDate: new Date(data.dueDate),
      notes: data.notes,
      status: computeStatus(new Date(data.dueDate), data.type as ComplianceType),
    },
  });
}

export function computeStatus(dueDate: Date, type: ComplianceType): ComplianceStatus {
  const now = new Date();
  const lead = COMPLIANCE_LEAD_TIMES[type] ?? 30;
  const alertDate = new Date(dueDate.getTime() - lead * 24 * 60 * 60 * 1000);
  if (now > dueDate) return 'OVERDUE';
  if (now >= alertDate) return 'DUE_SOON';
  return 'COMPLIANT';
}

export async function completeComplianceItem(id: string, outcome?: string, documentId?: string) {
  return prisma.complianceItem.update({
    where: { id },
    data: { status: 'COMPLIANT', completedAt: new Date(), outcome, documentId },
  });
}

export async function refreshComplianceStatuses() {
  const items = await prisma.complianceItem.findMany({ where: { completedAt: null } });
  for (const item of items) {
    const newStatus = computeStatus(item.dueDate, item.type);
    if (newStatus !== item.status) {
      await prisma.complianceItem.update({ where: { id: item.id }, data: { status: newStatus } });
    }
  }
}

// Visit Logs
export async function createVisitLog(data: {
  cciId: string; loggedById: string; visitDate: string; visitType: string;
  childrenEngaged?: number; observations?: string; activitiesConducted?: string[];
  latitude?: number; longitude?: number; volunteerIds?: string[];
  actionItems?: { description: string; assigneeId?: string; dueDate?: string }[];
}) {
  return prisma.visitLog.create({
    data: {
      cciId: data.cciId,
      loggedById: data.loggedById,
      visitDate: new Date(data.visitDate),
      visitType: data.visitType as any,
      childrenEngaged: data.childrenEngaged,
      observations: data.observations,
      activitiesConducted: data.activitiesConducted || [],
      latitude: data.latitude,
      longitude: data.longitude,
      volunteers: data.volunteerIds
        ? { create: data.volunteerIds.map(vid => ({ volunteerId: vid })) }
        : undefined,
      actionItems: data.actionItems
        ? { create: data.actionItems.map(ai => ({ description: ai.description, assigneeId: ai.assigneeId, dueDate: ai.dueDate ? new Date(ai.dueDate) : undefined })) }
        : undefined,
    },
    include: { loggedBy: { select: { name: true } }, actionItems: true },
  });
}

export async function getVisitLogs(cciId: string) {
  return prisma.visitLog.findMany({
    where: { cciId },
    include: {
      loggedBy: { select: { name: true } },
      photographs: true,
      actionItems: true,
      volunteers: true,
    },
    orderBy: { visitDate: 'desc' },
  });
}

export async function withdrawVisitLog(id: string, reason: string) {
  return prisma.visitLog.update({ where: { id }, data: { status: 'WITHDRAWN', withdrawnReason: reason } });
}

export async function acknowledgeVisit(id: string) {
  return prisma.visitLog.update({ where: { id }, data: { superintendentAck: true } });
}

// Issues
export async function createIssue(data: {
  cciId: string; visitLogId?: string; title: string; description: string;
  severity: string; assigneeId?: string;
}) {
  return prisma.issue.create({ data: { ...data, severity: data.severity as any } });
}

export async function resolveIssue(id: string) {
  return prisma.issue.update({ where: { id }, data: { isResolved: true, resolvedAt: new Date() } });
}

// Dashboard stats
export async function getDashboardStats() {
  const [totalCCIs, totalChildren, activeVolunteers, complianceItems] = await Promise.all([
    prisma.cCI.count({ where: { status: 'ACTIVE' } }),
    prisma.child.count({ where: { isActive: true } }),
    prisma.volunteerProfile.count({ where: { accountStatus: 'ACTIVE' } }),
    prisma.complianceItem.findMany({ where: { completedAt: null } }),
  ]);
  const total = complianceItems.length;
  const compliant = complianceItems.filter(i => i.status === 'COMPLIANT').length;
  const complianceScore = total > 0 ? Math.round((compliant / total) * 100) : 100;
  return { totalCCIs, totalChildren, totalVolunteers: activeVolunteers, complianceScore };
}
