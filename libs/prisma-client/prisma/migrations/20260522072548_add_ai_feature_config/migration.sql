-- CreateTable
CREATE TABLE "AiFeatureConfig" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiFeatureConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiFeatureConfig_feature_key" ON "AiFeatureConfig"("feature");
