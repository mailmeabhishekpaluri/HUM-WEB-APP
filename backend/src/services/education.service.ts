import { prisma } from '../lib/prisma';
import { parseISTDate } from '../lib/datetime';
import { createNotification } from './notification.service';
import { NotificationType } from '@prisma/client';

// assignedVolunteerId / primaryVolunteerId are User ids (req.user.id), so RBAC
// checks and substitution reassignment compare directly against the auth user.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istWeekday(date: Date): number {
  return new Date(date.getTime() + IST_OFFSET_MS).getUTCDay(); // 0=Sun..6=Sat
}
function istParts(date: Date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), d: ist.getUTCDate() };
}
function sessionDateTime(date: Date, startTime: string): Date {
  const { y, m, d } = istParts(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  const [hh = '17', mm = '00'] = startTime.split(':');
  return parseISTDate(`${y}-${pad(m + 1)}-${pad(d)}T${pad(Number(hh))}:${pad(Number(mm))}`);
}

// ── Sections ────────────────────────────────────────────────────────────────

export async function listSections(filters?: { academicYear?: string; grade?: string; active?: boolean }) {
  const where: any = {};
  if (filters?.academicYear) where.academicYear = filters.academicYear;
  if (filters?.grade) where.grade = filters.grade;
  if (filters?.active !== undefined) where.isActive = filters.active;
  const sections = await prisma.classSection.findMany({
    where,
    include: { _count: { select: { enrollments: true, sessions: true } } },
    orderBy: [{ grade: 'asc' }, { subject: 'asc' }],
  });
  // attach next upcoming session per section
  const withNext = await Promise.all(sections.map(async s => {
    const next = await prisma.classSession.findFirst({
      where: { classSectionId: s.id, date: { gte: new Date() }, status: { in: ['SCHEDULED', 'SUBSTITUTION_REQUESTED'] } },
      orderBy: { date: 'asc' },
    });
    return { ...s, nextSession: next };
  }));
  return withNext;
}

export async function getSection(id: string) {
  return prisma.classSection.findUnique({
    where: { id },
    include: {
      enrollments: { include: { child: { select: { id: true, childId: true, firstName: true, lastName: true } } } },
      sessions: { orderBy: { date: 'asc' } },
    },
  });
}

export async function createSection(data: any) {
  return prisma.classSection.create({
    data: {
      grade: data.grade,
      subject: data.subject,
      academicYear: data.academicYear,
      dayOfWeek: Number(data.dayOfWeek),
      startTime: data.startTime || '17:00',
      durationMinutes: data.durationMinutes ?? 60,
      meetLink: data.meetLink || null,
      cciId: data.cciId || null,
      primaryVolunteerId: data.primaryVolunteerId || null,
    },
  });
}

export async function updateSection(id: string, data: any) {
  const patch: any = {};
  for (const f of ['grade', 'subject', 'academicYear', 'startTime', 'durationMinutes', 'meetLink', 'cciId', 'primaryVolunteerId', 'isActive']) {
    if (data[f] !== undefined) patch[f] = data[f] || (f === 'isActive' ? data[f] : data[f] === '' ? null : data[f]);
  }
  if (data.dayOfWeek !== undefined) patch.dayOfWeek = Number(data.dayOfWeek);
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  return prisma.classSection.update({ where: { id }, data: patch });
}

export async function enrollChild(classSectionId: string, childId: string) {
  return prisma.classEnrollment.upsert({
    where: { classSectionId_childId: { classSectionId, childId } },
    update: {},
    create: { classSectionId, childId },
  });
}

export async function unenrollChild(classSectionId: string, childId: string) {
  return prisma.classEnrollment.deleteMany({ where: { classSectionId, childId } });
}

// ── Session materialisation ───────────────────────────────────────────────

/** Create ClassSession rows for the next `days` days for every active section. Idempotent. */
export async function materializeUpcomingClassSessions(days = 14): Promise<number> {
  const sections = await prisma.classSection.findMany({ where: { isActive: true } });
  const now = new Date();
  let created = 0;
  for (const section of sections) {
    for (let i = 0; i < days; i++) {
      const day = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      if (istWeekday(day) !== section.dayOfWeek) continue;
      const dt = sessionDateTime(day, section.startTime);
      // check-then-create keeps this idempotent without throwing on the unique
      // [sectionId,date] constraint (a thrown+caught error mid-seed is noisy/fragile)
      const existing = await prisma.classSession.findUnique({
        where: { classSectionId_date: { classSectionId: section.id, date: dt } },
      });
      if (existing) continue;
      await prisma.classSession.create({
        data: {
          classSectionId: section.id,
          date: dt,
          assignedVolunteerId: section.primaryVolunteerId,
          meetLink: section.meetLink,
        },
      });
      created++;
    }
  }
  return created;
}

// ── Teacher actions ─────────────────────────────────────────────────────────

async function assertAssignedTeacher(sessionId: string, userId: string, role: string) {
  const session = await prisma.classSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error('Class session not found');
  const isManager = role === 'SUPER_ADMIN' || role === 'PROGRAM_MANAGER';
  if (!isManager && session.assignedVolunteerId !== userId) {
    const err: any = new Error('You are not the assigned teacher for this class');
    err.status = 403;
    throw err;
  }
  return session;
}

export async function submitLessonPlan(sessionId: string, userId: string, role: string, plan: string, topic?: string) {
  await assertAssignedTeacher(sessionId, userId, role);
  return prisma.classSession.update({
    where: { id: sessionId },
    data: { lessonPlan: plan, topic: topic ?? undefined, lessonPlanSubmittedAt: new Date() },
  });
}

export async function submitClassFeedback(sessionId: string, userId: string, role: string, feedback: string) {
  await assertAssignedTeacher(sessionId, userId, role);
  return prisma.classSession.update({
    where: { id: sessionId },
    data: { classFeedback: feedback, feedbackSubmittedAt: new Date(), status: 'COMPLETED' },
  });
}

export async function markClassAttendance(
  sessionId: string,
  userId: string,
  role: string,
  records: { childId: string; present: boolean; note?: string }[],
) {
  await assertAssignedTeacher(sessionId, userId, role);
  const results = [];
  for (const r of records) {
    results.push(await prisma.classAttendance.upsert({
      where: { classSessionId_childId: { classSessionId: sessionId, childId: r.childId } },
      update: { present: r.present, note: r.note ?? null, markedById: userId },
      create: { classSessionId: sessionId, childId: r.childId, present: r.present, note: r.note ?? null, markedById: userId },
    }));
  }
  return results;
}

export async function getSessionDetail(sessionId: string) {
  return prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      classSection: { include: { enrollments: { include: { child: { select: { id: true, childId: true, firstName: true, lastName: true } } } } } },
      attendance: true,
      substitutionRequests: { orderBy: { createdAt: 'desc' } },
    },
  });
}

