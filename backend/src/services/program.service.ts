import { prisma } from '../lib/prisma';
import { CurriculumType, Programme } from '@prisma/client';
import { parseISTDate } from '../lib/datetime';
import { ratioStatus } from './team.service';

// SEL and Digital Literacy & AI run on-ground at CCIs on alternate Sundays:
// one Sunday SEL, the next DLAI, rotating. SEL walks its 12-session curriculum
// in order (cycling); DLAI walks its 4 modules in order (cycling).

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istParts(date: Date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), d: ist.getUTCDate(), weekday: ist.getUTCDay() };
}
function istDateTime(y: number, m: number, d: number, time: string): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  const [hh = '10', mm = '00'] = time.split(':');
  return parseISTDate(`${y}-${pad(m + 1)}-${pad(d)}T${pad(Number(hh))}:${pad(Number(mm))}`);
}

const PROGRAMME_FOR_CURRICULUM: Record<Programme, CurriculumType | null> = {
  P1_EDUCATION: null,
  P2_SEL: CurriculumType.SEL,
  P3_DIGITAL_LITERACY: CurriculumType.DIGITAL_LITERACY,
  P4_HEALTH_NUTRITION: null,
  P5_LIBRARY: null,
};

export async function listCurriculum(type: CurriculumType) {
  return prisma.curriculumItem.findMany({ where: { type }, orderBy: { sequence: 'asc' } });
}

/** Opportunity + its curriculum item + live ratio status. */
export async function getSessionWithCurriculum(opportunityId: string) {
  const opp = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      curriculumItem: true,
      registrations: { include: { volunteer: { include: { user: { select: { id: true, name: true } } } } } },
    },
  });
  if (!opp) return null;
  const volunteerCount = opp.registrations.length;
  const students = opp.studentCount ?? 0;
  return { ...opp, ratio: ratioStatus(students, volunteerCount), volunteerCount };
}

/**
 * Generate DRAFT Opportunity rows for upcoming Sundays from the active
 * ALTERNATE_SUNDAY series, alternating P2_SEL / P3_DIGITAL_LITERACY and
 * auto-linking the next curriculum item in sequence (cycling).
 * Idempotent per (programmeArea, dateTime, cciId).
 */
export async function createSundaySessionsFromSeries(untilDate?: Date): Promise<{ created: number }> {
  const series = await prisma.recurringSeries.findFirst({
    where: { cadence: 'ALTERNATE_SUNDAY', isActive: true },
    orderBy: { startDate: 'asc' },
  });
  if (!series) return { created: 0 };

  const until = untilDate ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const startTime = series.defaultStartTime || '10:00';
  const duration = series.durationMinutes || 90;

  // Resolve a CCI: series.cciId, else first active CCI.
  let cciId = series.cciId;
  let occupancy = 0;
  if (cciId) {
    const cci = await prisma.cCI.findUnique({ where: { id: cciId } });
    occupancy = cci?.currentOccupancy ?? 0;
  } else {
    const cci = await prisma.cCI.findFirst({ where: { status: 'ACTIVE' } });
    cciId = cci?.id ?? null;
    occupancy = cci?.currentOccupancy ?? 0;
    if (cci) {
      // re-read fullAddress below
    }
  }
  const cci = cciId ? await prisma.cCI.findUnique({ where: { id: cciId } }) : null;
  const location = cci ? `${cci.name}, ${cci.district}` : 'CCI (TBD)';

  // Curriculum sizes
  const [selItems, dlaiItems] = await Promise.all([
    prisma.curriculumItem.findMany({ where: { type: 'SEL' }, orderBy: { sequence: 'asc' } }),
    prisma.curriculumItem.findMany({ where: { type: 'DIGITAL_LITERACY' }, orderBy: { sequence: 'asc' } }),
  ]);

  // Find first Sunday on/after the series startDate.
  const cursor = new Date(series.startDate.getTime());
  while (istParts(cursor).weekday !== 0 && cursor <= until) {
    cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  // Per-programme running counters (how many of that programme already created),
  // so curriculum linking is deterministic and resumes correctly.
  const selCount = await prisma.opportunity.count({ where: { programmeArea: 'P2_SEL', curriculumItemId: { not: null } } });
  const dlaiCount = await prisma.opportunity.count({ where: { programmeArea: 'P3_DIGITAL_LITERACY', curriculumItemId: { not: null } } });
  let selK = selCount;
  let dlaiK = dlaiCount;

  let sundayIndex = 0;
  let created = 0;
  const studentCount = occupancy || 30;
  const requiredCount = Math.max(1, Math.ceil(studentCount / 6));

  while (cursor <= until) {
    const p = istParts(cursor);
    const isSEL = sundayIndex % 2 === 0;
    const programmeArea: Programme = isSEL ? 'P2_SEL' : 'P3_DIGITAL_LITERACY';
    const dt = istDateTime(p.y, p.m, p.d, startTime);

    // idempotency: skip if an opportunity already exists for this programme+date+cci
    const existing = await prisma.opportunity.findFirst({
      where: { programmeArea, dateTime: dt, cciId: cciId ?? undefined },
    });
    if (!existing) {
      let curriculumItemId: string | null = null;
      let titleSuffix = '';
      if (isSEL && selItems.length) {
        const item = selItems[selK % selItems.length];
        curriculumItemId = item.id;
        titleSuffix = `Session ${item.sequence}: ${item.title}`;
        selK++;
      } else if (!isSEL && dlaiItems.length) {
        const item = dlaiItems[dlaiK % dlaiItems.length];
        curriculumItemId = item.id;
        titleSuffix = `Module ${item.sequence}: ${item.title}`;
        dlaiK++;
      }
      const label = isSEL ? 'SEL' : 'Digital Literacy & AI';
      await prisma.opportunity.create({
        data: {
          title: `${label} — ${titleSuffix}`.trim(),
          programmeArea,
          cciId: cciId ?? undefined,
          dateTime: dt,
          durationMinutes: duration,
          location,
          requiredCount,
          studentCount,
          deliveryMode: 'ON_GROUND',
          status: 'DRAFT',
          curriculumItemId: curriculumItemId ?? undefined,
          createdById: series.createdById,
        },
      });
      created++;
    } else {
      // keep counters advancing so future links stay in sequence
      if (isSEL) selK++; else dlaiK++;
    }

    cursor.setTime(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
    sundayIndex++;
  }

  return { created };
}

/** Upcoming SEL/DLAI sessions with curriculum + ratio (for the programmes board). */
export async function listProgrammeSessions(programme: Programme) {
  const opps = await prisma.opportunity.findMany({
    where: { programmeArea: programme, dateTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    include: { curriculumItem: true, _count: { select: { registrations: true } } },
    orderBy: { dateTime: 'asc' },
  });
  return opps.map(o => ({
    ...o,
    volunteerCount: o._count.registrations,
    ratio: ratioStatus(o.studentCount ?? 0, o._count.registrations),
  }));
}
