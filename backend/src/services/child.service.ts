import { prisma } from '../lib/prisma';
import { encrypt, decrypt, maskAadhaar } from '../lib/crypto';
import { ChildCategory, AdmissionSource, Gender, AttendanceStatus, SessionType, CaseEventType, IssueSeverity } from '@prisma/client';

async function generateChildId(): Promise<string> {
  const count = await prisma.child.count();
  return `HUM-${String(count + 1).padStart(4, '0')}`;
}

function stripSensitive(child: any, role: string) {
  const sensitive = ['aadhaarEncrypted', 'cwcCaseNumber', 'guardianName', 'guardianContact', 'category', 'admissionSource', 'religion'];
  if (role === 'SUPER_ADMIN' || role === 'PROGRAM_MANAGER') {
    if (child.aadhaarEncrypted) {
      try {
        const plain = decrypt(child.aadhaarEncrypted);
        child.aadhaarMasked = maskAadhaar(plain);
      } catch {}
    }
    delete child.aadhaarEncrypted;
    return child;
  }
  delete child.aadhaarEncrypted;
  delete child.photoUrl;
  if (role !== 'CCI_MANAGER' && role !== 'CCI_STAFF') {
    sensitive.forEach(k => delete child[k]);
  } else {
    delete child.cwcCaseNumber;
    delete child.guardianContact;
  }
  return child;
}

export async function createChild(data: any) {
  const childId = await generateChildId();
  const aadhaarEncrypted = data.aadhaar ? encrypt(data.aadhaar) : undefined;
  return prisma.child.create({
    data: {
      childId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender as Gender,
      cciId: data.cciId,
      admissionDate: new Date(data.admissionDate),
      admissionSource: data.admissionSource as AdmissionSource,
      category: data.category as ChildCategory,
      motherTongue: data.motherTongue,
      religion: data.religion,
      cwcCaseNumber: data.cwcCaseNumber,
      guardianName: data.guardianName,
      guardianContact: data.guardianContact,
      emergencyContact: data.emergencyContact,
      educationalLevel: data.educationalLevel,
      schoolName: data.schoolName,
      aadhaarEncrypted,
    },
  });
}

export async function listChildren(userId: string, role: string, cciId?: string) {
  let where: any = { isActive: true };
  if (cciId) where.cciId = cciId;

  if (role === 'CCI_STAFF' || role === 'CCI_MANAGER') {
    const links = await prisma.userCCI.findMany({ where: { userId } });
    const allowedCCIIds = links.map(l => l.cciId);
    where.cciId = cciId ? (allowedCCIIds.includes(cciId) ? cciId : null) : { in: allowedCCIIds };
  }
  if (role === 'VOLUNTEER') return [];

  const children = await prisma.child.findMany({
    where,
    include: { cci: { select: { name: true, id: true } } },
    orderBy: [{ cciId: 'asc' }, { firstName: 'asc' }],
  });

  return children.map(c => stripSensitive({ ...c }, role));
}

export async function getChild(id: string, role: string) {
  const child = await prisma.child.findUnique({
    where: { id },
    include: {
      cci: { select: { name: true, id: true } },
      healthGrowth: { orderBy: { date: 'desc' }, take: 10 },
      vaccinations: { orderBy: { recommendedDate: 'asc' } },
      illnesses: { orderBy: { date: 'desc' }, take: 10 },
      progressNotes: { orderBy: { createdAt: 'desc' }, take: 5 },
      caseEvents: {
        orderBy: { date: 'desc' },
        include: { amendments: true },
      },
    },
  });
  if (!child) throw new Error('Child not found');

  const sanitized = { ...child };
  if (role !== 'SUPER_ADMIN' && role !== 'PROGRAM_MANAGER') {
    sanitized.caseEvents = (sanitized.caseEvents as any[]).map(e =>
      e.isSensitive ? { ...e, description: '[Sensitive — access restricted]', amendments: [] } : e
    );
  }

  return stripSensitive(sanitized, role);
}

export async function updateChild(id: string, data: any) {
  const updateData: any = {};
  const fields = ['firstName', 'lastName', 'educationalLevel', 'schoolName', 'motherTongue', 'currentOccupancy', 'emergencyContact', 'guardianName', 'guardianContact', 'religion'];
  fields.forEach(f => { if (data[f] !== undefined) updateData[f] = data[f]; });
  if (data.aadhaar) updateData.aadhaarEncrypted = encrypt(data.aadhaar);
  return prisma.child.update({ where: { id }, data: updateData });
}

export async function markAttendanceBulk(records: { childId: string; date: string; sessionType: string; status: string; note?: string }[], markedById: string) {
  return prisma.attendanceRecord.createMany({
    data: records.map(r => ({
      childId: r.childId,
      date: new Date(r.date),
      sessionType: r.sessionType as SessionType,
      status: r.status as AttendanceStatus,
      note: r.note,
      markedById,
    })),
    skipDuplicates: true,
  });
}

