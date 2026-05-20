-- CreateEnum
CREATE TYPE "CurriculumStatus" AS ENUM ('PENDING', 'GENERATED', 'CONFIRMED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BatchJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "CurriculumStatus" NOT NULL DEFAULT 'PENDING',
    "aiProvider" TEXT,
    "promptVersion" TEXT,
    "rawAiOutput" JSONB,
    "weeklyGoal" TEXT,
    "activities" JSONB NOT NULL,
    "notes" TEXT,
    "generatedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "activityIndex" INTEGER NOT NULL,
    "activityTitle" TEXT NOT NULL,
    "result" "ActivityResult" NOT NULL,
    "durationMin" INTEGER,
    "notes" TEXT,
    "mediaUrls" JSONB,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "BatchJobStatus" NOT NULL DEFAULT 'PENDING',
    "targetDate" TIMESTAMP(3),
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Curriculum_childId_idx" ON "Curriculum"("childId");

-- CreateIndex
CREATE INDEX "Curriculum_familyId_idx" ON "Curriculum"("familyId");

-- CreateIndex
CREATE INDEX "Curriculum_date_idx" ON "Curriculum"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculum_childId_date_key" ON "Curriculum"("childId", "date");

-- CreateIndex
CREATE INDEX "ActivityLog_curriculumId_idx" ON "ActivityLog"("curriculumId");

-- CreateIndex
CREATE INDEX "ActivityLog_childId_idx" ON "ActivityLog"("childId");

-- CreateIndex
CREATE INDEX "BatchJob_type_idx" ON "BatchJob"("type");

-- CreateIndex
CREATE INDEX "BatchJob_status_idx" ON "BatchJob"("status");

-- CreateIndex
CREATE INDEX "BatchJob_targetDate_idx" ON "BatchJob"("targetDate");

-- AddForeignKey
ALTER TABLE "Curriculum" ADD CONSTRAINT "Curriculum_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curriculum" ADD CONSTRAINT "Curriculum_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
