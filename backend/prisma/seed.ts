import { PrismaClient, Role, BadgeTrigger } from '@prisma/client';
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

  console.log('Seed complete. Admin: admin@humanityorg.foundation / Admin@123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
