-- CreateTable
CREATE TABLE "SessionFeedback" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "sessionType" TEXT NOT NULL,
    "therapistName" TEXT,
    "institution" TEXT,
    "durationMin" INTEGER,
    "scheduleId" TEXT,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "progress" TEXT,
    "challenges" TEXT,
    "homeWork" TEXT,
    "parentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackDigest" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "bySessionType" JSONB NOT NULL,
    "highlights" TEXT[],
    "concerns" TEXT[],
    "homeWorkSummary" TEXT,
    "feedbackCount" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackDigest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionFeedback_childId_sessionDate_idx" ON "SessionFeedback"("childId", "sessionDate");

-- CreateIndex
CREATE INDEX "SessionFeedback_familyId_sessionDate_idx" ON "SessionFeedback"("familyId", "sessionDate");

-- CreateIndex
CREATE INDEX "SessionFeedback_childId_sessionType_idx" ON "SessionFeedback"("childId", "sessionType");

-- CreateIndex
CREATE INDEX "FeedbackDigest_familyId_weekKey_idx" ON "FeedbackDigest"("familyId", "weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackDigest_childId_weekKey_key" ON "FeedbackDigest"("childId", "weekKey");

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackDigest" ADD CONSTRAINT "FeedbackDigest_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackDigest" ADD CONSTRAINT "FeedbackDigest_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
