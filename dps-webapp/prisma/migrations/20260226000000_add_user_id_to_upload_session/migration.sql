-- AlterTable
ALTER TABLE "UploadSession" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "UploadSession_userId_idx" ON "UploadSession"("userId");
