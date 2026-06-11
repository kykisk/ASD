-- AlterTable
ALTER TABLE "FeedbackDigest" ADD COLUMN     "behaviorSuggestions" TEXT[];

-- AlterTable
ALTER TABLE "SessionFeedback" ADD COLUMN     "aiDomainScores" JSONB,
ADD COLUMN     "aiExtracted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "behaviorTags" TEXT[],
ADD COLUMN     "feedbackType" TEXT NOT NULL DEFAULT 'SESSION',
ADD COLUMN     "severity" INTEGER;
