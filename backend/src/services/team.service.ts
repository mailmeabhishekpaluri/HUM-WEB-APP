import { prisma } from '../lib/prisma';
import { Programme, DedicatedTeamRole } from '@prisma/client';

/** Assign a volunteer to a programme's dedicated/support roster (idempotent per [volunteer,programme]). */
export async function assignToProgramme(
  volunteerId: string,
  programme: Programme,
  teamRole: DedicatedTeamRole,
  assignedById: string,
) {
  return prisma.programmeAssignment.upsert({
    where: { volunteerId_programme: { volunteerId, programme } },
    update: { teamRole, isActive: true, assignedById },
    create: { volunteerId, programme, teamRole, assignedById },
  });
}

/** Soft-remove a volunteer from a programme roster. */
export async function removeAssignment(volunteerId: string, programme: Programme) {
  return prisma.programmeAssignment.updateMany({
    where: { volunteerId, programme },
    data: { isActive: false },
  });
}

/** List the active roster for a programme, with volunteer + user details. */
export async function listProgrammeTeam(programme: Programme) {
  return prisma.programmeAssignment.findMany({
    where: { programme, isActive: true },
    include: {
      volunteer: {
        include: {
          user: { select: { id: true, name: true, email: true, mobile: true } },
          skills: { include: { skill: true } },
        },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });
}

/**
 * 1:6 volunteer-to-student ratio helper (reused by SEL/DLAI).
 * required = ceil(students / 6); met = current volunteers >= required.
 */
export function ratioStatus(studentCount: number, volunteerCount: number): { required: number; met: boolean } {
  const required = Math.ceil((studentCount || 0) / 6);
  return { required, met: volunteerCount >= required };
}
