/*
  Warnings:

  - Added the required column `name` to the `AiConfig` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "AiConfig_provider_key";

-- AlterTable
ALTER TABLE "AiConfig" ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AiConfig_provider_idx" ON "AiConfig"("provider");

-- CreateIndex
CREATE INDEX "AiConfig_isDefault_idx" ON "AiConfig"("isDefault");
