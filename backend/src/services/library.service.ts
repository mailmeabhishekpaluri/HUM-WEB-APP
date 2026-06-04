import { prisma } from '../lib/prisma';
import { Programme, ReadingLevel } from '@prisma/client';
import { parseISTDate } from '../lib/datetime';

// Library Project (P5): monthly / bi-monthly Pratham-style reading sessions at CCIs.
// All scheduling math is done in IST to match the rest of the platform.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istParts(date: Date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), d: ist.getUTCDate() };
}

function istDateTime(y: number, m: number, d: number, time: string): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  const [hh = '10', mm = '30'] = time.split(':');
  return parseISTDate(`${y}-${pad(m + 1)}-${pad(d)}T${pad(Number(hh))}:${pad(Number(mm))}`);
}

const READING_LEVELS: ReadingLevel[] = ['BEGINNER', 'LETTER', 'WORD', 'PARAGRAPH', 'STORY'];

/**
 * Materialise upcoming P5 Library activities from active MONTHLY / BIMONTHLY
 * RecurringSeries. Idempotent per (programmeArea, dateTime, cciId).
 */
export async function createLibraryActivities(untilDate?: Date): Promise<{ created: number }> {
  const until = untilDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const seriesList = await prisma.recurringSeries.findMany({
    where: {
      programmeArea: Programme.P5_LIBRARY,
      isActive: true,
      cadence: { in: ['MONTHLY', 'BIMONTHLY'] },
    },
  });

  let created = 0;
  for (const series of seriesList) {
    const step = series.cadence === 'MONTHLY' ? 1 : 2;
    const startTime = series.defaultStartTime || '10:30';
    const duration = series.durationMinutes || 90;
    const required = series.requiredCount || 3;

    const cci = series.cciId ? await prisma.cCI.findUnique({ where: { id: series.cciId } }) : null;
    const location = cci ? `${cci.name}, ${cci.district}` : 'CCI (TBD)';

    const start = istParts(series.startDate);
    let y = start.y;
    let m = start.m;
    const dayOfMonth = start.d;

    for (let i = 0; i < 600; i++) {
      const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const d = Math.min(dayOfMonth, lastDay);
      const dt = istDateTime(y, m, d, startTime);
      if (dt > until) break;
      if (dt >= series.startDate) {
        const existing = await prisma.opportunity.findFirst({
          where: {
            programmeArea: Programme.P5_LIBRARY,
            dateTime: dt,
            cciId: series.cciId ?? undefined,
          },
        });
        if (!existing) {
          const monthLabel = dt.toLocaleString('en-IN', {
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Kolkata',
          });
          await prisma.opportunity.create({
            data: {
              title: `Library — ${monthLabel}`,
              programmeArea: Programme.P5_LIBRARY,
              cciId: series.cciId ?? undefined,
              dateTime: dt,
              durationMinutes: duration,
              location,
              requiredCount: required,
              deliveryMode: 'ON_GROUND',
              status: 'OPEN',
              createdById: series.createdById,
              recurringSeriesId: series.id,
            },
          });
          created++;
        }
      }
      m += step;
      while (m > 11) { m -= 12; y += 1; }
    }
  }

  return { created };
}

/** Record a single Pratham-style reading assessment for a child. */
export async function recordAssessment(
  data: {
    childId: string;
    opportunityId?: string;
    date: string | Date;
    level: ReadingLevel;
    bookTitle?: string;
    prathamGroup?: string;
    notes?: string;
  },
  assessedById: string,
) {
  return prisma.readingAssessment.create({
    data: {
      childId: data.childId,
      opportunityId: data.opportunityId,
      date: parseISTDate(data.date),
      level: data.level,
      bookTitle: data.bookTitle,
      prathamGroup: data.prathamGroup,
      notes: data.notes,
      assessedById,
    },
  });
}

/**
 * Per-child reading progress + a distribution of the latest level each child sits at.
 * `cciId` narrows to a single CCI; omit to view across all CCIs.
 */
export async function getReadingProgress(cciId?: string) {
  const children = await prisma.child.findMany({
    where: { isActive: true, ...(cciId ? { cciId } : {}) },
    select: {
      id: true,
      childId: true,
      firstName: true,
      lastName: true,
      cciId: true,
      readingAssessments: {
        orderBy: { date: 'desc' },
        take: 10,
        select: { id: true, date: true, level: true, bookTitle: true },
      },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  const distribution: Record<string, number> = {
    BEGINNER: 0,
    LETTER: 0,
    WORD: 0,
    PARAGRAPH: 0,
    STORY: 0,
    NOT_ASSESSED: 0,
  };

  const out = children.map(c => {
    const latest = c.readingAssessments[0] ?? null;
    const key = latest?.level ?? 'NOT_ASSESSED';
    distribution[key] = (distribution[key] ?? 0) + 1;
    return {
      id: c.id,
      childId: c.childId,
      firstName: c.firstName,
      lastName: c.lastName,
      cciId: c.cciId,
      latestAssessment: latest
        ? { level: latest.level, date: latest.date, bookTitle: latest.bookTitle }
        : null,
      history: c.readingAssessments.map(a => ({
        date: a.date,
        level: a.level,
        bookTitle: a.bookTitle,
      })),
    };
  });

  // Ensure all keys present (in case READING_LEVELS gains entries later)
  for (const lvl of READING_LEVELS) {
    if (!(lvl in distribution)) distribution[lvl] = 0;
  }

  return { children: out, distribution };
}
