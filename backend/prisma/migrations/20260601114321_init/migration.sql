-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "CCIType" AS ENUM ('CHILDRENS_HOME', 'OBSERVATION_HOME', 'SPECIAL_HOME', 'SHELTER_HOME');

-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('GOVT_FUNDED', 'NGO_FUNDED');

-- CreateEnum
CREATE TYPE "CCIStatus" AS ENUM ('ACTIVE', 'ON_WATCH', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ComplianceType" AS ENUM ('JJ_ACT_RENEWAL', 'STATE_INSPECTION', 'CWC_CASE_REVIEW', 'FIRE_SAFETY', 'HEALTH_AUDIT', 'STAFF_POLICE_VERIFICATION', 'FINANCIAL_AUDIT', 'CWC_VISIT');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'DUE_SOON', 'OVERDUE');

-- CreateEnum
CREATE TYPE "DocCategory" AS ENUM ('REGISTRATION', 'INSPECTION', 'HEALTH_SAFETY', 'FINANCIAL', 'STAFF_VERIFICATION', 'CHILD_REGISTER', 'PHOTOS', 'CORRESPONDENCE');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('ROUTINE', 'COMPLIANCE_CHECK', 'PROGRAMME_DELIVERY', 'EMERGENCY', 'FIRST_VISIT');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AdmissionSource" AS ENUM ('POLICE', 'CWC', 'SELF', 'NGO_REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ChildCategory" AS ENUM ('ORPHAN', 'SEMI_ORPHAN', 'ABANDONED', 'RESCUED_TRAFFICKING', 'RESCUED_ABUSE', 'DESTITUTE', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('MORNING', 'SCHOOL', 'EVENING_PROGRAMME', 'SPECIAL_EVENT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'SICK', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "CaseEventType" AS ENUM ('CWC_ORDER', 'FAMILY_TRACING', 'TRANSFER', 'RESTORATION', 'ADOPTION_FOSTER', 'INCIDENT_REPORT', 'COUNSELLING_REFERRAL', 'CHILD_STATEMENT', 'EXIT');

-- CreateEnum
CREATE TYPE "ProfessionalDomain" AS ENUM ('EDUCATION', 'HEALTHCARE', 'TECHNOLOGY', 'FINANCE', 'ARTS', 'OTHER');

-- CreateEnum
CREATE TYPE "Programme" AS ENUM ('P1_EDUCATION', 'P2_SEL', 'P3_DIGITAL_LITERACY', 'P4_HEALTH_NUTRITION', 'P5_LIBRARY');

-- CreateEnum
CREATE TYPE "PoliceStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED_PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "SafeguardingStatus" AS ENUM ('NOT_ATTEMPTED', 'PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'ON_HOLD', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "ProgrammeArea" AS ENUM ('EDUCATION', 'HEALTH', 'NUTRITION', 'LIFE_SKILLS', 'SPORTS', 'OTHER');

-- CreateEnum
CREATE TYPE "SafeguardingLevel" AS ENUM ('NONE_REQUIRED', 'SAFEGUARDING_QUIZ_ONLY', 'POLICE_VERIFICATION_REQUIRED');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'OPEN', 'FULL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'INVITED', 'CONFIRMED', 'DECLINED', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BadgeTrigger" AS ENUM ('FIRST_SESSION', 'HOURS_10', 'HOURS_50', 'HOURS_100', 'CONSECUTIVE_3_MONTHS', 'SKILL_SPECIALIST_5', 'EVENT_ORGANISER_2', 'HEALTH_WARRIOR_3');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CCI', 'CHILD', 'VOLUNTEER', 'OPPORTUNITY', 'DOCUMENT', 'REPORT', 'USER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'VIEWED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('COMPLIANCE_DUE', 'COMPLIANCE_EXPIRED', 'VOLUNTEER_REGISTERED', 'VOLUNTEER_APPROVED', 'VOLUNTEER_REJECTED', 'OPPORTUNITY_ASSIGNED', 'OPPORTUNITY_REMINDER', 'ATTENDANCE_CONFIRMED', 'BADGE_EARNED', 'CHILD_ABSENT', 'CRITICAL_INCIDENT', 'VISIT_LOG_ADDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCCI" (
    "userId" TEXT NOT NULL,
    "cciId" TEXT NOT NULL,

    CONSTRAINT "UserCCI_pkey" PRIMARY KEY ("userId","cciId")
);

-- CreateTable
CREATE TABLE "CCI" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CCIType" NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sanctionedCapacityBoys" INTEGER NOT NULL,
    "sanctionedCapacityGirls" INTEGER NOT NULL,
    "currentOccupancy" INTEGER NOT NULL,
    "superintendentName" TEXT NOT NULL,
    "superintendentPhone" TEXT NOT NULL,
    "superintendentEmail" TEXT,
    "managingSociety" TEXT NOT NULL,
    "dateOfEstablishment" TIMESTAMP(3),
    "fundingType" "FundingType" NOT NULL,
    "status" "CCIStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CCI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceItem" (
    "id" TEXT NOT NULL,
    "cciId" TEXT NOT NULL,
    "type" "ComplianceType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" "ComplianceStatus" NOT NULL DEFAULT 'COMPLIANT',
    "outcome" TEXT,
    "notes" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "cciId" TEXT,
    "category" "DocCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitLog" (
    "id" TEXT NOT NULL,
    "cciId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "visitType" "VisitType" NOT NULL,
    "childrenEngaged" INTEGER,
    "observations" TEXT,
    "activitiesConducted" TEXT[],
    "status" "VisitStatus" NOT NULL DEFAULT 'ACTIVE',
    "withdrawnReason" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "superintendentAck" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitPhoto" (
    "id" TEXT NOT NULL,
    "visitLogId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "visitLogId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitVolunteer" (
    "visitLogId" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,

    CONSTRAINT "VisitVolunteer_pkey" PRIMARY KEY ("visitLogId","volunteerId")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "cciId" TEXT NOT NULL,
    "visitLogId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "assigneeId" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "cciId" TEXT NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "admissionSource" "AdmissionSource" NOT NULL,
    "category" "ChildCategory" NOT NULL,
    "motherTongue" TEXT,
    "religion" TEXT,
    "cwcCaseNumber" TEXT,
    "guardianName" TEXT,
    "guardianContact" TEXT,
    "emergencyContact" TEXT,
    "educationalLevel" TEXT,
    "schoolName" TEXT,
    "aadhaarEncrypted" TEXT,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sessionType" "SessionType" NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthGrowth" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "measuredBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthGrowth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "recommendedDate" TIMESTAMP(3) NOT NULL,
    "givenDate" TIMESTAMP(3),
    "facility" TEXT,
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Illness" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "symptoms" TEXT NOT NULL,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "hospitalReferred" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Illness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressNote" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "programmeArea" "Programme",
    "academicEngagement" INTEGER,
    "literacyNumeracy" INTEGER,
    "socioEmotional" INTEGER,
    "lifeSkills" INTEGER,
    "vocationalEngagement" INTEGER,
    "narrative" TEXT,
    "photoUrl" TEXT,
    "flagForFollowup" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "eventType" "CaseEventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "severity" "IssueSeverity",
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAmendment" (
    "id" TEXT NOT NULL,
    "caseEventId" TEXT NOT NULL,
    "amendment" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisation" TEXT,
    "professionalDomain" "ProfessionalDomain",
    "languages" TEXT[],
    "availabilityDays" INTEGER[],
    "hoursPerWeek" INTEGER,
    "preferredProgrammes" "Programme"[],
    "preferredCCIId" TEXT,
    "motivationStatement" TEXT,
    "emergencyContact" TEXT,
    "policeVerification" "PoliceStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "safeguardingStatus" "SafeguardingStatus" NOT NULL DEFAULT 'NOT_ATTEMPTED',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "joinedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idProofUrl" TEXT,
    "photoUrl" TEXT,
    "policeVerificationUrl" TEXT,
    "corporatePartner" TEXT,
    "isOnLeaderboard" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "VolunteerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerSkill" (
    "volunteerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "VolunteerSkill_pkey" PRIMARY KEY ("volunteerId","skillId")
);

-- CreateTable
CREATE TABLE "VolunteerAvailability" (
    "id" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isUnavailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "programmeArea" "ProgrammeArea" NOT NULL,
    "cciId" TEXT,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "requiredCount" INTEGER NOT NULL,
    "description" TEXT,
    "safeguardingLevel" "SafeguardingLevel" NOT NULL DEFAULT 'NONE_REQUIRED',
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunitySkill" (
    "opportunityId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "OpportunitySkill_pkey" PRIMARY KEY ("opportunityId","skillId")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "hoursLogged" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoursClaim" (
    "id" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HoursClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "trigger" "BadgeTrigger" NOT NULL,
    "threshold" INTEGER,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerBadge" (
    "volunteerId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerBadge_pkey" PRIMARY KEY ("volunteerId","badgeId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userRole" "Role" NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "device" TEXT,
    "cciId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "CCI_registrationNumber_key" ON "CCI"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Child_childId_key" ON "Child"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerProfile_userId_key" ON "VolunteerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCCI" ADD CONSTRAINT "UserCCI_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCCI" ADD CONSTRAINT "UserCCI_cciId_fkey" FOREIGN KEY ("cciId") REFERENCES "CCI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_cciId_fkey" FOREIGN KEY ("cciId") REFERENCES "CCI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_cciId_fkey" FOREIGN KEY ("cciId") REFERENCES "CCI"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitLog" ADD CONSTRAINT "VisitLog_cciId_fkey" FOREIGN KEY ("cciId") REFERENCES "CCI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitLog" ADD CONSTRAINT "VisitLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_visitLogId_fkey" FOREIGN KEY ("visitLogId") REFERENCES "VisitLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_visitLogId_fkey" FOREIGN KEY ("visitLogId") REFERENCES "VisitLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitVolunteer" ADD CONSTRAINT "VisitVolunteer_visitLogId_fkey" FOREIGN KEY ("visitLogId") REFERENCES "VisitLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_cciId_fkey" FOREIGN KEY ("cciId") REFERENCES "CCI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_visitLogId_fkey" FOREIGN KEY ("visitLogId") REFERENCES "VisitLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_cciId_fkey" FOREIGN KEY ("cciId") REFERENCES "CCI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthGrowth" ADD CONSTRAINT "HealthGrowth_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Illness" ADD CONSTRAINT "Illness_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressNote" ADD CONSTRAINT "ProgressNote_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAmendment" ADD CONSTRAINT "CaseAmendment_caseEventId_fkey" FOREIGN KEY ("caseEventId") REFERENCES "CaseEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerProfile" ADD CONSTRAINT "VolunteerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerSkill" ADD CONSTRAINT "VolunteerSkill_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "VolunteerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerSkill" ADD CONSTRAINT "VolunteerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerAvailability" ADD CONSTRAINT "VolunteerAvailability_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "VolunteerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySkill" ADD CONSTRAINT "OpportunitySkill_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySkill" ADD CONSTRAINT "OpportunitySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "VolunteerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoursClaim" ADD CONSTRAINT "HoursClaim_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "VolunteerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerBadge" ADD CONSTRAINT "VolunteerBadge_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "VolunteerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerBadge" ADD CONSTRAINT "VolunteerBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_cciId_fkey" FOREIGN KEY ("cciId") REFERENCES "CCI"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
