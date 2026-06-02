import { prisma } from '../lib/prisma';
import { AccountStatus, BadgeTrigger, PoliceStatus, SafeguardingStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function registerVolunteer(data: {
  name: string; email: string; mobile: string; city: string; password?: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { mobile: data.mobile }] },
  });
  if (existing) throw new Error('Email or mobile already registered');

  const passwordHash = await bcrypt.hash(data.password || Math.random().toString(36).slice(2), 10);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      mobile: data.mobile,
      name: data.name,
      role: Role.VOLUNTEER,
      passwordHash,
    },
  });
  const profile = await prisma.volunteerProfile.create({
    data: { userId: user.id, city: data.city },
  });
  return { user, profile };
}

export async function updateVolunteerProfile(userId: string, data: {
  city?: string; skills?: string[];
  organisation?: string; professionalDomain?: string; languages?: string[];
  availabilityDays?: number[]; hoursPerWeek?: number; preferredProgrammes?: string[];
  preferredCCIId?: string; motivationStatement?: string; emergencyContact?: string;
  corporatePartner?: string;
}) {
  if (data.skills && data.skills.length) {
    await updateSkills(userId, data.skills);
  }
  return prisma.volunteerProfile.update({
    where: { userId },
    data: {
      city: data.city,
      organisation: data.organisation,
      professionalDomain: data.professionalDomain as any,
      languages: data.languages,
      availabilityDays: data.availabilityDays,
      hoursPerWeek: data.hoursPerWeek,
      preferredProgrammes: data.preferredProgrammes as any,
      preferredCCIId: data.preferredCCIId,
      motivationStatement: data.motivationStatement,
      emergencyContact: data.emergencyContact,
      corporatePartner: data.corporatePartner,
    },
  });
}

export async function updateSkills(userId: string, skillNames: string[]) {
  const profile = await prisma.volunteerProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Volunteer profile not found');

  const skills = await Promise.all(
    skillNames.map(name => prisma.skill.upsert({ where: { name }, update: {}, create: { name, isApproved: false } }))
  );

  await prisma.volunteerSkill.deleteMany({ where: { volunteerId: profile.id } });
  await prisma.volunteerSkill.createMany({
    data: skills.map(s => ({ volunteerId: profile.id, skillId: s.id })),
    skipDuplicates: true,
  });

  return skills;
}

export const SAFEGUARDING_QUIZ = [
  { id: 1, question: 'Child safeguarding means protecting children from:', options: ['Physical harm only', 'All forms of abuse and neglect', 'Strangers only', 'Online harm only'], correct: 1 },
  { id: 2, question: 'If you suspect a child is being abused, you should:', options: ['Ignore it as it is not your responsibility', 'Confront the abuser', 'Report it to a supervisor or designated safeguarding lead', 'Tell other volunteers'], correct: 2 },
  { id: 3, question: 'POCSO Act 2012 covers:', options: ['Only girls under 18', 'All children under 18 regardless of gender', 'Only children in CCIs', 'Children under 14'], correct: 1 },
  { id: 4, question: 'Appropriate physical contact with children during volunteering:', options: ['Hugging is always fine', 'No physical contact is allowed ever', 'Is only appropriate when the child initiates and in view of others', 'Depends on how well you know the child'], correct: 2 },
  { id: 5, question: 'Child data (names, photos) should be:', options: ['Shared on social media to raise awareness', 'Kept confidential and handled per organisational policy', 'Shared only with family members', 'Posted in volunteer WhatsApp groups'], correct: 1 },
  { id: 6, question: 'If a child discloses abuse to you, you should:', options: ['Promise to keep it secret', 'Listen carefully, not promise secrecy, and report to a supervisor', 'Handle it yourself', 'Dismiss it as a child\'s imagination'], correct: 1 },
  { id: 7, question: 'One-to-one meetings with children:', options: ['Are fine in private rooms', 'Should always be in open, visible spaces', 'Are not necessary', 'Are fine if the child agrees'], correct: 1 },
  { id: 8, question: 'Photography of children at CCIs requires:', options: ['No permission needed', 'Permission from the child and CCI Superintendent', 'Only the child\'s verbal consent', 'Permission from parents only'], correct: 1 },
  { id: 9, question: 'The purpose of police verification for volunteers is:', options: ['To track volunteers\' movements', 'To ensure those with criminal records for child-related offences do not work with children', 'A formality with no real purpose', 'Only required for permanent employees'], correct: 1 },
  { id: 10, question: 'Favouritism or giving gifts to individual children:', options: ['Is a good motivational tool', 'Can create unhealthy dependency and should be avoided', 'Is fine if done discreetly', 'Is encouraged to build relationships'], correct: 1 },
];

