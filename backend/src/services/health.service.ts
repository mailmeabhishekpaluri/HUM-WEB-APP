import { prisma } from '../lib/prisma';
import { Programme, HealthEventType } from '@prisma/client';
import { parseISTDate } from '../lib/datetime';
import { addGrowthRecord, addVaccination, addIllness } from './child.service';

// All scheduling math runs on an IST wall-clock — identical convention to
// program.service.ts and scheduling.service.ts so a 10:00 session always
// means 10:00 IST regardless of server TZ.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istParts(date: Date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), d: ist.getUTCDate() };
}

function istDateTime(y: number, m: number, d: number, time: string): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  const [hh = '10', mm = '00'] = time.split(':');
  return parseISTDate(`${y}-${pad(m + 1)}-${pad(d)}T${pad(Number(hh))}:${pad(Number(mm))}`);
}

/** Step n months forward in IST, clamping day-of-month. */
function addMonths(y: number, m: number, d: number, step: number): { y: number; m: number; d: number } {
  let ny = y;
  let nm = m + step;
  while (nm > 11) { nm -= 12; ny += 1; }
  while (nm < 0) { nm += 12; ny -= 1; }
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return { y: ny, m: nm, d: Math.min(d, lastDay) };
}

interface CreateResult { created: number }

/**
 * Materialise upcoming quarterly checkup Opportunities (DRAFT) from each
 * active QUARTERLY P4_HEALTH_NUTRITION series, stepping every 3 months from
 * the series startDate. Idempotent per (programmeArea, dateTime, cciId, healthEventType).
 */
export async function createQuarterlyCheckups(untilDate?: Date): Promise<CreateResult> {
  const until = untilDate ?? new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
  const seriesList = await prisma.recurringSeries.findMany({
    where: { programmeArea: 'P4_HEALTH_NUTRITION', cadence: 'QUARTERLY', isActive: true },
  });

  let created = 0;
  for (const series of seriesList) {
    const startTime = series.defaultStartTime || '10:00';
    const duration = series.durationMinutes || 90;
    const cciId = series.cciId;
    const cci = cciId ? await prisma.cCI.findUnique({ where: { id: cciId } }) : null;
    const occupancy = cci?.currentOccupancy ?? 0;
    const studentCount = occupancy || 30;
    const requiredCount = Math.max(1, Math.ceil(studentCount / 15));
    const location = cci ? `${cci.name}, ${cci.district}` : 'CCI (TBD)';

    const start = istParts(series.startDate);
    let cur = { y: start.y, m: start.m, d: start.d };
    for (let i = 0; i < 200; i++) {
      const dt = istDateTime(cur.y, cur.m, cur.d, startTime);
      if (dt > until) break;
      if (dt >= series.startDate && dt >= new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        const existing = await prisma.opportunity.findFirst({
          where: {
            programmeArea: 'P4_HEALTH_NUTRITION',
            healthEventType: 'QUARTERLY_CHECKUP',
            dateTime: dt,
            cciId: cciId ?? undefined,
          },
        });
        if (!existing) {
          await prisma.opportunity.create({
            data: {
              title: `Quarterly Health Checkup${cci ? ' — ' + cci.name : ''}`,
              programmeArea: 'P4_HEALTH_NUTRITION',
              healthEventType: 'QUARTERLY_CHECKUP',
              cciId: cciId ?? undefined,
              dateTime: dt,
              durationMinutes: duration,
              location,
              requiredCount,
              studentCount,
              deliveryMode: 'ON_GROUND',
              status: 'DRAFT',
              createdById: series.createdById,
            },
          });
          created++;
        }
      }
      cur = addMonths(cur.y, cur.m, cur.d, 3);
    }
  }
  return { created };
}

/**
 * Materialise upcoming monthly awareness Opportunities from each active
 * MONTHLY P4 series. CCI rotates across all active CCIs by month index so
 * coverage is spread. Status OPEN so volunteers can sign up.
 * Idempotent per (programmeArea, dateTime, cciId, healthEventType).
 */
