import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { ComplianceType, ComplianceStatus } from '@prisma/client';
import { notifyComplianceDue } from '../services/notification.service';

const LEAD_TIMES: Record<ComplianceType, number> = {
  JJ_ACT_RENEWAL: 60,
  STATE_INSPECTION: 30,
  CWC_CASE_REVIEW: 14,
  FIRE_SAFETY: 60,
  HEALTH_AUDIT: 30,
  STAFF_POLICE_VERIFICATION: 30,
  FINANCIAL_AUDIT: 30,
  CWC_VISIT: 7,
};

function computeStatus(dueDate: Date, type: ComplianceType): ComplianceStatus {
  const now = new Date();
  const lead = LEAD_TIMES[type] ?? 30;
  const alertDate = new Date(dueDate.getTime() - lead * 24 * 60 * 60 * 1000);
  if (now > dueDate) return 'OVERDUE';
  if (now >= alertDate) return 'DUE_SOON';
  return 'COMPLIANT';
}

export function startComplianceJob() {
  // Run daily at 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('[Compliance Job] Running daily compliance check…');
    try {
      const items = await prisma.complianceItem.findMany({ where: { completedAt: null } });
      let notifiedCount = 0;

      for (const item of items) {
        const newStatus = computeStatus(item.dueDate, item.type);
        if (newStatus !== item.status) {
          await prisma.complianceItem.update({ where: { id: item.id }, data: { status: newStatus } });
        }
        // Send notification when status first becomes DUE_SOON
        if (newStatus === 'DUE_SOON' && item.status === 'COMPLIANT') {
          await notifyComplianceDue(item.cciId, item.type, item.dueDate);
          notifiedCount++;
        }
      }
      console.log(`[Compliance Job] Done. ${items.length} items checked, ${notifiedCount} notifications sent.`);
    } catch (err) {
      console.error('[Compliance Job] Error:', err);
    }
  });

  // Also lock expired progress notes daily
  cron.schedule('0 9 * * *', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await prisma.progressNote.updateMany({
      where: { isLocked: false, createdAt: { lt: thirtyDaysAgo } },
      data: { isLocked: true },
    });
  });
}
