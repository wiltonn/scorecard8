-- CreateEnum
CREATE TYPE "DataFormat" AS ENUM ('PERCENTAGE', 'CURRENCY', 'RATIO', 'NUMBER', 'SCORE');

-- CreateEnum
CREATE TYPE "ReportBatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CommentaryStyle" AS ENUM ('EXECUTIVE', 'STANDARD', 'DETAILED', 'COACHING', 'DIRECT');

-- CreateEnum
CREATE TYPE "BenchmarkScore" AS ENUM ('EXCEPTIONAL', 'EXCELLENT', 'GREAT', 'GOOD', 'ACCEPTABLE', 'WEAK', 'SUBSTANDARD', 'POOR', 'NA');

-- CreateEnum
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "dealerCode" TEXT NOT NULL,
    "dealerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportBatch" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "rawCsvData" TEXT NOT NULL,
    "status" "ReportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "commentaryStyle" "CommentaryStyle" NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ReportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiValue" (
    "id" TEXT NOT NULL,
    "reportBatchId" TEXT NOT NULL,
    "kpiDefinitionId" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "priorYearValue" DOUBLE PRECISION,
    "yoyChangeAbsolute" DOUBLE PRECISION,
    "yoyChangePercent" DOUBLE PRECISION,
    "bClassAverage" DOUBLE PRECISION,
    "bClassYoyChange" DOUBLE PRECISION,
    "percentOfBClass" DOUBLE PRECISION,
    "nationalAverage" DOUBLE PRECISION,
    "nationalYoyChange" DOUBLE PRECISION,
    "percentOfNational" DOUBLE PRECISION,
    "benchmarkScore" "BenchmarkScore",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reportBatchId" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "KpiDefinition_kpiCode_key" ON "KpiDefinition"("kpiCode");

-- CreateIndex
CREATE INDEX "KpiDefinition_departmentId_idx" ON "KpiDefinition"("departmentId");

-- CreateIndex
CREATE INDEX "KpiDefinition_rulesetTypeId_idx" ON "KpiDefinition"("rulesetTypeId");

-- CreateIndex
CREATE INDEX "RulesetThresholdConfig_rulesetTypeId_idx" ON "RulesetThresholdConfig"("rulesetTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_dealerCode_key" ON "Dealer"("dealerCode");

-- CreateIndex
CREATE INDEX "ReportBatch_dealerId_idx" ON "ReportBatch"("dealerId");

-- CreateIndex
CREATE INDEX "ReportBatch_status_idx" ON "ReportBatch"("status");

-- CreateIndex
CREATE INDEX "ReportBatch_createdAt_idx" ON "ReportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "KpiValue_reportBatchId_idx" ON "KpiValue"("reportBatchId");

-- CreateIndex
CREATE INDEX "KpiValue_kpiDefinitionId_idx" ON "KpiValue"("kpiDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiValue_reportBatchId_kpiDefinitionId_key" ON "KpiValue"("reportBatchId", "kpiDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTemplate_reportCode_key" ON "ReportTemplate"("reportCode");

-- CreateIndex
CREATE INDEX "Report_reportBatchId_idx" ON "Report"("reportBatchId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reportBatchId_templateId_key" ON "Report"("reportBatchId", "templateId");

-- AddForeignKey
ALTER TABLE "KpiDefinition" ADD CONSTRAINT "KpiDefinition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDefinition" ADD CONSTRAINT "KpiDefinition_rulesetTypeId_fkey" FOREIGN KEY ("rulesetTypeId") REFERENCES "RulesetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RulesetThresholdConfig" ADD CONSTRAINT "RulesetThresholdConfig_rulesetTypeId_fkey" FOREIGN KEY ("rulesetTypeId") REFERENCES "RulesetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBatch" ADD CONSTRAINT "ReportBatch_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiValue" ADD CONSTRAINT "KpiValue_reportBatchId_fkey" FOREIGN KEY ("reportBatchId") REFERENCES "ReportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiValue" ADD CONSTRAINT "KpiValue_kpiDefinitionId_fkey" FOREIGN KEY ("kpiDefinitionId") REFERENCES "KpiDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportBatchId_fkey" FOREIGN KEY ("reportBatchId") REFERENCES "ReportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
