// Hourly reminders. Sends CLASS_REMINDER / SESSION_REMINDER ~24h and ~2h
// before start, plus education nudges (LESSON_PLAN_DUE if class starts in
// ~3h with no plan; FEEDBACK_DUE if class finished >2h ago with no feedback).
// Each (userId, type, entityId, bucket) sends at most once — de-duped by a
// dedupeKey stored on Notification.data and looked up before sending.

import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { NotificationType } from '@prisma/client';
import { createNotification } from '../services/notification.service';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** Hashable composite key: deduped on (userId, type, entityId, bucket). */
function key(userId: string, type: string, entityId: string, bucket: string) {
  return `${type}:${entityId}:${bucket}:${userId}`;
}

/** Send only if no notification with this dedupeKey exists for the user yet. */
async function sendOnce(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  dedupeKey: string,
  extraData: Record<string, unknown> = {},
) {
  const existing = await prisma.notification.findFirst({
    where: { userId, type, data: { path: ['dedupeKey'], equals: dedupeKey } as any },
    select: { id: true },
  });
  if (existing) return false;
  await createNotification({
    userId,
    title,
    body,
    type,
    data: { dedupeKey, ...extraData },
  });
  return true;
}

function withinWindow(target: Date, refMs: number, plusOrMinusMs: number): boolean {
  const diff = target.getTime() - refMs;
  return diff >= 0 && diff <= plusOrMinusMs;
}

/** Format e.g. "Fri, 06 Jun, 5:00 pm IST". */
function fmt(date: Date): string {
  return date.toLocaleString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: 'numeric', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }) + ' IST';
}

export function startRemindersJob() {
  // Top of every hour
  cron.schedule('0 * * * *', runOnce);
}

/** Exposed so server.ts / tests can run once on boot or on demand. */
export async function runOnce() {
  console.log('[Reminders] Tick…');
  const now = Date.now();
  const horizon = new Date(now + 25 * HOUR);

  // ── Class reminders + nudges ─────────────────────────────────────────────
  const classes = await prisma.classSession.findMany({
    where: { date: { gte: new Date(now - 4 * HOUR), lte: horizon }, status: { in: ['SCHEDULED', 'SUBSTITUTION_REQUESTED'] } },
    include: { classSection: true },
  });
  for (const c of classes) {
    if (!c.assignedVolunteerId) continue;
    const startMs = c.date.getTime();
    const sectionLabel = `${c.classSection.grade} ${c.classSection.subject}`.replace(/_/g, ' ');
    const meet = c.meetLink || c.classSection.meetLink || '';

    // 24h reminder (within 1h after the 24h mark)
    if (withinWindow(c.date, now + 24 * HOUR, HOUR)) {
      await sendOnce(
        c.assignedVolunteerId,
        NotificationType.CLASS_REMINDER,
        `Class tomorrow: ${sectionLabel}`,
        `${sectionLabel} at ${fmt(c.date)}${meet ? `\nJoin: ${meet}` : ''}`,
        key(c.assignedVolunteerId, 'CLASS_REMINDER', c.id, '24h'),
        { classSessionId: c.id, meetLink: meet },
      );
    }
    // 2h reminder
    if (withinWindow(c.date, now + 2 * HOUR, HOUR)) {
      await sendOnce(
        c.assignedVolunteerId,
        NotificationType.CLASS_REMINDER,
        `Class in 2 hours: ${sectionLabel}`,
        `${sectionLabel} starts at ${fmt(c.date)}${meet ? `\nJoin: ${meet}` : ''}`,
        key(c.assignedVolunteerId, 'CLASS_REMINDER', c.id, '2h'),
        { classSessionId: c.id, meetLink: meet },
      );
    }
    // Lesson plan due — starts in ≤3h, no plan submitted
    if (!c.lessonPlanSubmittedAt && startMs - now <= 3 * HOUR && startMs - now > 0) {
      await sendOnce(
        c.assignedVolunteerId,
        NotificationType.LESSON_PLAN_DUE,
        `Lesson plan pending: ${sectionLabel}`,
        `Your lesson plan for the class at ${fmt(c.date)} hasn't been submitted yet.`,
        key(c.assignedVolunteerId, 'LESSON_PLAN_DUE', c.id, 'pre'),
        { classSessionId: c.id },
      );
    }
    // Feedback due — class finished >2h ago, no feedback
    const finishedAt = startMs + (c.classSection.durationMinutes || 60) * MIN;
    if (!c.feedbackSubmittedAt && now - finishedAt > 2 * HOUR && now - finishedAt < 48 * HOUR) {
      await sendOnce(
        c.assignedVolunteerId,
        NotificationType.FEEDBACK_DUE,
        `Class feedback pending: ${sectionLabel}`,
        `Please submit feedback for the class on ${fmt(c.date)}.`,
        key(c.assignedVolunteerId, 'FEEDBACK_DUE', c.id, 'post'),
        { classSessionId: c.id },
      );
    }
  }

  // ── Opportunity reminders for registered volunteers ──────────────────────
  const opps = await prisma.opportunity.findMany({
    where: { dateTime: { gte: new Date(now), lte: horizon }, status: { in: ['OPEN', 'FULL'] } },
    include: { registrations: { select: { volunteer: { select: { userId: true } } } } },
  });
  for (const o of opps) {
    for (const r of o.registrations) {
      const userId = r.volunteer?.userId;
      if (!userId) continue;
      if (withinWindow(o.dateTime, now + 24 * HOUR, HOUR)) {
        await sendOnce(
          userId,
          NotificationType.SESSION_REMINDER,
          `Session tomorrow: ${o.title}`,
          `${o.title} at ${fmt(o.dateTime)} · ${o.location}${o.meetLink ? `\nJoin: ${o.meetLink}` : ''}`,
          key(userId, 'SESSION_REMINDER', o.id, '24h'),
          { opportunityId: o.id, meetLink: o.meetLink },
        );
      }
      if (withinWindow(o.dateTime, now + 2 * HOUR, HOUR)) {
        await sendOnce(
          userId,
          NotificationType.SESSION_REMINDER,
          `Session in 2 hours: ${o.title}`,
          `${o.title} starts at ${fmt(o.dateTime)} · ${o.location}${o.meetLink ? `\nJoin: ${o.meetLink}` : ''}`,
          key(userId, 'SESSION_REMINDER', o.id, '2h'),
          { opportunityId: o.id, meetLink: o.meetLink },
        );
      }
    }
  }
  console.log('[Reminders] Done.');
}
