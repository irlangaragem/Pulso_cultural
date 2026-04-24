-- CreateEnum
CREATE TYPE "QREventType" AS ENUM ('GENERATED', 'DOWNLOADED', 'PRINTED', 'REVOKED', 'EXPIRED', 'REACTIVATED');

-- CreateTable
CREATE TABLE "QRCode" (
    "id" TEXT NOT NULL,
    "museumId" TEXT NOT NULL,
    "exhibitionId" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRCodeEvent" (
    "id" TEXT NOT NULL,
    "qrcodeId" TEXT NOT NULL,
    "type" "QREventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QRCodeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QRCode_museumId_isActive_idx" ON "QRCode"("museumId", "isActive");

-- CreateIndex
CREATE INDEX "QRCode_exhibitionId_isActive_idx" ON "QRCode"("exhibitionId", "isActive");

-- CreateIndex
CREATE INDEX "QRCodeEvent_qrcodeId_createdAt_idx" ON "QRCodeEvent"("qrcodeId", "createdAt");

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_museumId_fkey" FOREIGN KEY ("museumId") REFERENCES "Museum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QRCodeEvent" ADD CONSTRAINT "QRCodeEvent_qrcodeId_fkey" FOREIGN KEY ("qrcodeId") REFERENCES "QRCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
