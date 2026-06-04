-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('GRADE_8', 'GRADE_9', 'GRADE_10');

-- CreateEnum
CREATE TYPE "ClassSubject" AS ENUM ('MATHS', 'SCIENCE', 'ENGLISH');

-- CreateEnum
CREATE TYPE "ClassSessionStatus" AS ENUM ('SCHEDULED', 'SUBSTITUTION_REQUESTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubstitutionStatus" AS ENUM ('OPEN', 'FILLED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ClassSection" (
    "id" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "subject" "ClassSubject" NOT NULL,
    "academicYear" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "meetLink" TEXT,
    "cciId" TEXT,
    "primaryVolunteerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "classSectionId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("classSectionId","childId")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "classSectionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "ClassSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "assignedVolunteerId" TEXT,
    "meetLink" TEXT,
    "topic" TEXT,
    "lessonPlan" TEXT,
    "lessonPlanSubmittedAt" TIMESTAMP(3),
    "classFeedback" TEXT,
    "feedbackSubmittedAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassAttendance" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubstitutionRequest" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT,
    "status" "SubstitutionStatus" NOT NULL DEFAULT 'OPEN',
    "filledById" TEXT,
    "filledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubstitutionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassSection_grade_subject_academicYear_key" ON "ClassSection"("grade", "subject", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_classSectionId_date_key" ON "ClassSession"("classSectionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ClassAttendance_classSessionId_childId_key" ON "ClassAttendance"("classSessionId", "childId");

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstitutionRequest" ADD CONSTRAINT "SubstitutionRequest_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
