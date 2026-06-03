-- CreateEnum
CREATE TYPE "SessionCadence" AS ENUM ('WEEKLY_MWF', 'ALTERNATE_SUNDAY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SessionDeliveryMode" AS ENUM ('ONLINE', 'ON_GROUND');

-- CreateEnum
CREATE TYPE "DedicatedTeamRole" AS ENUM ('DEDICATED', 'SUPPORT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CLASS_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'SESSION_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'LESSON_PLAN_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSTITUTION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSTITUTION_FILLED';
ALTER TYPE "NotificationType" ADD VALUE 'SESSION_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'READING_ASSESSMENT_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'HEALTH_CHECKUP_DUE';

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "curriculumItemId" TEXT,
ADD COLUMN     "deliveryMode" "SessionDeliveryMode" NOT NULL DEFAULT 'ON_GROUND',
ADD COLUMN     "recurringSeriesId" TEXT,
ADD COLUMN     "studentCount" INTEGER;

-- CreateTable
CREATE TABLE "RecurringSeries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "programmeArea" "Programme" NOT NULL,
    "cadence" "SessionCadence" NOT NULL,
    "deliveryMode" "SessionDeliveryMode" NOT NULL DEFAULT 'ON_GROUND',
    "cciId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "defaultStartTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "requiredCount" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeAssignment" (
    "id" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "programme" "Programme" NOT NULL,
    "teamRole" "DedicatedTeamRole" NOT NULL DEFAULT 'DEDICATED',
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProgrammeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionFeedback" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "childrenPresent" INTEGER,
    "childrenEngaged" INTEGER,
    "childParticipationRating" INTEGER,
    "volunteerParticipationRating" INTEGER,
    "volunteersPresent" INTEGER,
    "whatWentWell" TEXT,
    "challenges" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "followUpNotes" TEXT,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeAssignment_volunteerId_programme_key" ON "ProgrammeAssignment"("volunteerId", "programme");

-- CreateIndex
CREATE UNIQUE INDEX "SessionFeedback_opportunityId_key" ON "SessionFeedback"("opportunityId");

-- AddForeignKey
ALTER TABLE "ProgrammeAssignment" ADD CONSTRAINT "ProgrammeAssignment_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "VolunteerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
