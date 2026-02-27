-- Generated from Prisma schema - Run in Supabase SQL Editor

-- CreateEnum
CREATE TYPE "DataFormat" AS ENUM ('PERCENTAGE', 'CURRENCY', 'RATIO', 'NUMBER', 'SCORE');
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'EXTRACTING', 'READY', 'COMPLETED', 'FAILED');
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'EXTRACTING', 'EXTRACTED', 'FAILED');
CREATE TYPE "ReportRunStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');
CREATE TYPE "CommentaryStyle" AS ENUM ('EXECUTIVE', 'STANDARD', 'DETAILED', 'COACHING', 'DIRECT');
CREATE TYPE "BenchmarkScore" AS ENUM ('EXCEPTIONAL', 'EXCELLENT', 'GREAT', 'GOOD', 'ACCEPTABLE', 'WEAK', 'SUBSTANDARD', 'POOR', 'NA');
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RulesetType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logic" TEXT NOT NULL,
    "isScored" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RulesetType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiDefinition" (
    "id" TEXT NOT NULL,
    "kpiCode" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "csvDescription" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "rulesetTypeId" TEXT NOT NULL,
    "dataFormat" "DataFormat" NOT NULL DEFAULT 'PERCENTAGE',
    "higherIsBetter" BOOLEAN NOT NULL DEFAULT true,
    "benchmarkMin" DOUBLE PRECISION,
    "benchmarkMax" DOUBLE PRECISION,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KpiDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RulesetThresholdConfig" (
    "id" TEXT NOT NULL,
    "rulesetTypeId" TEXT NOT NULL,
    "thresholds" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RulesetThresholdConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "dealerCode" TEXT NOT NULL,
    "dealerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE "KpiValue" (
    "id" TEXT NOT NULL,
    "dealerUploadId" TEXT NOT NULL,
    "kpiDefinitionId" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "priorYearValue" DOUBLE PRECISION,
    "yoyChangeAbsolute" DOUBLE PRECISION,
    "yoyChangePercent" DOUBLE PRECISION,
    "percentOfBClass" DOUBLE PRECISION,
    "percentOfNational" DOUBLE PRECISION,
    "benchmarkScore" "BenchmarkScore",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "reportCode" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "kpiCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reportRunId" TEXT NOT NULL,
    "dealerUploadId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "aiAssessment" JSONB,
    "documentPath" TEXT,
    "documentSize" INTEGER,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "generatedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE UNIQUE INDEX "KpiDefinition_kpiCode_key" ON "KpiDefinition"("kpiCode");
CREATE INDEX "KpiDefinition_departmentId_idx" ON "KpiDefinition"("departmentId");
CREATE INDEX "KpiDefinition_rulesetTypeId_idx" ON "KpiDefinition"("rulesetTypeId");
CREATE INDEX "RulesetThresholdConfig_rulesetTypeId_idx" ON "RulesetThresholdConfig"("rulesetTypeId");
CREATE UNIQUE INDEX "Dealer_dealerCode_key" ON "Dealer"("dealerCode");
CREATE INDEX "UploadSession_status_idx" ON "UploadSession"("status");
CREATE INDEX "UploadSession_createdAt_idx" ON "UploadSession"("createdAt");
CREATE INDEX "DealerUpload_uploadSessionId_idx" ON "DealerUpload"("uploadSessionId");
CREATE INDEX "DealerUpload_dealerId_idx" ON "DealerUpload"("dealerId");
CREATE UNIQUE INDEX "DealerUpload_uploadSessionId_dealerId_key" ON "DealerUpload"("uploadSessionId", "dealerId");
CREATE INDEX "BenchmarkSnapshot_uploadSessionId_idx" ON "BenchmarkSnapshot"("uploadSessionId");
CREATE UNIQUE INDEX "BenchmarkSnapshot_uploadSessionId_periodStart_periodEnd_key" ON "BenchmarkSnapshot"("uploadSessionId", "periodStart", "periodEnd");
CREATE INDEX "BenchmarkValue_benchmarkSnapshotId_idx" ON "BenchmarkValue"("benchmarkSnapshotId");
CREATE INDEX "BenchmarkValue_kpiDefinitionId_idx" ON "BenchmarkValue"("kpiDefinitionId");
CREATE UNIQUE INDEX "BenchmarkValue_benchmarkSnapshotId_kpiDefinitionId_key" ON "BenchmarkValue"("benchmarkSnapshotId", "kpiDefinitionId");
CREATE INDEX "ReportRun_uploadSessionId_idx" ON "ReportRun"("uploadSessionId");
CREATE INDEX "KpiValue_dealerUploadId_idx" ON "KpiValue"("dealerUploadId");
CREATE INDEX "KpiValue_kpiDefinitionId_idx" ON "KpiValue"("kpiDefinitionId");
CREATE UNIQUE INDEX "KpiValue_dealerUploadId_kpiDefinitionId_key" ON "KpiValue"("dealerUploadId", "kpiDefinitionId");
CREATE UNIQUE INDEX "ReportTemplate_reportCode_key" ON "ReportTemplate"("reportCode");
CREATE INDEX "Report_reportRunId_idx" ON "Report"("reportRunId");
CREATE INDEX "Report_dealerUploadId_idx" ON "Report"("dealerUploadId");
CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE UNIQUE INDEX "Report_reportRunId_dealerUploadId_templateId_key" ON "Report"("reportRunId", "dealerUploadId", "templateId");

-- AddForeignKeys
ALTER TABLE "KpiDefinition" ADD CONSTRAINT "KpiDefinition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiDefinition" ADD CONSTRAINT "KpiDefinition_rulesetTypeId_fkey" FOREIGN KEY ("rulesetTypeId") REFERENCES "RulesetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RulesetThresholdConfig" ADD CONSTRAINT "RulesetThresholdConfig_rulesetTypeId_fkey" FOREIGN KEY ("rulesetTypeId") REFERENCES "RulesetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealerUpload" ADD CONSTRAINT "DealerUpload_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealerUpload" ADD CONSTRAINT "DealerUpload_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BenchmarkSnapshot" ADD CONSTRAINT "BenchmarkSnapshot_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BenchmarkValue" ADD CONSTRAINT "BenchmarkValue_benchmarkSnapshotId_fkey" FOREIGN KEY ("benchmarkSnapshotId") REFERENCES "BenchmarkSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BenchmarkValue" ADD CONSTRAINT "BenchmarkValue_kpiDefinitionId_fkey" FOREIGN KEY ("kpiDefinitionId") REFERENCES "KpiDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiValue" ADD CONSTRAINT "KpiValue_dealerUploadId_fkey" FOREIGN KEY ("dealerUploadId") REFERENCES "DealerUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiValue" ADD CONSTRAINT "KpiValue_kpiDefinitionId_fkey" FOREIGN KEY ("kpiDefinitionId") REFERENCES "KpiDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportRunId_fkey" FOREIGN KEY ("reportRunId") REFERENCES "ReportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_dealerUploadId_fkey" FOREIGN KEY ("dealerUploadId") REFERENCES "DealerUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
