-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('CLAUDE_BEDROCK', 'CLAUDE_DIRECT', 'GEMINI', 'OPENAI');

-- CreateTable
CREATE TABLE "AiConfig" (
    "id" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "encApiKey" TEXT,
    "encRegion" TEXT,
    "encAccessKeyId" TEXT,
    "encSecretKey" TEXT,
    "encIv" TEXT,
    "encAuthTag" TEXT,
    "encSalt" TEXT,
    "modelId" TEXT,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "dailyBudgetLimit" INTEGER NOT NULL DEFAULT 100,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestSuccess" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiConfig_provider_key" ON "AiConfig"("provider");
