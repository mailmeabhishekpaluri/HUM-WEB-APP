-- CreateEnum
CREATE TYPE "CurriculumType" AS ENUM ('SEL', 'DIGITAL_LITERACY');

-- CreateTable
CREATE TABLE "CurriculumItem" (
    "id" TEXT NOT NULL,
    "type" "CurriculumType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "activities" TEXT[],
    "outcome" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 75,

    CONSTRAINT "CurriculumItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumItem_type_sequence_key" ON "CurriculumItem"("type", "sequence");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_curriculumItemId_fkey" FOREIGN KEY ("curriculumItemId") REFERENCES "CurriculumItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
