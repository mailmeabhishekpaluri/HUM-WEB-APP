import { prisma } from '../lib/prisma';
import { NotificationType, Role } from '@prisma/client';
import { sendEmail } from './email.service';
import { sendWhatsApp } from './whatsapp.service';
import { sendPush } from './webpush.service';

export async function createNotification(data: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: object;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      body: data.body,
      type: data.type,
      data: data.data as any,
    },
  });

  // Mirror the notification to WhatsApp + Web Push (both no-op until creds set).
  // Fire-and-forget so an outbound hiccup never blocks the in-app notification.
  prisma.user
    .findUnique({ where: { id: data.userId }, select: { mobile: true } })
    .then(u => sendWhatsApp(u?.mobile, `*${data.title}*\n\n${data.body}\n\n— HUManity Foundation`))
    .catch(() => {});
  sendPush(data.userId, data.title, data.body).catch(() => {});

  return notification;
}

export async function notifyComplianceDue(cciId: string, complianceType: string, dueDate: Date) {
  const [programManagers, cciManagers] = await Promise.all([
    prisma.user.findMany({ where: { role: Role.PROGRAM_MANAGER, isActive: true } }),
    prisma.userCCI.findMany({ where: { cciId }, include: { user: true } }),
  ]);

  const cci = await prisma.cCI.findUnique({ where: { id: cciId }, select: { name: true } });
  const cciName = cci?.name || 'Unknown CCI';

  const recipients = [...programManagers, ...cciManagers.map(m => m.user)];
  const uniqueRecipients = Array.from(new Map(recipients.map(u => [u.id, u])).values());

  for (const user of uniqueRecipients) {
    await createNotification({
      userId: user.id,
      title: 'Compliance Deadline Approaching',
      body: `${cciName}: ${complianceType.replace(/_/g, ' ')} due ${dueDate.toLocaleDateString('en-IN')}`,
      type: NotificationType.COMPLIANCE_DUE,
      data: { cciId, complianceType, dueDate },
    });
  }
}

export async function notifyCriticalIncident(cciId: string, childId: string, description: string) {
  const admins = await prisma.user.findMany({
    where: { role: { in: [Role.SUPER_ADMIN, Role.PROGRAM_MANAGER] }, isActive: true },
  });
  const cci = await prisma.cCI.findUnique({ where: { id: cciId }, select: { name: true } });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      title: '🚨 Critical Incident',
      body: `High-severity incident logged at ${cci?.name}`,
      type: NotificationType.CRITICAL_INCIDENT,
      data: { cciId, childId },
    });
    if (admin.email) {
      await sendEmail(
        admin.email,
        `CRITICAL: Incident at ${cci?.name}`,
        `<p>A critical incident has been logged at <strong>${cci?.name}</strong>.</p><p>${description}</p>`
      );
    }
  }
}

export async function notifyVolunteerApproved(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await createNotification({
    userId,
    title: 'You\'re Approved! 🎉',
    body: 'Your volunteer profile has been approved. Start exploring opportunities.',
    type: NotificationType.VOLUNTEER_APPROVED,
  });
  if (user.email) {
    const { volunteerApprovedEmail } = await import('./email.service');
    await sendEmail(user.email, 'Welcome to HUManity — You\'re Approved!', volunteerApprovedEmail(user.name));
  }
}

export async function notifyBadgeEarned(userId: string, badgeName: string) {
  await createNotification({
    userId,
    title: `Badge Earned: ${badgeName} 🏅`,
    body: `Congratulations! You've earned the "${badgeName}" badge.`,
    type: NotificationType.BADGE_EARNED,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function getUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