// ── Substitution ──────────────────────────────────────────────────────────

/** Active P1 volunteers (assigned to P1 or who prefer P1); fallback to all active volunteers. */
async function getP1VolunteerUserIds(excludeUserId?: string): Promise<string[]> {
  const profiles = await prisma.volunteerProfile.findMany({
    where: {
      accountStatus: 'ACTIVE',
      OR: [
        { programmeAssignments: { some: { programme: 'P1_EDUCATION', isActive: true } } },
        { preferredProgrammes: { has: 'P1_EDUCATION' } },
      ],
    },
    select: { userId: true },
  });
  let ids = profiles.map(p => p.userId);
  if (ids.length === 0) {
    const all = await prisma.volunteerProfile.findMany({ where: { accountStatus: 'ACTIVE' }, select: { userId: true } });
    ids = all.map(p => p.userId);
  }
  return ids.filter(id => id !== excludeUserId);
}

export async function requestSubstitution(sessionId: string, userId: string, role: string, reason?: string) {
  const session = await assertAssignedTeacher(sessionId, userId, role);
  const request = await prisma.substitutionRequest.create({
    data: { classSessionId: sessionId, requestedById: userId, reason: reason ?? null },
  });
  await prisma.classSession.update({ where: { id: sessionId }, data: { status: 'SUBSTITUTION_REQUESTED' } });

  const section = await prisma.classSection.findUnique({ where: { id: session.classSectionId } });
  const when = session.date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const label = section ? `${String(section.grade).replace('_', ' ')} ${section.subject}` : 'a class';

  const recipients = await getP1VolunteerUserIds(userId);
  for (const recipientId of recipients) {
    await createNotification({
      userId: recipientId,
      title: 'Substitute teacher needed 🙋',
      body: `${label} on ${when} needs a substitute. Open the substitution board to accept.`,
      type: NotificationType.SUBSTITUTION_REQUESTED,
      data: { sessionId, requestId: request.id },
    });
  }
  return request;
}

export async function acceptSubstitution(requestId: string, userId: string) {
  const request = await prisma.substitutionRequest.findUnique({ where: { id: requestId }, include: { classSession: true } });
  if (!request) throw new Error('Substitution request not found');
  if (request.status !== 'OPEN') {
    const err: any = new Error('This substitution request is no longer open');
    err.status = 409;
    throw err;
  }
  const [updatedRequest] = await prisma.$transaction([
    prisma.substitutionRequest.update({ where: { id: requestId }, data: { status: 'FILLED', filledById: userId, filledAt: new Date() } }),
    prisma.classSession.update({ where: { id: request.classSessionId }, data: { assignedVolunteerId: userId, status: 'SCHEDULED' } }),
  ]);

  // notify the original requester
  const acceptor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await createNotification({
    userId: request.requestedById,
    title: 'Substitute found ✅',
    body: `${acceptor?.name || 'A volunteer'} has accepted your substitution request.`,
    type: NotificationType.SUBSTITUTION_FILLED,
    data: { sessionId: request.classSessionId },
  });
  return updatedRequest;
}

export async function listOpenSubstitutions() {
  return prisma.substitutionRequest.findMany({
    where: { status: 'OPEN' },
    include: {
      classSession: { include: { classSection: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Schedule ────────────────────────────────────────────────────────────────

export async function getVolunteerSchedule(userId: string, fromDate?: Date, toDate?: Date) {
  const where: any = { assignedVolunteerId: userId };
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date.gte = fromDate;
    if (toDate) where.date.lte = toDate;
  } else {
    where.date = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
  }
  const sessions = await prisma.classSession.findMany({
    where,
    include: { classSection: true },
    orderBy: { date: 'asc' },
  });
  return sessions.map(s => ({
    ...s,
    meetLink: s.meetLink || s.classSection.meetLink,
    planSubmitted: !!s.lessonPlanSubmittedAt,
    feedbackSubmitted: !!s.feedbackSubmittedAt,
  }));
}

// ── Sessions listing ──────────────────────────────────────────────────────

export async function listSessions(filters: { sectionId?: string; mineUserId?: string; from?: Date; to?: Date }) {
  const where: any = {};
  if (filters.sectionId) where.classSectionId = filters.sectionId;
  if (filters.mineUserId) where.assignedVolunteerId = filters.mineUserId;
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }
  return prisma.classSession.findMany({
    where,
    include: { classSection: true },
    orderBy: { date: 'asc' },
  });
}
