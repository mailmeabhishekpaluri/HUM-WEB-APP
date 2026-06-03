/*
  Warnings:

  - Changed the type of `programmeArea` on the `Opportunity` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Opportunity" DROP COLUMN "programmeArea",
ADD COLUMN     "programmeArea" "Programme" NOT NULL;

-- DropEnum
DROP TYPE "ProgrammeArea";
