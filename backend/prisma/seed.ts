import { PrismaClient, Role, BadgeTrigger, Programme, SessionCadence, SessionDeliveryMode, DedicatedTeamRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@humanityorg.foundation' },
    update: {},
    create: {
      email: 'admin@humanityorg.foundation',
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      passwordHash: await bcrypt.hash('Admin@123', 10),
    },
  });

  await prisma.user.upsert({
    where: { email: 'priya@humanityorg.foundation' },
    update: {},
    create: {
      email: 'priya@humanityorg.foundation',
      name: 'Priya Sharma',
      role: Role.PROGRAM_MANAGER,
      passwordHash: await bcrypt.hash('Manager@123', 10),
    },
  });

  const defaultSkills = [
    'Teaching', 'Mentoring', 'Medical', 'Photography',
    'Event Management', 'Fundraising', 'Counselling',
    'Social Work', 'IT/Technology', 'Arts & Crafts',
  ];
  for (const name of defaultSkills) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }

  const badges = [
    { name: 'First Step', description: 'Completed first volunteering session', trigger: BadgeTrigger.FIRST_SESSION },
    { name: '10-Hour Hero', description: 'Logged 10 cumulative hours', trigger: BadgeTrigger.HOURS_10, threshold: 10 },
    { name: '50-Hour Champion', description: 'Logged 50 cumulative hours', trigger: BadgeTrigger.HOURS_50, threshold: 50 },
    { name: '100-Hour Legend', description: 'Logged 100 cumulative hours', trigger: BadgeTrigger.HOURS_100, threshold: 100 },
    { name: 'Consistent Contributor', description: 'Volunteered in 3 consecutive months', trigger: BadgeTrigger.CONSECUTIVE_3_MONTHS },
    { name: 'Skill Specialist', description: 'Completed 5 sessions under the same skill', trigger: BadgeTrigger.SKILL_SPECIALIST_5, threshold: 5 },
    { name: 'Event Organiser', description: 'Assisted in organising 2+ events', trigger: BadgeTrigger.EVENT_ORGANISER_2, threshold: 2 },
    { name: 'Health Warrior', description: 'Participated in 3 health-focused sessions', trigger: BadgeTrigger.HEALTH_WARRIOR_3, threshold: 3 },
  ];
  for (const b of badges) {
    await prisma.badge.upsert({ where: { name: b.name }, update: {}, create: b });
  }

  // ── Foundation scheduling demo data ──────────────────────────────────────
  // Demo volunteer + profile (so programme rosters aren't empty)
  const demoVolUser = await prisma.user.upsert({
    where: { email: 'kavitha@volunteer.humanityorg.foundation' },
    update: {},
    create: {
      email: 'kavitha@volunteer.humanityorg.foundation',
      name: 'Kavitha Rao',
      mobile: '9000000001',
      role: Role.VOLUNTEER,
      accountStatus: 'ACTIVE',
      passwordHash: await bcrypt.hash('Volunteer@123', 10),
    },
  });
  const demoProfile = await prisma.volunteerProfile.upsert({
    where: { userId: demoVolUser.id },
    update: {},
    create: { userId: demoVolUser.id, city: 'Hyderabad', accountStatus: 'ACTIVE' },
  });

  // Demo recurring series (find-or-create by title — RecurringSeries has no natural unique key)
  const demoSeries = [
    {
      title: 'SEL Weekend Sessions',
      programmeArea: Programme.P2_SEL,
      cadence: SessionCadence.ALTERNATE_SUNDAY,
      deliveryMode: SessionDeliveryMode.ON_GROUND,
      startDate: new Date('2026-06-07T00:00:00+05:30'),
      defaultStartTime: '10:00',
      durationMinutes: 90,
      requiredCount: 4,
    },
    {
      title: 'Education Dev — Grade 8-10 (MWF)',
      programmeArea: Programme.P1_EDUCATION,
      cadence: SessionCadence.WEEKLY_MWF,
      deliveryMode: SessionDeliveryMode.ONLINE,
      startDate: new Date('2026-06-01T00:00:00+05:30'),
      defaultStartTime: '17:00',
      durationMinutes: 60,
      requiredCount: 1,
    },
  ];
  for (const s of demoSeries) {
    const existing = await prisma.recurringSeries.findFirst({ where: { title: s.title, programmeArea: s.programmeArea } });
    if (!existing) {
      await prisma.recurringSeries.create({ data: { ...s, createdById: superAdmin.id } });
    }
  }

  // Demo programme assignments (idempotent on [volunteerId, programme])
  for (const programme of [Programme.P2_SEL, Programme.P4_HEALTH_NUTRITION]) {
    await prisma.programmeAssignment.upsert({
      where: { volunteerId_programme: { volunteerId: demoProfile.id, programme } },
      update: {},
      create: { volunteerId: demoProfile.id, programme, teamRole: DedicatedTeamRole.DEDICATED, assignedById: superAdmin.id },
    });
  }

  console.log('Seed complete. Admin: admin@humanityorg.foundation / Admin@123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
