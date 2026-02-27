-- Multi-dealer, multi-period session support migration
-- Replaces ReportBatch with UploadSession + DealerUpload + BenchmarkSnapshot + ReportRun

-- 1. Create new enums
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'EXTRACTING', 'READY', 'COMPLETED', 'FAILED');
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'EXTRACTING', 'EXTRACTED', 'FAILED');
CREATE TYPE "ReportRunStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- 2. Create new tables

CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealerUpload" (
    "id" TEXT NOT NULL,
    "uploadSessionId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "rawCsvData" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "DealerUpload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BenchmarkSnapshot" (
    "id" TEXT NOT NULL,
    "uploadSessionId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BenchmarkSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BenchmarkValue" (
    "id" TEXT NOT NULL,
    "benchmarkSnapshotId" TEXT NOT NULL,
    "kpiDefinitionId" TEXT NOT NULL,
    "bClassAverage" DOUBLE PRECISION,
    "bClassYoyChange" DOUBLE PRECISION,
    "nationalAverage" DOUBLE PRECISION,
    "nationalYoyChange" DOUBLE PRECISION,
    CONSTRAINT "BenchmarkValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportRun" (
    "id" TEXT NOT NULL,
    "uploadSessionId" TEXT NOT NULL,
    "commentaryStyle" "CommentaryStyle" NOT NULL DEFAULT 'STANDARD',
    "templateCodes" TEXT[],
    "status" "ReportRunStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportRun_pkey" PRIMARY KEY ("id")
);

-- 3. Add new columns to KpiValue (dealerUploadId) and Report (reportRunId, dealerUploadId)
ALTER TABLE "KpiValue" ADD COLUMN "dealerUploadId" TEXT;
ALTER TABLE "Report" ADD COLUMN "reportRunId" TEXT;
ALTER TABLE "Report" ADD COLUMN "dealerUploadId" TEXT;

-- 4. Migrate existing data

-- For each ReportBatch, create an UploadSession
INSERT INTO "UploadSession" ("id", "name", "status", "createdAt", "updatedAt")
SELECT
    'session_' || rb."id",
    'Migrated: ' || d."dealerName",
    CASE rb."status"
        WHEN 'COMPLETED' THEN 'COMPLETED'::"SessionStatus"
        WHEN 'FAILED' THEN 'FAILED'::"SessionStatus"
        ELSE 'READY'::"SessionStatus"
    END,
    rb."createdAt",
    rb."updatedAt"
FROM "ReportBatch" rb
JOIN "Dealer" d ON d."id" = rb."dealerId";

-- For each ReportBatch, create a DealerUpload
INSERT INTO "DealerUpload" ("id", "uploadSessionId", "dealerId", "periodStart", "periodEnd", "rawCsvData", "status", "createdAt", "updatedAt", "processedAt")
SELECT
    'upload_' || rb."id",
    'session_' || rb."id",
    rb."dealerId",
    rb."periodStart",
    rb."periodEnd",
    rb."rawCsvData",
    CASE rb."status"
        WHEN 'COMPLETED' THEN 'EXTRACTED'::"UploadStatus"
        WHEN 'FAILED' THEN 'FAILED'::"UploadStatus"
        ELSE 'PENDING'::"UploadStatus"
    END,
    rb."createdAt",
    rb."updatedAt",
    rb."processedAt"
FROM "ReportBatch" rb;

-- For each ReportBatch, create a BenchmarkSnapshot (one per unique period per session)
INSERT INTO "BenchmarkSnapshot" ("id", "uploadSessionId", "periodStart", "periodEnd", "createdAt")
SELECT
    'snap_' || rb."id",
    'session_' || rb."id",
    rb."periodStart",
    rb."periodEnd",
    rb."createdAt"
FROM "ReportBatch" rb;

-- Extract benchmark data from KpiValue into BenchmarkValue
INSERT INTO "BenchmarkValue" ("id", "benchmarkSnapshotId", "kpiDefinitionId", "bClassAverage", "bClassYoyChange", "nationalAverage", "nationalYoyChange")
SELECT
    'bv_' || kv."id",
    'snap_' || kv."reportBatchId",
    kv."kpiDefinitionId",
    kv."bClassAverage",
    kv."bClassYoyChange",
    kv."nationalAverage",
    kv."nationalYoyChange"
FROM "KpiValue" kv;

-- For each ReportBatch, create a ReportRun
INSERT INTO "ReportRun" ("id", "uploadSessionId", "commentaryStyle", "templateCodes", "status", "createdAt", "updatedAt")
SELECT
    'run_' || rb."id",
    'session_' || rb."id",
    rb."commentaryStyle",
    ARRAY(
        SELECT DISTINCT rt."reportCode"
        FROM "Report" r
        JOIN "ReportTemplate" rt ON rt."id" = r."templateId"
        WHERE r."reportBatchId" = rb."id"
    ),
    CASE rb."status"
        WHEN 'COMPLETED' THEN 'COMPLETED'::"ReportRunStatus"
        WHEN 'FAILED' THEN 'FAILED'::"ReportRunStatus"
        ELSE 'PENDING'::"ReportRunStatus"
    END,
    rb."createdAt",
    rb."updatedAt"
FROM "ReportBatch" rb;

-- 5. Update FK references in KpiValue
UPDATE "KpiValue" SET "dealerUploadId" = 'upload_' || "reportBatchId";

-- 6. Update FK references in Report
UPDATE "Report" SET
    "reportRunId" = 'run_' || "reportBatchId",
    "dealerUploadId" = 'upload_' || "reportBatchId";

-- 7. Make new columns NOT NULL now that data is migrated
ALTER TABLE "KpiValue" ALTER COLUMN "dealerUploadId" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "reportRunId" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "dealerUploadId" SET NOT NULL;

-- 8. Drop old columns and constraints from KpiValue
-- First drop the old unique constraint and indexes
DROP INDEX IF EXISTS "KpiValue_reportBatchId_idx";
ALTER TABLE "KpiValue" DROP CONSTRAINT IF EXISTS "KpiValue_reportBatchId_kpiDefinitionId_key";
ALTER TABLE "KpiValue" DROP CONSTRAINT IF EXISTS "KpiValue_reportBatchId_fkey";

-- Drop benchmark columns from KpiValue (now in BenchmarkValue)
ALTER TABLE "KpiValue" DROP COLUMN "bClassAverage";
ALTER TABLE "KpiValue" DROP COLUMN "bClassYoyChange";
ALTER TABLE "KpiValue" DROP COLUMN "nationalAverage";
ALTER TABLE "KpiValue" DROP COLUMN "nationalYoyChange";
ALTER TABLE "KpiValue" DROP COLUMN "reportBatchId";

-- 9. Drop old columns from Report
DROP INDEX IF EXISTS "Report_reportBatchId_idx";
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_reportBatchId_templateId_key";
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_reportBatchId_fkey";
ALTER TABLE "Report" DROP COLUMN "reportBatchId";

-- 10. Add new constraints and indexes

-- KpiValue
CREATE UNIQUE INDEX "KpiValue_dealerUploadId_kpiDefinitionId_key" ON "KpiValue"("dealerUploadId", "kpiDefinitionId");
CREATE INDEX "KpiValue_dealerUploadId_idx" ON "KpiValue"("dealerUploadId");

-- Report
CREATE UNIQUE INDEX "Report_reportRunId_dealerUploadId_templateId_key" ON "Report"("reportRunId", "dealerUploadId", "templateId");
CREATE INDEX "Report_reportRunId_idx" ON "Report"("reportRunId");
CREATE INDEX "Report_dealerUploadId_idx" ON "Report"("dealerUploadId");

-- DealerUpload
CREATE UNIQUE INDEX "DealerUpload_uploadSessionId_dealerId_key" ON "DealerUpload"("uploadSessionId", "dealerId");
CREATE INDEX "DealerUpload_uploadSessionId_idx" ON "DealerUpload"("uploadSessionId");
CREATE INDEX "DealerUpload_dealerId_idx" ON "DealerUpload"("dealerId");

-- BenchmarkSnapshot
CREATE UNIQUE INDEX "BenchmarkSnapshot_uploadSessionId_periodStart_periodEnd_key" ON "BenchmarkSnapshot"("uploadSessionId", "periodStart", "periodEnd");
CREATE INDEX "BenchmarkSnapshot_uploadSessionId_idx" ON "BenchmarkSnapshot"("uploadSessionId");

-- BenchmarkValue
CREATE UNIQUE INDEX "BenchmarkValue_benchmarkSnapshotId_kpiDefinitionId_key" ON "BenchmarkValue"("benchmarkSnapshotId", "kpiDefinitionId");
CREATE INDEX "BenchmarkValue_benchmarkSnapshotId_idx" ON "BenchmarkValue"("benchmarkSnapshotId");
CREATE INDEX "BenchmarkValue_kpiDefinitionId_idx" ON "BenchmarkValue"("kpiDefinitionId");

-- UploadSession
CREATE INDEX "UploadSession_status_idx" ON "UploadSession"("status");
CREATE INDEX "UploadSession_createdAt_idx" ON "UploadSession"("createdAt");

-- ReportRun
CREATE INDEX "ReportRun_uploadSessionId_idx" ON "ReportRun"("uploadSessionId");

-- 11. Add foreign key constraints
ALTER TABLE "DealerUpload" ADD CONSTRAINT "DealerUpload_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealerUpload" ADD CONSTRAINT "DealerUpload_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BenchmarkSnapshot" ADD CONSTRAINT "BenchmarkSnapshot_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BenchmarkValue" ADD CONSTRAINT "BenchmarkValue_benchmarkSnapshotId_fkey" FOREIGN KEY ("benchmarkSnapshotId") REFERENCES "BenchmarkSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BenchmarkValue" ADD CONSTRAINT "BenchmarkValue_kpiDefinitionId_fkey" FOREIGN KEY ("kpiDefinitionId") REFERENCES "KpiDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KpiValue" ADD CONSTRAINT "KpiValue_dealerUploadId_fkey" FOREIGN KEY ("dealerUploadId") REFERENCES "DealerUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report" ADD CONSTRAINT "Report_reportRunId_fkey" FOREIGN KEY ("reportRunId") REFERENCES "ReportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_dealerUploadId_fkey" FOREIGN KEY ("dealerUploadId") REFERENCES "DealerUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 12. Drop old ReportBatch table and enum
DROP TABLE "ReportBatch";
DROP TYPE "ReportBatchStatus";

-- 13. Remove old Dealer -> ReportBatch relation (already handled by dropping ReportBatch)
