-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'WELLBEING_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'RESEARCH_READY';
ALTER TYPE "NotificationType" ADD VALUE 'EMERGENCY_PATTERN';

-- CreateTable
CREATE TABLE "ParentWellbeing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "mood" INTEGER NOT NULL,
    "stressLevel" INTEGER NOT NULL,
    "notes" TEXT,
    "aiMessage" TEXT,
    "burnoutRisk" TEXT NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentWellbeing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyEvent" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "trigger" TEXT,
    "durationMin" INTEGER,
    "interventions" JSONB,
    "outcome" TEXT,
    "notes" TEXT,
    "aiPattern" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensoryProfile" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "visual" INTEGER NOT NULL,
    "auditory" INTEGER NOT NULL,
    "tactile" INTEGER NOT NULL,
    "vestibular" INTEGER NOT NULL,
    "proprioception" INTEGER NOT NULL,
    "olfactory" INTEGER NOT NULL,
    "notes" TEXT,
    "aiRecommendations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensoryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchArticle" (
    "id" TEXT NOT NULL,
    "pubmedId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "abstract" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "journal" TEXT NOT NULL,
    "koreanSummary" TEXT,
    "keyFindings" JSONB,
    "tags" TEXT[],
    "relevanceBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchUserMatch" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "childId" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchUserMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "childId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityComment" (
    "id" TEXT NOT NULL,
    "activityLogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParentWellbeing_userId_idx" ON "ParentWellbeing"("userId");

-- CreateIndex
CREATE INDEX "ParentWellbeing_childId_idx" ON "ParentWellbeing"("childId");

-- CreateIndex
CREATE INDEX "ParentWellbeing_familyId_idx" ON "ParentWellbeing"("familyId");

-- CreateIndex
CREATE INDEX "ParentWellbeing_createdAt_idx" ON "ParentWellbeing"("createdAt");

-- CreateIndex
CREATE INDEX "EmergencyEvent_childId_idx" ON "EmergencyEvent"("childId");

-- CreateIndex
CREATE INDEX "EmergencyEvent_familyId_idx" ON "EmergencyEvent"("familyId");

-- CreateIndex
CREATE INDEX "EmergencyEvent_occurredAt_idx" ON "EmergencyEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "SensoryProfile_childId_idx" ON "SensoryProfile"("childId");

-- CreateIndex
CREATE INDEX "SensoryProfile_familyId_idx" ON "SensoryProfile"("familyId");

-- CreateIndex
CREATE INDEX "SensoryProfile_createdAt_idx" ON "SensoryProfile"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchArticle_pubmedId_key" ON "ResearchArticle"("pubmedId");

-- CreateIndex
CREATE INDEX "ResearchArticle_publishedAt_idx" ON "ResearchArticle"("publishedAt");

-- CreateIndex
CREATE INDEX "ResearchArticle_fetchedAt_idx" ON "ResearchArticle"("fetchedAt");

-- CreateIndex
CREATE INDEX "ResearchUserMatch_familyId_idx" ON "ResearchUserMatch"("familyId");

-- CreateIndex
CREATE INDEX "ResearchUserMatch_childId_idx" ON "ResearchUserMatch"("childId");

-- CreateIndex
CREATE INDEX "ResearchUserMatch_createdAt_idx" ON "ResearchUserMatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUserMatch_articleId_familyId_key" ON "ResearchUserMatch"("articleId", "familyId");

-- CreateIndex
CREATE INDEX "RoleAssignment_familyId_idx" ON "RoleAssignment"("familyId");

-- CreateIndex
CREATE INDEX "RoleAssignment_date_idx" ON "RoleAssignment"("date");

-- CreateIndex
CREATE INDEX "RoleAssignment_assignedTo_idx" ON "RoleAssignment"("assignedTo");

-- CreateIndex
CREATE INDEX "ActivityComment_activityLogId_idx" ON "ActivityComment"("activityLogId");

-- CreateIndex
CREATE INDEX "ActivityComment_userId_idx" ON "ActivityComment"("userId");

-- AddForeignKey
ALTER TABLE "ParentWellbeing" ADD CONSTRAINT "ParentWellbeing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentWellbeing" ADD CONSTRAINT "ParentWellbeing_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentWellbeing" ADD CONSTRAINT "ParentWellbeing_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyEvent" ADD CONSTRAINT "EmergencyEvent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyEvent" ADD CONSTRAINT "EmergencyEvent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensoryProfile" ADD CONSTRAINT "SensoryProfile_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchUserMatch" ADD CONSTRAINT "ResearchUserMatch_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ResearchArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchUserMatch" ADD CONSTRAINT "ResearchUserMatch_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchUserMatch" ADD CONSTRAINT "ResearchUserMatch_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityComment" ADD CONSTRAINT "ActivityComment_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "ActivityLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityComment" ADD CONSTRAINT "ActivityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