export async function getAttendance(childId: string, months = 3) {
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  return prisma.attendanceRecord.findMany({
    where: { childId, date: { gte: from } },
    orderBy: { date: 'desc' },
  });
}

export async function checkConsecutiveAbsences(cciId: string): Promise<string[]> {
  const recent = await prisma.attendanceRecord.findMany({
    where: { child: { cciId }, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    orderBy: { date: 'desc' },
  });
  const byChild: Record<string, string[]> = {};
  for (const r of recent) {
    if (!byChild[r.childId]) byChild[r.childId] = [];
    byChild[r.childId].push(r.status);
  }
  return Object.entries(byChild)
    .filter(([, statuses]) => statuses.slice(0, 3).every(s => s === 'ABSENT'))
    .map(([id]) => id);
}

export async function addGrowthRecord(childId: string, data: any, measuredBy: string) {
  const heightCm = data.heightCm ? parseFloat(data.heightCm) : undefined;
  const weightKg = data.weightKg ? parseFloat(data.weightKg) : undefined;
  const bmi = heightCm && weightKg ? parseFloat((weightKg / ((heightCm / 100) ** 2)).toFixed(1)) : undefined;
  return prisma.healthGrowth.create({
    data: { childId, date: new Date(data.date), heightCm, weightKg, bmi, measuredBy, notes: data.notes },
  });
}

export async function addVaccination(childId: string, data: any) {
  return prisma.vaccination.create({
    data: {
      childId,
      vaccineName: data.vaccineName,
      recommendedDate: new Date(data.recommendedDate),
      givenDate: data.givenDate ? new Date(data.givenDate) : undefined,
      facility: data.facility,
    },
  });
}

export async function addIllness(childId: string, data: any) {
  return prisma.illness.create({
    data: {
      childId,
      date: new Date(data.date),
      symptoms: data.symptoms,
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      hospitalReferred: data.hospitalReferred || false,
      outcome: data.outcome,
    },
  });
}

export async function addProgressNote(childId: string, data: any, authorId: string) {
  return prisma.progressNote.create({
    data: {
      childId,
      authorId,
      sessionType: data.sessionType,
      programmeArea: data.programmeArea,
      academicEngagement: data.academicEngagement ? parseInt(data.academicEngagement) : undefined,
      literacyNumeracy: data.literacyNumeracy ? parseInt(data.literacyNumeracy) : undefined,
      socioEmotional: data.socioEmotional ? parseInt(data.socioEmotional) : undefined,
      lifeSkills: data.lifeSkills ? parseInt(data.lifeSkills) : undefined,
      vocationalEngagement: data.vocationalEngagement ? parseInt(data.vocationalEngagement) : undefined,
      narrative: data.narrative,
      flagForFollowup: data.flagForFollowup || false,
    },
  });
}

export async function lockExpiredNotes() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.progressNote.updateMany({
    where: { isLocked: false, createdAt: { lt: thirtyDaysAgo } },
    data: { isLocked: true },
  });
}

export async function addCaseEvent(childId: string, data: any, authorId: string) {
  return prisma.caseEvent.create({
    data: {
      childId,
      eventType: data.eventType as CaseEventType,
      date: new Date(data.date || new Date()),
      description: data.description,
      isSensitive: data.isSensitive || false,
      severity: data.severity as IssueSeverity | undefined,
      authorId,
    },
  });
}

export async function amendCaseEvent(caseEventId: string, amendment: string, authorId: string) {
  return prisma.caseAmendment.create({ data: { caseEventId, amendment, authorId } });
}

export async function generateBeneficiaryReport(cciId?: string, dateFrom?: string, dateTo?: string) {
  const where: any = { isActive: true };
  if (cciId) where.cciId = cciId;
  if (dateFrom || dateTo) {
    where.admissionDate = {};
    if (dateFrom) where.admissionDate.gte = new Date(dateFrom);
    if (dateTo) where.admissionDate.lte = new Date(dateTo);
  }

  const children = await prisma.child.findMany({
    where,
    include: { cci: { select: { name: true, district: true } } },
  });

  const byCCI: Record<string, any> = {};
  for (const c of children) {
    const key = c.cciId;
    if (!byCCI[key]) byCCI[key] = { cciName: c.cci.name, district: c.cci.district, total: 0, male: 0, female: 0, other: 0 };
    byCCI[key].total++;
    if (c.gender === 'MALE') byCCI[key].male++;
    else if (c.gender === 'FEMALE') byCCI[key].female++;
    else byCCI[key].other++;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalChildren: children.length,
    byGender: {
      male: children.filter(c => c.gender === 'MALE').length,
      female: children.filter(c => c.gender === 'FEMALE').length,
      other: children.filter(c => c.gender === 'OTHER').length,
    },
    byCCI: Object.values(byCCI),
  };
}
