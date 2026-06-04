-- CreateEnum
CREATE TYPE "HealthEventType" AS ENUM ('QUARTERLY_CHECKUP', 'MONTHLY_AWARENESS');

-- CreateEnum
CREATE TYPE "ReadingLevel" AS ENUM ('BEGINNER', 'LETTER', 'WORD', 'PARAGRAPH', 'STORY');

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "calendarEventId" TEXT,
ADD COLUMN     "healthEventType" "HealthEventType",
ADD COLUMN     "meetLink" TEXT;

-- CreateTable
CREATE TABLE "ReadingAssessment" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "level" "ReadingLevel" NOT NULL,
    "bookTitle" TEXT,
    "prathamGroup" TEXT,
    "assessedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- AddForeignKey
ALTER TABLE "ReadingAssessment" ADD CONSTRAINT "ReadingAssessment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