export async function createMonthlyAwareness(untilDate?: Date): Promise<CreateResult> {
  const until = untilDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const seriesList = await prisma.recurringSeries.findMany({
    where: { programmeArea: 'P4_HEALTH_NUTRITION', cadence: 'MONTHLY', isActive: true },
  });
  const activeCcis = await prisma.cCI.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });

  let created = 0;
  for (const series of seriesList) {
    const startTime = series.defaultStartTime || '10:00';
    const duration = series.durationMinutes || 90;
    const requiredCount = series.requiredCount || 3;

    const start = istParts(series.startDate);
    let cur = { y: start.y, m: start.m, d: start.d };
    let monthIdx = 0;
    for (let i = 0; i < 200; i++) {
      const dt = istDateTime(cur.y, cur.m, cur.d, startTime);
      if (dt > until) break;
      if (dt >= series.startDate && dt >= new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        const cciId = activeCcis.length ? activeCcis[monthIdx % activeCcis.length].id : null;
        const cci = cciId ? activeCcis[monthIdx % activeCcis.length] : null;
        const location = cci ? `${cci.name}, ${cci.district}` : 'CCI (TBD)';

        const existing = await prisma.opportunity.findFirst({
          where: {
            programmeArea: 'P4_HEALTH_NUTRITION',
            healthEventType: 'MONTHLY_AWARENESS',
            dateTime: dt,
            cciId: cciId ?? undefined,
          },
        });
        if (!existing) {
          await prisma.opportunity.create({
            data: {
              title: `Monthly Health Awareness${cci ? ' — ' + cci.name : ''}`,
              programmeArea: 'P4_HEALTH_NUTRITION',
              healthEventType: 'MONTHLY_AWARENESS',
              cciId: cciId ?? undefined,
              dateTime: dt,
              durationMinutes: duration,
              location,
              requiredCount,
              studentCount: cci?.currentOccupancy ?? null,
              deliveryMode: 'ON_GROUND',
              status: 'OPEN',
              createdById: series.createdById,
            },
          });
          created++;
        }
      }
      cur = addMonths(cur.y, cur.m, cur.d, 1);
      monthIdx++;
    }
  }
  return { created };
}

interface MeasurementRecord {
  childId: string;
  heightCm?: number | string;
  weightKg?: number | string;
  notes?: string;
  vaccinations?: { vaccineName: string; givenDate: string; recommendedDate?: string; facility?: string }[];
  illness?: { symptoms: string; diagnosis?: string; treatment?: string; outcome?: string };
}

/** Persist growth/vaccination/illness records taken at a quarterly checkup. */
export async function recordCheckupMeasurements(
  opportunityId: string,
  records: MeasurementRecord[],
  measuredBy: string,
): Promise<{ growthRecords: number; vaccinations: number; illnesses: number }> {
  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp) throw new Error('Opportunity not found');
  if (opp.healthEventType !== 'QUARTERLY_CHECKUP') {
    throw new Error('Measurements may only be recorded against a QUARTERLY_CHECKUP opportunity');
  }
  let growthRecords = 0;
  let vaccinations = 0;
  let illnesses = 0;
  const date = opp.dateTime;

  for (const r of records) {
    if (!r.childId) continue;
    const hasHeight = r.heightCm !== undefined && r.heightCm !== null && String(r.heightCm).trim() !== '';
    const hasWeight = r.weightKg !== undefined && r.weightKg !== null && String(r.weightKg).trim() !== '';
    if (hasHeight || hasWeight) {
      await addGrowthRecord(r.childId, {
        date,
        heightCm: hasHeight ? r.heightCm : undefined,
        weightKg: hasWeight ? r.weightKg : undefined,
        notes: r.notes,
      }, measuredBy);
      growthRecords++;
    }
    if (Array.isArray(r.vaccinations)) {
      for (const v of r.vaccinations) {
        await addVaccination(r.childId, {
          vaccineName: v.vaccineName,
          recommendedDate: v.recommendedDate || v.givenDate || date,
          givenDate: v.givenDate || date,
          facility: v.facility,
        });
        vaccinations++;
      }
    }
    if (r.illness && r.illness.symptoms) {
      await addIllness(r.childId, {
        date,
        symptoms: r.illness.symptoms,
        diagnosis: r.illness.diagnosis,
        treatment: r.illness.treatment,
        outcome: r.illness.outcome,
      });
      illnesses++;
    }
  }
  return { growthRecords, vaccinations, illnesses };
}

