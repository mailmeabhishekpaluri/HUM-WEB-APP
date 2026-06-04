import { PrismaClient, Role, BadgeTrigger, Programme, SessionCadence, SessionDeliveryMode, DedicatedTeamRole, Grade, ClassSubject, CCIType, FundingType, Gender, AdmissionSource, ChildCategory, CurriculumType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { materializeUpcomingClassSessions } from '../src/services/education.service';

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

  // ── Education Development Program (P1) demo data ────────────────────────
  // Demo CCI + children to enrol
  const demoCCI = await prisma.cCI.upsert({
    where: { registrationNumber: 'JJ-DEMO-0001' },
    update: {},
    create: {
      name: 'Asha Children\'s Home',
      type: CCIType.CHILDRENS_HOME,
      registrationNumber: 'JJ-DEMO-0001',
      district: 'Hyderabad',
      state: 'Telangana',
      fullAddress: '12 Banjara Hills, Hyderabad',
      sanctionedCapacityBoys: 30,
      sanctionedCapacityGirls: 30,
      currentOccupancy: 24,
      superintendentName: 'Mr. Rao',
      superintendentPhone: '9000000010',
      managingSociety: 'Asha Trust',
      fundingType: FundingType.NGO_FUNDED,
    },
  });

  const demoChildren = [
    { childId: 'STU-001', firstName: 'Aarav', educationalLevel: 'Grade 8' },
    { childId: 'STU-002', firstName: 'Diya', educationalLevel: 'Grade 8' },
    { childId: 'STU-003', firstName: 'Kabir', educationalLevel: 'Grade 9' },
    { childId: 'STU-004', firstName: 'Meera', educationalLevel: 'Grade 9' },
    { childId: 'STU-005', firstName: 'Rohan', educationalLevel: 'Grade 10' },
    { childId: 'STU-006', firstName: 'Sara', educationalLevel: 'Grade 10' },
  ];
  const childRecords = [];
  for (const c of demoChildren) {
    const child = await prisma.child.upsert({
      where: { childId: c.childId },
      update: {},
      create: {
        childId: c.childId,
        firstName: c.firstName,
        dateOfBirth: new Date('2012-01-01'),
        gender: Gender.OTHER,
        cciId: demoCCI.id,
        admissionDate: new Date('2024-06-01'),
        admissionSource: AdmissionSource.CWC,
        category: ChildCategory.ORPHAN,
        educationalLevel: c.educationalLevel,
      },
    });
    childRecords.push({ ...child, level: c.educationalLevel });
  }

  // Second demo teacher
  const teacher2 = await prisma.user.upsert({
    where: { email: 'arjun@volunteer.humanityorg.foundation' },
    update: {},
    create: {
      email: 'arjun@volunteer.humanityorg.foundation',
      name: 'Arjun Mehta',
      mobile: '9000000002',
      role: Role.VOLUNTEER,
      accountStatus: 'ACTIVE',
      passwordHash: await bcrypt.hash('Volunteer@123', 10),
    },
  });
  await prisma.volunteerProfile.upsert({
    where: { userId: teacher2.id },
    update: {},
    create: { userId: teacher2.id, city: 'Hyderabad', accountStatus: 'ACTIVE', preferredProgrammes: [Programme.P1_EDUCATION] },
  });

  // 9 sections: 3 grades × 3 subjects, AY 2026-27. MATHS=Mon(1), SCIENCE=Wed(3), ENGLISH=Fri(5)
  const subjectDay: Record<string, number> = { MATHS: 1, SCIENCE: 3, ENGLISH: 5 };
  const grades: Grade[] = [Grade.GRADE_8, Grade.GRADE_9, Grade.GRADE_10];
  const subjects: ClassSubject[] = [ClassSubject.MATHS, ClassSubject.SCIENCE, ClassSubject.ENGLISH];
  const gradeLevel: Record<string, string> = { GRADE_8: 'Grade 8', GRADE_9: 'Grade 9', GRADE_10: 'Grade 10' };
  const teacherPool = [demoVolUser.id, teacher2.id];
  let tIdx = 0;
  for (const grade of grades) {
    for (const subject of subjects) {
      const primaryVolunteerId = teacherPool[tIdx % teacherPool.length];
      tIdx++;
      const section = await prisma.classSection.upsert({
        where: { grade_subject_academicYear: { grade, subject, academicYear: '2026-27' } },
        update: {},
        create: {
          grade,
          subject,
          academicYear: '2026-27',
          dayOfWeek: subjectDay[subject],
          startTime: '17:00',
          durationMinutes: 60,
          meetLink: `https://meet.google.com/demo-${grade.toLowerCase().replace('_', '')}-${subject.toLowerCase()}`,
          cciId: demoCCI.id,
          primaryVolunteerId,
        },
      });
      // enrol the children whose level matches this grade
      const enrolees = childRecords.filter(c => c.level === gradeLevel[grade]);
      for (const child of enrolees) {
        await prisma.classEnrollment.upsert({
          where: { classSectionId_childId: { classSectionId: section.id, childId: child.id } },
          update: {},
          create: { classSectionId: section.id, childId: child.id },
        });
      }
    }
  }

  // Assign both teachers to the P1 roster
  for (const uid of teacherPool) {
    const profile = await prisma.volunteerProfile.findUnique({ where: { userId: uid } });
    if (profile) {
      await prisma.programmeAssignment.upsert({
        where: { volunteerId_programme: { volunteerId: profile.id, programme: Programme.P1_EDUCATION } },
        update: {},
        create: { volunteerId: profile.id, programme: Programme.P1_EDUCATION, teamRole: DedicatedTeamRole.DEDICATED, assignedById: superAdmin.id },
      });
    }
  }

  // Materialise the next 2 weeks of class sessions
  const created = await materializeUpcomingClassSessions(14);
  console.log(`Education: 9 sections seeded, ${created} upcoming sessions materialised.`);

  // ── SEL & Digital Literacy curriculum (P2 / P3) ─────────────────────────
  const selCurriculum = [
    { sequence: 1, title: 'Knowing Myself', objective: 'Build self-awareness: who I am, my likes, dislikes and identity.', activities: ['Name & identity circle', 'My-favourites collage', 'All-about-me sharing'], outcome: 'Children can describe themselves and feel a sense of belonging in the group.' },
    { sequence: 2, title: 'Understanding My Emotions', objective: 'Identify and name a range of emotions in self and others.', activities: ['Emotion flashcards', 'Feelings charades', 'Mood-meter check-in'], outcome: 'Children can label at least six emotions and recognise them in faces.' },
    { sequence: 3, title: 'Managing Big Feelings', objective: 'Learn simple self-regulation strategies for strong emotions.', activities: ['Belly breathing', 'Calm-down corner', 'Stop-think-act role play'], outcome: 'Children practise one calming strategy they can use when upset.' },
    { sequence: 4, title: 'My Strengths & Growth Mindset', objective: 'Recognise personal strengths and the power of "yet".', activities: ['Strengths tree', '“I can’t… yet” reframing', 'Effort vs outcome story'], outcome: 'Children name two personal strengths and one area to grow.' },
    { sequence: 5, title: 'Empathy & Seeing Other Views', objective: 'Develop social awareness and perspective-taking.', activities: ['Walk-in-their-shoes role play', 'Empathy story circle', 'Kindness wall'], outcome: 'Children can describe how another person might feel in a situation.' },
    { sequence: 6, title: 'Communicating Clearly', objective: 'Practise active listening and expressing needs respectfully.', activities: ['Listening pairs', 'I-statements practice', 'Telephone game debrief'], outcome: 'Children use an “I feel… because…” statement.' },
    { sequence: 7, title: 'Friendship & Healthy Relationships', objective: 'Explore what makes a good friend and healthy boundaries.', activities: ['Friendship recipe', 'Boundary scenarios', 'Compliment circle'], outcome: 'Children identify qualities of a good friend and one boundary.' },
    { sequence: 8, title: 'Teamwork & Cooperation', objective: 'Build collaboration and shared problem-solving skills.', activities: ['Group tower challenge', 'Silent line-up', 'Team reflection'], outcome: 'Children complete a task together and reflect on cooperation.' },
    { sequence: 9, title: 'Resolving Conflicts Peacefully', objective: 'Learn steps to handle disagreements constructively.', activities: ['Conflict role play', 'Peace-path steps', 'Win-win brainstorm'], outcome: 'Children practise a 3-step conflict-resolution approach.' },
    { sequence: 10, title: 'Making Responsible Decisions', objective: 'Practise thoughtful decision-making and consequences.', activities: ['Decision tree', 'Consequence cards', 'Real-life dilemmas'], outcome: 'Children weigh options and consequences before deciding.' },
    { sequence: 11, title: 'Setting Goals', objective: 'Set a simple, achievable personal goal.', activities: ['Goal ladder', 'My-dream board', 'First-step planning'], outcome: 'Each child writes one short-term goal and first step.' },
    { sequence: 12, title: 'Resilience & Moving Forward', objective: 'Celebrate growth and build resilience for setbacks.', activities: ['Bounce-back stories', 'Gratitude circle', 'Journey reflection & certificates'], outcome: 'Children reflect on their SEL journey and one resilience strategy.' },
  ];
  for (const item of selCurriculum) {
    await prisma.curriculumItem.upsert({
      where: { type_sequence: { type: CurriculumType.SEL, sequence: item.sequence } },
      update: {},
      create: { type: CurriculumType.SEL, durationMinutes: 75, ...item },
    });
  }

  const dlaiCurriculum = [
    { sequence: 1, title: 'Introduction to Computing & Internet', objective: 'Understand computers, devices and how the internet works safely.', activities: ['Parts of a computer', 'Safe browsing basics', 'Hands-on: open & navigate'], outcome: 'Children can use a device and browse the internet safely.' },
    { sequence: 2, title: 'Introduction to AI', objective: 'Grasp what AI is, everyday examples, and basic intuition.', activities: ['AI all-around-us spotting', 'Pattern-recognition game', 'AI vs not-AI sorting'], outcome: 'Children can explain in simple terms what AI is and give examples.' },
    { sequence: 3, title: 'AI for Education', objective: 'Use AI tools responsibly to support learning.', activities: ['Guided AI tutor demo', 'Ask-good-questions practice', 'Fact-check & verify'], outcome: 'Children use an AI learning tool and check its answers.' },
    { sequence: 4, title: 'AI for Skilling', objective: 'Explore AI for future skills and career awareness.', activities: ['AI tools showcase', 'Skill-builder activity', 'My-future-with-AI reflection'], outcome: 'Children identify one skill AI can help them build.' },
  ];
  for (const item of dlaiCurriculum) {
    await prisma.curriculumItem.upsert({
      where: { type_sequence: { type: CurriculumType.DIGITAL_LITERACY, sequence: item.sequence } },
      update: {},
      create: { type: CurriculumType.DIGITAL_LITERACY, durationMinutes: 75, ...item },
    });
  }

  // ── Upcoming alternating-Sunday Opportunities (SEL + DLAI) at the demo CCI ──
  // Point the alternate-Sunday series at the demo CCI so generation has a venue.
  await prisma.recurringSeries.updateMany({
    where: { cadence: SessionCadence.ALTERNATE_SUNDAY, cciId: null },
    data: { cciId: demoCCI.id },
  });

  function nextSundays(count: number): Date[] {
    const out: Date[] = [];
    // start from tomorrow to stay in the future, walk to Sundays (IST ~ server may be UTC; use UTC day)
    const d = new Date();
    d.setUTCHours(4, 30, 0, 0); // 10:00 IST
    while (out.length < count) {
      d.setUTCDate(d.getUTCDate() + 1);
      if (d.getUTCDay() === 0) out.push(new Date(d));
    }
    return out;
  }
  const [sun1, sun2] = nextSundays(2);
  const sel1 = await prisma.curriculumItem.findUnique({ where: { type_sequence: { type: CurriculumType.SEL, sequence: 1 } } });
  const dlai1 = await prisma.curriculumItem.findUnique({ where: { type_sequence: { type: CurriculumType.DIGITAL_LITERACY, sequence: 1 } } });

  const upcoming = [
    { programmeArea: Programme.P2_SEL, dateTime: sun1, title: `SEL — Session 1: ${sel1?.title}`, curriculumItemId: sel1?.id, studentCount: 60, requiredCount: 10 },
    { programmeArea: Programme.P3_DIGITAL_LITERACY, dateTime: sun2, title: `Digital Literacy & AI — Module 1: ${dlai1?.title}`, curriculumItemId: dlai1?.id, studentCount: 30, requiredCount: 5 },
  ];
  for (const o of upcoming) {
    const existing = await prisma.opportunity.findFirst({ where: { programmeArea: o.programmeArea, dateTime: o.dateTime, cciId: demoCCI.id } });
    if (!existing) {
      await prisma.opportunity.create({
        data: {
          title: o.title,
          programmeArea: o.programmeArea,
          cciId: demoCCI.id,
          dateTime: o.dateTime,
          durationMinutes: 90,
          location: `${demoCCI.name}, ${demoCCI.district}`,
          requiredCount: o.requiredCount,
          studentCount: o.studentCount,
          deliveryMode: SessionDeliveryMode.ON_GROUND,
          status: 'OPEN',
          curriculumItemId: o.curriculumItemId,
          createdById: superAdmin.id,
        },
      });
    }
  }
  console.log('SEL/DLAI: 12 SEL + 4 DLAI curriculum items seeded; 2 upcoming Sunday sessions created.');

  console.log('Seed complete. Admin: admin@humanityorg.foundation / Admin@123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
