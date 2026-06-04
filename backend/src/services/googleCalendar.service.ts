// Google Calendar + Meet integration. Same safe-no-op pattern as
// whatsapp.service.ts: activates only when env is set; otherwise logs once
// and returns null so callers can keep going (best-effort).
//
// To enable, set in env:
//   GOOGLE_CALENDAR_ENABLED=true
//   GOOGLE_CALENDAR_ID=primary             (or a shared calendar id)
//   GOOGLE_SERVICE_ACCOUNT_JSON='{...}'    (raw JSON for a service account)
//     -- OR --
//   GOOGLE_CLIENT_EMAIL=...@...gserviceaccount.com
//   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
//   GOOGLE_IMPERSONATE_SUBJECT=meet-owner@yourdomain.org   (Workspace user to
//     impersonate via domain-wide delegation, required for auto Meet links)

import { prisma } from '../lib/prisma';

let warnedOnce = false;
function isConfigured(): boolean {
  if (process.env.GOOGLE_CALENDAR_ENABLED !== 'true') return false;
  if (!process.env.GOOGLE_CALENDAR_ID) return false;
  const hasJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const hasParts = !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
  return hasJson || hasParts;
}

function warnSkip() {
  if (warnedOnce) return;
  warnedOnce = true;
  console.log('[GoogleCalendar] Not configured (set GOOGLE_CALENDAR_ENABLED=true + service account + GOOGLE_CALENDAR_ID to enable). Skipping.');
}

type EventInput = {
  summary: string;
  description?: string;
  startISO: string;  // ISO with timezone
  endISO: string;
  attendees?: string[];
  existingEventId?: string | null;
  withMeet?: boolean;
};

type EventResult = { eventId: string; meetLink: string | null } | null;

/**
 * Stub upsert. When configured, the real implementation would use googleapis
 * to insert/patch an event on GOOGLE_CALENDAR_ID with conferenceData.createRequest
 * for an auto-generated Meet link. Until then it returns null and callers fall
 * back to the existing meetLink (e.g. a section's static link).
 */
async function upsertEvent(_input: EventInput): Promise<EventResult> {
  if (!isConfigured()) { warnSkip(); return null; }
  // Real implementation would:
  //   const { google } = await import('googleapis');
  //   const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/calendar'], subject: process.env.GOOGLE_IMPERSONATE_SUBJECT });
  //   const cal = google.calendar({ version: 'v3', auth });
  //   const event = { summary, description, start: {dateTime, timeZone:'Asia/Kolkata'}, end: {...}, attendees: attendees.map(e=>({email:e})), conferenceData: withMeet ? { createRequest: { requestId: cuid(), conferenceSolutionKey: { type:'hangoutsMeet' } } } : undefined };
  //   const res = existingEventId
  //     ? await cal.events.patch({ calendarId, eventId: existingEventId, requestBody: event, conferenceDataVersion: 1, sendUpdates: 'all' })
  //     : await cal.events.insert({ calendarId, requestBody: event, conferenceDataVersion: 1, sendUpdates: 'all' });
  //   return { eventId: res.data.id!, meetLink: res.data.hangoutLink ?? null };
  console.log('[GoogleCalendar] Configured but real client not implemented yet; returning null.');
  return null;
}

/** Best-effort upsert for a ClassSession; persists eventId + meetLink onto the row. */
export async function upsertEventForClassSession(sessionId: string): Promise<void> {
  try {
    const s = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { classSection: true },
    });
    if (!s) return;
    const endTime = new Date(s.date.getTime() + (s.classSection.durationMinutes || 60) * 60 * 1000);
    const attendees: string[] = [];
    if (s.assignedVolunteerId) {
      const u = await prisma.user.findUnique({ where: { id: s.assignedVolunteerId }, select: { email: true } });
      if (u?.email) attendees.push(u.email);
    }
    const result = await upsertEvent({
      summary: `${s.classSection.grade} ${s.classSection.subject} class`,
      description: s.topic || s.lessonPlan || undefined,
      startISO: s.date.toISOString(),
      endISO: endTime.toISOString(),
      attendees,
      withMeet: true,
    });
    if (result) {
      await prisma.classSession.update({
        where: { id: sessionId },
        data: { meetLink: result.meetLink ?? s.meetLink, /* eventId not persisted on ClassSession yet */ },
      });
    }
  } catch (err) {
    console.error('[GoogleCalendar] class session upsert error:', err);
  }
}

/** Best-effort upsert for an Opportunity; persists calendarEventId + meetLink. */
export async function upsertEventForOpportunity(opportunityId: string): Promise<void> {
  try {
    const o = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { registrations: { include: { volunteer: { include: { user: { select: { email: true } } } } } } },
    });
    if (!o) return;
    const endTime = new Date(o.dateTime.getTime() + (o.durationMinutes || 60) * 60 * 1000);
    const attendees = o.registrations
      .map(r => r.volunteer?.user?.email)
      .filter((e): e is string => !!e);
    const result = await upsertEvent({
      summary: o.title,
      description: o.description ?? undefined,
      startISO: o.dateTime.toISOString(),
      endISO: endTime.toISOString(),
      attendees,
      existingEventId: o.calendarEventId,
      withMeet: o.deliveryMode === 'ONLINE',
    });
    if (result) {
      await prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
          calendarEventId: result.eventId,
          meetLink: result.meetLink ?? o.meetLink,
        },
      });
    }
  } catch (err) {
    console.error('[GoogleCalendar] opportunity upsert error:', err);
  }
}
