-- AlterTable
ALTER TABLE "ResearchUserMatch" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ResearchDigest" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "topArticles" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchDigest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchDigest_familyId_idx" ON "ResearchDigest"("familyId");

-- CreateIndex
CREATE INDEX "ResearchDigest_childId_idx" ON "ResearchDigest"("childId");

-- CreateIndex
CREATE INDEX "ResearchDigest_createdAt_idx" ON "ResearchDigest"("createdAt");

-- CreateIndex
CREATE INDEX "ResearchUserMatch_isArchived_idx" ON "ResearchUserMatch"("isArchived");

-- AddForeignKey
ALTER TABLE "ResearchDigest" ADD CONSTRAINT "ResearchDigest_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchDigest" ADD CONSTRAINT "ResearchDigest_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
