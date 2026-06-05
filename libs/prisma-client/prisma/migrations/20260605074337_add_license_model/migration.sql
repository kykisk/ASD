-- CreateEnum
CREATE TYPE "LicensedTool" AS ENUM ('M_CHAT_R_F', 'CARS_2', 'ABC', 'ADOS_2', 'SCQ');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "tool" "LicensedTool" NOT NULL,
    "keyHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "License_familyId_idx" ON "License"("familyId");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");

-- CreateIndex
CREATE INDEX "License_expiresAt_idx" ON "License"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "License_tool_familyId_key" ON "License"("tool", "familyId");

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