export function scoreQuiz(answers: Record<number, number>): { score: number; passed: boolean; total: number } {
  let score = 0;
  for (const q of SAFEGUARDING_QUIZ) {
    if (answers[q.id] === q.correct) score++;
  }
  return { score, passed: score >= 8, total: SAFEGUARDING_QUIZ.length };
}

export async function submitQuizResult(userId: string, passed: boolean) {
  const profile = await prisma.volunteerProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Profile not found');
  return prisma.volunteerProfile.update({
    where: { userId },
    data: { safeguardingStatus: passed ? SafeguardingStatus.PASS : SafeguardingStatus.FAIL },
  });
}

export async function updatePoliceVerification(userId: string, status: PoliceStatus, fileUrl?: string) {
  return prisma.volunteerProfile.update({
    where: { userId },
    data: { policeVerification: status, policeVerificationUrl: fileUrl },
  });
}

export async function approveVolunteer(userId: string, approverId: string) {
  return prisma.volunteerProfile.update({
    where: { userId },
    data: { accountStatus: AccountStatus.ACTIVE, approvedAt: new Date(), approvedById: approverId },
  });
}

export async function rejectVolunteer(userId: string, reason: string) {
  return prisma.volunteerProfile.update({
    where: { userId },
    data: { accountStatus: AccountStatus.ON_HOLD, rejectionReason: reason },
  });
}

export async function listVolunteers(filters?: { city?: string; skillName?: string; status?: string }) {
  const where: any = {};
  if (filters?.city) where.city = { contains: filters.city, mode: 'insensitive' };
  if (filters?.status) where.accountStatus = filters.status;
  if (filters?.skillName) {
    const skill = await prisma.skill.findFirst({ where: { name: { contains: filters.skillName, mode: 'insensitive' } } });
    if (skill) where.skills = { some: { skillId: skill.id } };
  }
  return prisma.volunteerProfile.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true } },
      skills: { include: { skill: true } },
      badges: { include: { badge: true } },
    },
    orderBy: { joinedDate: 'desc' },
  });
}

export async function getVolunteerByUserId(userId: string) {
  return prisma.volunteerProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true } },
      skills: { include: { skill: true } },
      badges: { include: { badge: true } },
      eventRegistrations: {
        include: { opportunity: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      hoursClaims: { orderBy: { createdAt: 'desc' }, take: 5 },
      availabilityBlocks: true,
    },
  });
}

export async function createOpportunity(data: {
  title: string; programmeArea: string; cciId?: string; dateTime: string;
  durationMinutes: number; location: string; requiredCount: number;
  description?: string; safeguardingLevel?: string; requiredSkillNames?: string[];
  createdById: string;
}) {
  const opp = await prisma.opportunity.create({
    data: {
      title: data.title,
      programmeArea: data.programmeArea as any,
      cciId: data.cciId,
      dateTime: new Date(data.dateTime),
      durationMinutes: data.durationMinutes,
      location: data.location,
      requiredCount: data.requiredCount,
      description: data.description,
      safeguardingLevel: data.safeguardingLevel as any || 'NONE_REQUIRED',
      status: 'OPEN',
      createdById: data.createdById,
    },
  });

  if (data.requiredSkillNames?.length) {
    for (const name of data.requiredSkillNames) {
      const skill = await prisma.skill.upsert({ where: { name }, update: {}, create: { name, isApproved: true } });
      await prisma.opportunitySkill.upsert({
        where: { opportunityId_skillId: { opportunityId: opp.id, skillId: skill.id } },
        update: {},
        create: { opportunityId: opp.id, skillId: skill.id },
      });
    }
  }
  return opp;
}

