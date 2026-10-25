-- CreateTable
CREATE TABLE "DailyRecordEntry" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawText" TEXT,
    "draft" JSONB,
    "questions" JSONB,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "answeredCount" INTEGER NOT NULL DEFAULT 0,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "feedbackId" TEXT,
    "savedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRecordEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyRecordEntry_childId_date_idx" ON "DailyRecordEntry"("childId", "date");

-- CreateIndex
CREATE INDEX "DailyRecordEntry_status_createdAt_idx" ON "DailyRecordEntry"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "DailyRecordEntry" ADD CONSTRAINT "DailyRecordEntry_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
