// Daily scheduler: materialises the next ~14 days of sessions across every
// programme, expires stale OPEN substitution requests, and best-effort syncs
// Google Calendar / Meet (no-op until env set). Mirrors compliance.job.ts.

import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { materializeUpcomingClassSessions } from '../services/education.service';
import { createSundaySessionsFromSeries } from '../services/program.service';
import { createQuarterlyCheckups, createMonthlyAwareness } from '../services/health.service';
import { createLibraryActivities } from '../services/library.service';
import { upsertEventForClassSession, upsertEventForOpportunity } from '../services/googleCalendar.service';

export function startSchedulerJob() {
  // 06:00 IST = 00:30 UTC every day
  cron.schedule('30 0 * * *', runOnce);
}

/** Exposed so server.ts / tests can run it once on boot or on demand. */
export async function runOnce() {
  console.log('[Scheduler] Daily materialisation starting…');
  try {
    const horizon14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const horizon60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const horizon90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const horizon120 = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);

    const classes = await materializeUpcomingClassSessions(14);
    const sundays = await createSundaySessionsFromSeries(horizon60);
    const checkups = await createQuarterlyCheckups(horizon120).catch(() => ({ created: 0 }));
    const awareness = await createMonthlyAwareness(horizon90).catch(() => ({ created: 0 }));
    const library = await createLibraryActivities(horizon90).catch(() => ({ created: 0 }));

    // Expire OPEN substitution requests whose class date has passed
    const expired = await prisma.substitutionRequest.updateMany({
      where: { status: 'OPEN', classSession: { date: { lt: new Date() } } },
      data: { status: 'EXPIRED' },
    });

    console.log(`[Scheduler] classes=${classes} sundays=${(sundays as any).created ?? 0} checkups=${(checkups as any).created ?? 0} awareness=${(awareness as any).created ?? 0} library=${(library as any).created ?? 0} expired=${expired.count}`);

    // Best-effort Google Calendar / Meet sync for sessions in the next 14 days
    const upcomingClasses = await prisma.classSession.findMany({
      where: { date: { gte: new Date(), lte: horizon14 } },
      select: { id: true },
      take: 200,
    });
    const upcomingOpps = await prisma.opportunity.findMany({
      where: { dateTime: { gte: new Date(), lte: horizon14 } },
      select: { id: true },
      take: 200,
    });
    await Promise.all([
      ...upcomingClasses.map(c => upsertEventForClassSession(c.id)),
      ...upcomingOpps.map(o => upsertEventForOpportunity(o.id)),
    ]);
  } catch (err) {
    console.error('[Scheduler] error:', err);
  }
}
