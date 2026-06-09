-- CreateEnum
CREATE TYPE "ClinicalReportSource" AS ENUM ('MANUAL', 'IMAGE_IMPORT');

-- CreateTable
CREATE TABLE "ClinicalReport" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "assessmentTool" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3),
    "evaluatorType" TEXT,
    "institution" TEXT,
    "sectionScores" JSONB NOT NULL,
    "totalScore" DOUBLE PRECISION,
    "totalScoreUnit" TEXT,
    "clinicalFindings" TEXT,
    "source" "ClinicalReportSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalReport_childId_idx" ON "ClinicalReport"("childId");

-- CreateIndex
CREATE INDEX "ClinicalReport_assessmentDate_idx" ON "ClinicalReport"("assessmentDate");

-- CreateIndex
CREATE INDEX "ClinicalReport_createdAt_idx" ON "ClinicalReport"("createdAt");

-- AddForeignKey
ALTER TABLE "ClinicalReport" ADD CONSTRAINT "ClinicalReport_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
