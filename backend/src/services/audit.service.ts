import { prisma } from '../lib/prisma';
import { EntityType, AuditAction, Role } from '@prisma/client';

export async function logAudit(data: {
  userId: string;
  userRole: Role;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  oldValue?: object;
  newValue?: object;
  ipAddress?: string;
  device?: string;
}) {
  await prisma.auditLog.create({ data });
}