/**
 * Per-CCI health snapshot for the Health & Nutrition dashboard. Returns one
 * row per active CCI plus an upcoming-awareness rail.
 */
export async function getHealthDashboard() {
  const ccis = await prisma.cCI.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const rows = await Promise.all(ccis.map(async (cci) => {
    const [lastCheckup, growthThisQuarter, latestPerChild, nextAwareness] = await Promise.all([
      prisma.opportunity.findFirst({
        where: {
          programmeArea: 'P4_HEALTH_NUTRITION' as Programme,
          healthEventType: 'QUARTERLY_CHECKUP' as HealthEventType,
          cciId: cci.id,
          dateTime: { lt: now },
        },
        orderBy: { dateTime: 'desc' },
        select: { dateTime: true },
      }),
      prisma.healthGrowth.findMany({
        where: { child: { cciId: cci.id }, date: { gte: ninetyDaysAgo } },
        select: { childId: true },
        distinct: ['childId'],
      }),
      prisma.child.findMany({
        where: { cciId: cci.id, isActive: true },
        select: {
          id: true,
          healthGrowth: { orderBy: { date: 'desc' }, take: 1, select: { bmi: true } },
        },
      }),
      prisma.opportunity.findFirst({
        where: {
          programmeArea: 'P4_HEALTH_NUTRITION' as Programme,
          healthEventType: 'MONTHLY_AWARENESS' as HealthEventType,
          cciId: cci.id,
          dateTime: { gte: now },
        },
        orderBy: { dateTime: 'asc' },
        select: { id: true, dateTime: true },
      }),
    ]);

    const bmiOutliers = latestPerChild.reduce((n, c) => {
      const bmi = c.healthGrowth[0]?.bmi;
      return bmi != null && (bmi < 14 || bmi > 25) ? n + 1 : n;
    }, 0);

    return {
      cciId: cci.id,
      cciName: cci.name,
      district: cci.district,
      lastCheckupDate: lastCheckup?.dateTime ?? null,
      childrenMeasuredThisQuarter: growthThisQuarter.length,
      bmiOutliers,
      upcomingAwareness: nextAwareness ?? null,
    };
  }));

  const [upcomingCheckupsRaw, upcomingAwarenessRaw] = await Promise.all([
    prisma.opportunity.findMany({
      where: {
        programmeArea: 'P4_HEALTH_NUTRITION',
        healthEventType: 'QUARTERLY_CHECKUP',
        dateTime: { gte: now },
      },
      orderBy: { dateTime: 'asc' },
      take: 5,
    }),
    prisma.opportunity.findMany({
      where: {
        programmeArea: 'P4_HEALTH_NUTRITION',
        healthEventType: 'MONTHLY_AWARENESS',
        dateTime: { gte: now },
      },
      orderBy: { dateTime: 'asc' },
      take: 5,
    }),
  ]);

  const cciById = new Map(ccis.map(c => [c.id, { id: c.id, name: c.name, district: c.district }]));
  const hydrate = (o: typeof upcomingCheckupsRaw[number]) => ({
    ...o,
    cci: o.cciId ? cciById.get(o.cciId) ?? null : null,
  });

  return {
    ccis: rows,
    upcomingCheckups: upcomingCheckupsRaw.map(hydrate),
    upcomingAwareness: upcomingAwarenessRaw.map(hydrate),
  };
}

/** Hydrate a checkup opportunity with the children currently at its CCI. */
export async function getCheckupWithRoster(opportunityId: string) {
  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp) throw new Error('Opportunity not found');
  const cci = opp.cciId
    ? await prisma.cCI.findUnique({ where: { id: opp.cciId }, select: { id: true, name: true, district: true } })
    : null;
  const children = opp.cciId
    ? await prisma.child.findMany({
        where: { cciId: opp.cciId, isActive: true },
        select: { id: true, childId: true, firstName: true, lastName: true, dateOfBirth: true },
        orderBy: [{ firstName: 'asc' }],
      })
    : [];
  return { opportunity: { ...opp, cci }, children };
}