export async function listOpportunities(status?: string) {
  return prisma.opportunity.findMany({
    where: status ? { status: status as any } : { status: { in: ['OPEN', 'FULL'] } },
    include: {
      requiredSkills: { include: { skill: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { dateTime: 'asc' },
  });
}

export async function registerForOpportunity(opportunityId: string, userId: string) {
  const profile = await prisma.volunteerProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Volunteer profile not found');
  if (profile.accountStatus !== 'ACTIVE') throw new Error('Account not yet active');

  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp) throw new Error('Opportunity not found');
  if (opp.status === 'FULL' || opp.status === 'COMPLETED' || opp.status === 'CANCELLED') throw new Error('Opportunity not available');

  if (opp.safeguardingLevel === 'SAFEGUARDING_QUIZ_ONLY' && profile.safeguardingStatus !== 'PASS') {
    throw new Error('Safeguarding quiz required for this opportunity');
  }
  if (opp.safeguardingLevel === 'POLICE_VERIFICATION_REQUIRED' && profile.policeVerification !== 'VERIFIED') {
    throw new Error('Police verification required for this opportunity');
  }

  const registration = await prisma.eventRegistration.create({
    data: { opportunityId, volunteerId: profile.id, status: 'REGISTERED' },
  });

  const count = await prisma.eventRegistration.count({ where: { opportunityId, status: { in: ['REGISTERED', 'CONFIRMED', 'ATTENDED'] } } });
  if (count >= opp.requiredCount) {
    await prisma.opportunity.update({ where: { id: opportunityId }, data: { status: 'FULL' } });
  }

  return registration;
}

export async function markAttendance(opportunityId: string, volunteerUserId: string, attended: boolean, coordinatorId: string) {
  const profile = await prisma.volunteerProfile.findUnique({ where: { userId: volunteerUserId } });
  if (!profile) throw new Error('Volunteer not found');

  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp) throw new Error('Opportunity not found');

  const reg = await prisma.eventRegistration.findFirst({ where: { opportunityId, volunteerId: profile.id } });
  if (!reg) throw new Error('Registration not found');

  const hoursLogged = attended ? opp.durationMinutes / 60 : 0;
  await prisma.eventRegistration.update({
    where: { id: reg.id },
    data: { attended, status: attended ? 'ATTENDED' : 'NO_SHOW', hoursLogged },
  });

  if (attended) {
    await prisma.volunteerProfile.update({
      where: { id: profile.id },
      data: { totalHours: { increment: hoursLogged } },
    });
    await evaluateBadges(profile.id);
  }

  return { hoursLogged };
}

export async function evaluateBadges(profileId: string) {
  const profile = await prisma.volunteerProfile.findUnique({
    where: { id: profileId },
    include: {
      badges: true,
      eventRegistrations: { where: { attended: true } },
    },
  });
  if (!profile) return;

  const allBadges = await prisma.badge.findMany();
  const earned = new Set(profile.badges.map(b => b.badgeId));
  const attendedCount = profile.eventRegistrations.filter(r => r.attended).length;
  const totalHours = profile.totalHours;

  for (const badge of allBadges) {
    if (earned.has(badge.id)) continue;
    let shouldAward = false;

    if (badge.trigger === 'FIRST_SESSION' && attendedCount >= 1) shouldAward = true;
    if (badge.trigger === 'HOURS_10' && totalHours >= 10) shouldAward = true;
    if (badge.trigger === 'HOURS_50' && totalHours >= 50) shouldAward = true;
    if (badge.trigger === 'HOURS_100' && totalHours >= 100) shouldAward = true;

    if (shouldAward) {
      await prisma.volunteerBadge.create({ data: { volunteerId: profileId, badgeId: badge.id } });
    }
  }
}

export async function getLeaderboard(city?: string, period?: 'month' | 'all') {
  const where: any = { isOnLeaderboard: true, accountStatus: 'ACTIVE' };
  if (city) where.city = { contains: city, mode: 'insensitive' };

  const profiles = await prisma.volunteerProfile.findMany({
    where,
    include: {
      user: { select: { name: true } },
      badges: { include: { badge: true } },
    },
    orderBy: { totalHours: 'desc' },
    take: 50,
  });

  return profiles.map((p, i) => ({
    rank: i + 1,
    name: p.user.name,
    hours: p.totalHours,
    badges: p.badges.length,
    city: p.city,
  }));
}

export async function submitHoursClaim(userId: string, data: { description: string; hours: number; date: string }) {
  const profile = await prisma.volunteerProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Profile not found');
  return prisma.hoursClaim.create({
    data: { volunteerId: profile.id, description: data.description, hours: data.hours, date: new Date(data.date) },
  });
}

export async function approveHoursClaim(claimId: string, reviewerId: string) {
  const claim = await prisma.hoursClaim.update({
    where: { id: claimId },
    data: { status: 'APPROVED', reviewedBy: reviewerId },
  });
  await prisma.volunteerProfile.update({
    where: { id: claim.volunteerId },
    data: { totalHours: { increment: claim.hours } },
  });
  await evaluateBadges(claim.volunteerId);
  return claim;
}
