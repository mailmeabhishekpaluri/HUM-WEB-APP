import { prisma } from '../lib/prisma';
import { Programme, SessionCadence } from '@prisma/client';
import { parseISTDate } from '../lib/datetime';

// All scheduling math is done in Asia/Kolkata. We work with an IST "wall clock"
// by combining a series' date with its defaultStartTime ("HH:MM") and parsing
// the naive string as IST via parseISTDate — identical convention to the rest
// of the app, so a session at 17:00 always means 17:00 IST regardless of server TZ.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Return a Date's components as they appear on an IST wall clock. */
function istParts(date: Date): { y: number; m: number; d: number; weekday: number } {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    y: ist.getUTCFullYear(),
    m: ist.getUTCMonth(), // 0-11
    d: ist.getUTCDate(),
    weekday: ist.getUTCDay(), // 0 = Sun … 6 = Sat
  };
}

/** Build an IST instant from y/m/d + "HH:MM". */
function istDateTime(y: number, m: number, d: number, time: string): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  const [hh = '00', mm = '00'] = time.split(':');
  return parseISTDate(`${y}-${pad(m + 1)}-${pad(d)}T${pad(Number(hh))}:${pad(Number(mm))}`);
}

/** Whole days between two dates (UTC-safe). */
function dayDiff(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Given a RecurringSeries, return every session datetime it should have
 * from startDate up to (and including) untilDate, honouring its cadence.
 * Pure logic — does NOT materialise any rows.
 */
export async function generateSessionsForSeries(seriesId: string, untilDate: Date): Promise<Date[]> {
  const series = await prisma.recurringSeries.findUnique({ where: { id: seriesId } });
  if (!series) throw new Error('Series not found');
  return computeSessionDates(
    {
      cadence: series.cadence,
      startDate: series.startDate,
      endDate: series.endDate,
      defaultStartTime: series.defaultStartTime,
    },
    untilDate,
  );
}

/** Cadence date generator, separated so it is unit-testable without the DB. */
export function computeSessionDates(
  series: { cadence: SessionCadence; startDate: Date; endDate?: Date | null; defaultStartTime: string },
  untilDate: Date,
): Date[] {
  const { cadence, startDate, defaultStartTime } = series;
  const hardEnd = series.endDate && series.endDate < untilDate ? series.endDate : untilDate;
  const start = istParts(startDate);
  const out: Date[] = [];

  const push = (y: number, m: number, d: number) => {
    const dt = istDateTime(y, m, d, defaultStartTime);
    if (dt >= startDate && dt <= hardEnd) out.push(dt);
  };

  switch (cadence) {
    case 'WEEKLY_MWF': {
      // Mon (1), Wed (3), Fri (5) every week.
      const cursor = new Date(startDate.getTime());
      while (cursor <= hardEnd) {
        const p = istParts(cursor);
        if (p.weekday === 1 || p.weekday === 3 || p.weekday === 5) push(p.y, p.m, p.d);
        cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
      }
      break;
    }
    case 'ALTERNATE_SUNDAY': {
      // First Sunday on/after startDate, then every 14 days.
      const cursor = new Date(startDate.getTime());
      // advance to the first Sunday on/after start
      while (istParts(cursor).weekday !== 0 && cursor <= hardEnd) {
        cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
      }
      while (cursor <= hardEnd) {
        const p = istParts(cursor);
        push(p.y, p.m, p.d);
        cursor.setTime(cursor.getTime() + 14 * 24 * 60 * 60 * 1000);
      }
      break;
    }
    case 'MONTHLY':
    case 'BIMONTHLY':
    case 'QUARTERLY': {
      const step = cadence === 'MONTHLY' ? 1 : cadence === 'BIMONTHLY' ? 2 : 3;
      let y = start.y;
      let m = start.m;
      const dayOfMonth = start.d;
      // iterate month-by-step until past hardEnd
      // cap iterations defensively
      for (let i = 0; i < 600; i++) {
        // clamp day to month length
        const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        const d = Math.min(dayOfMonth, lastDay);
        const dt = istDateTime(y, m, d, defaultStartTime);
        if (dt > hardEnd) break;
        if (dt >= startDate) out.push(dt);
        m += step;
        while (m > 11) { m -= 12; y += 1; }
      }
      break;
    }
    case 'CUSTOM':
    default:
      // CUSTOM series are scheduled explicitly elsewhere; no auto-generation.
      break;
  }

  return out;
}

/**
 * Pure check: does `date` fall on a session Sunday relative to a reference
 * start Sunday (every other Sunday)? Reused by SEL/DLAI alternate-week logic.
 */
export function isAlternateSundayFrom(referenceStart: Date, date: Date): boolean {
  if (istParts(date).weekday !== 0) return false;
  const days = dayDiff(referenceStart, date);
  if (days < 0) return false;
  return days % 14 === 0;
}

/**
 * Whether `date` is a session Sunday for the given programme, derived from its
 * active ALTERNATE_SUNDAY series' startDate. Returns false if no such series.
 */
export async function isAlternateSundayFor(programme: Programme, date: Date): Promise<boolean> {
  const series = await prisma.recurringSeries.findFirst({
    where: { programmeArea: programme, cadence: 'ALTERNATE_SUNDAY', isActive: true },
    orderBy: { startDate: 'asc' },
  });
  if (!series) return false;
  return isAlternateSundayFrom(series.startDate, date);
}
