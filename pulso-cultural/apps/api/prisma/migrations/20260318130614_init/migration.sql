-- AlterTable
ALTER TABLE "CameraCount" ADD COLUMN     "exhibitionId" TEXT;

-- CreateIndex
CREATE INDEX "CameraCount_exhibitionId_timestamp_idx" ON "CameraCount"("exhibitionId", "timestamp");

-- AddForeignKey
ALTER TABLE "CameraCount" ADD CONSTRAINT "CameraCount_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
