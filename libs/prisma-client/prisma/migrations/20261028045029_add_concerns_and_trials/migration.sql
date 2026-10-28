-- AlterTable
ALTER TABLE "SessionFeedback" ADD COLUMN     "antecedent" TEXT,
ADD COLUMN     "concernId" TEXT,
ADD COLUMN     "isTeacherOpinion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentResponse" TEXT,
ADD COLUMN     "settled" TEXT;

-- CreateTable
CREATE TABLE "Concern" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "matchTags" TEXT[],
    "keywords" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "perspectives" JSONB,
    "perspectivesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyTrial" (
    "id" TEXT NOT NULL,
    "concernId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "how" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rating" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyTrial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Concern_childId_status_idx" ON "Concern"("childId", "status");

-- CreateIndex
CREATE INDEX "StrategyTrial_childId_status_idx" ON "StrategyTrial"("childId", "status");

-- AddForeignKey
ALTER TABLE "Concern" ADD CONSTRAINT "Concern_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyTrial" ADD CONSTRAINT "StrategyTrial_concernId_fkey" FOREIGN KEY ("concernId") REFERENCES "Concern"("id") ON DELETE CASCADE ON UPDATE CASCADE;
