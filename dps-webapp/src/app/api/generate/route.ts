import { NextRequest, NextResponse } from 'next/server';
import { CommentaryStyle, SessionStatus, UploadStatus, ReportRunStatus, ReportStatus } from '@prisma/client';
import * as dbService from '@/lib/db-service';
import * as fileStorage from '@/lib/file-storage';
import { parseCSV } from '@/lib/csv-parser';
import { calculateBenchmarkScore } from '@/lib/benchmark-engine';
import { generateDepartmentAssessment, generateOverallScorecardAssessment } from '@/lib/ai-assessor';
import { generateDepartmentReport } from '@/lib/docx-generator';
import { generateOverallScorecardReport } from '@/lib/overall-scorecard-generator';
import { KPIDataForReport, OverallScoreAssessment } from '@/types';
import { createClient } from '@/lib/supabase/server';

/**
 * Normalize a CSV description for matching purposes.
 * Handles common variations between CSV files and seed data:
 * - Trailing $ signs (e.g., "Net Sales $" vs "Net Sales")
 * - ($) vs () in parenthetical dollar indicators
 * - Multiple spaces collapsed to single space
 * - Trailing/leading whitespace
 * - $ within column names (e.g., "Service Sales $ Per" vs "Service Sales  Per")
 */
function normalizeCsvDescription(desc: string): string {
  return desc
    .replace(/\(\$\)/g, '()')   // ($) → ()
    .replace(/\s*\$\s*/g, ' ')   // remove $ signs (with surrounding spaces collapsed)
    .replace(/\s+/g, ' ')        // collapse multiple spaces
    .trim();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let sessionId: string | null = null;

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const reportCodes = JSON.parse(formData.get('reportCodes') as string) as string[];
    const commentaryStyle = (formData.get('commentaryStyle') as CommentaryStyle) || CommentaryStyle.STANDARD;
    const useAI = formData.get('useAI') === 'true';

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    if (reportCodes.length === 0) {
      return NextResponse.json({ error: 'No report codes selected' }, { status: 400 });
    }

    // 1. Create UploadSession
    const session = await dbService.createUploadSession(user.id);
    sessionId = session.id;
    await dbService.updateSessionStatus(sessionId, SessionStatus.EXTRACTING);

    // Get all KPI definitions
    const kpiDefinitions = await dbService.getAllKpiDefinitions();
    // Build map with normalized keys to handle CSV variations (e.g., missing $, () vs ($), extra spaces)
    const kpiDefMap = new Map(kpiDefinitions.map(k => [normalizeCsvDescription(k.csvDescription), k]));

    // Get requested templates
    const templates = await dbService.getReportTemplatesByCode(reportCodes);

    // 2. Process each file: parse CSV, create DealerUpload, extract KPI values
    const dealerData: Array<{
      dealerUploadId: string;
      dealerCode: string;
      dealerName: string;
      periodStart: string;
      periodEnd: string;
      kpiValues: KPIDataForReport[];
      classLabel: string;
    }> = [];

    for (const file of files) {
      const csvContent = await file.text();
      const parsedData = parseCSV(csvContent);

      // Find or create dealer
      const dealer = await dbService.findOrCreateDealer(parsedData.dealerCode, parsedData.dealerName);

      // Create DealerUpload
      const dealerUpload = await dbService.createDealerUpload(
        sessionId,
        dealer.id,
        new Date(parsedData.periodStart),
        new Date(parsedData.periodEnd),
        csvContent
      );

      await dbService.updateDealerUploadStatus(dealerUpload.id, UploadStatus.EXTRACTING);

      try {
        // Calculate benchmark scores and prepare KPI values + benchmark data
        const kpiValues: KPIDataForReport[] = [];
        const kpiValuesForDb: Array<{
          kpiDefinitionId: string;
          currentValue: number;
          priorYearValue?: number;
          yoyChangeAbsolute?: number;
          yoyChangePercent?: number;
          percentOfBClass?: number;
          percentOfNational?: number;
          benchmarkScore?: any;
        }> = [];
        const benchmarkData: Array<{
          kpiDefinitionId: string;
          bClassAverage?: number;
          bClassYoyChange?: number;
          nationalAverage?: number;
          nationalYoyChange?: number;
        }> = [];

        for (const row of parsedData.rows) {
          const kpiDef = kpiDefMap.get(normalizeCsvDescription(row.description));
          if (!kpiDef) continue;

          const benchmarkScore = calculateBenchmarkScore(
            row.percentOfBClass,
            row.currentValue,
            kpiDef.rulesetType.id,
            kpiDef.benchmarkMin,
            kpiDef.benchmarkMax
          );

          const priorYearValue = row.currentValue - row.yoyChangeAbsolute;

          // For the report generation (merged KPI + benchmark data)
          // Use the raw CSV description (from the actual file) as csvDescription for display
          kpiValues.push({
            kpiCode: kpiDef.kpiCode,
            kpiName: kpiDef.kpiName,
            csvDescription: row.description.trim(),
            dataFormat: kpiDef.dataFormat,
            higherIsBetter: kpiDef.higherIsBetter,
            benchmarkMin: kpiDef.benchmarkMin,
            benchmarkMax: kpiDef.benchmarkMax,
            currentValue: row.currentValue,
            priorYearValue,
            yoyChangeAbsolute: row.yoyChangeAbsolute,
            yoyChangePercent: row.yoyChangePercent,
            bClassAverage: row.bClassAverage,
            bClassYoyChange: row.bClassYoyChange,
            percentOfBClass: row.percentOfBClass,
            nationalAverage: row.nationalAverage,
            nationalYoyChange: row.nationalYoyChange,
            percentOfNational: row.percentOfNational,
            benchmarkScore,
          });

          // For the DB (no benchmark columns)
          kpiValuesForDb.push({
            kpiDefinitionId: kpiDef.id,
            currentValue: row.currentValue,
            priorYearValue,
            yoyChangeAbsolute: row.yoyChangeAbsolute,
            yoyChangePercent: row.yoyChangePercent,
            percentOfBClass: row.percentOfBClass,
            percentOfNational: row.percentOfNational,
            benchmarkScore,
          });

          // Benchmark data (shared across dealers for same period)
          benchmarkData.push({
            kpiDefinitionId: kpiDef.id,
            bClassAverage: row.bClassAverage,
            bClassYoyChange: row.bClassYoyChange,
            nationalAverage: row.nationalAverage,
            nationalYoyChange: row.nationalYoyChange,
          });
        }

        // Save KPI values to database
        await dbService.saveKpiValues(dealerUpload.id, kpiValuesForDb);

        // Save benchmark snapshot (once per unique period per session)
        await dbService.saveBenchmarkSnapshot(
          sessionId,
          new Date(parsedData.periodStart),
          new Date(parsedData.periodEnd),
          benchmarkData
        );

        await dbService.updateDealerUploadStatus(dealerUpload.id, UploadStatus.EXTRACTED);

        // Store kpi values with department info for report generation
        const kpiValuesWithDept = kpiValues.map(kv => {
          const kpiDef = kpiDefinitions.find(k => k.kpiCode === kv.kpiCode);
          return { ...kv, departmentId: kpiDef?.departmentId };
        });

        dealerData.push({
          dealerUploadId: dealerUpload.id,
          dealerCode: dealer.dealerCode,
          dealerName: dealer.dealerName,
          periodStart: parsedData.periodStart,
          periodEnd: parsedData.periodEnd,
          kpiValues: kpiValuesWithDept as any,
          classLabel: parsedData.classLabel,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
        await dbService.updateDealerUploadStatus(dealerUpload.id, UploadStatus.FAILED, errorMessage);
      }
    }

    // Update session status to READY
    await dbService.updateSessionStatus(sessionId, SessionStatus.READY);

    // 3. Create ReportRun
    const reportRun = await dbService.createReportRun(sessionId, commentaryStyle, reportCodes);
    await dbService.updateReportRunStatus(reportRun.id, ReportRunStatus.GENERATING);

    // 4. Generate reports for each dealer x template
    const dealerResults: Array<{
      dealerCode: string;
      dealerName: string;
      periodStart: string;
      periodEnd: string;
      reports: Array<{
        reportId: string;
        reportCode: string;
        title: string;
        status: 'completed' | 'failed';
        error?: string;
      }>;
    }> = [];

    for (const dd of dealerData) {
      const reports: Array<{
        reportId: string;
        reportCode: string;
        title: string;
        status: 'completed' | 'failed';
        error?: string;
      }> = [];

      for (const template of templates) {
        const report = await dbService.createReport(reportRun.id, dd.dealerUploadId, template.id);

        try {
          await dbService.updateReportStatus(report.id, ReportStatus.GENERATING);

          let assessment: any;
          let docxBuffer: Buffer;

          if (template.reportCode === 'DPS-08') {
            // Overall Scorecard: use ALL KPIs, not filtered by department
            const allKpiValues = dd.kpiValues as KPIDataForReport[];

            assessment = await generateOverallScorecardAssessment(
              dd.dealerName,
              dd.periodStart,
              dd.periodEnd,
              allKpiValues,
              commentaryStyle,
              useAI,
              dd.classLabel
            );

            docxBuffer = await generateOverallScorecardReport(
              dd.dealerName,
              dd.dealerCode,
              template.title,
              dd.periodStart,
              dd.periodEnd,
              assessment as OverallScoreAssessment,
              dd.classLabel
            );
          } else {
            // Standard department report
            const deptKpiValues = (dd.kpiValues as any[]).filter(
              (kv: any) => kv.departmentId === template.departmentId
            );

            assessment = await generateDepartmentAssessment(
              dd.dealerName,
              template.department.name,
              dd.periodStart,
              dd.periodEnd,
              deptKpiValues,
              commentaryStyle,
              useAI,
              dd.classLabel
            );

            docxBuffer = await generateDepartmentReport(
              dd.dealerName,
              dd.dealerCode,
              template.title,
              dd.periodStart,
              dd.periodEnd,
              deptKpiValues,
              assessment,
              dd.classLabel
            );
          }

          // Save file
          const { filePath, fileSize } = await fileStorage.saveReportFile(
            dd.dealerCode,
            template.reportId,
            new Date(dd.periodEnd),
            docxBuffer
          );

          // Update report record
          await dbService.updateReportWithDocument(report.id, filePath, fileSize, assessment);

          reports.push({
            reportId: report.id,
            reportCode: template.reportCode,
            title: template.title,
            status: 'completed',
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await dbService.updateReportError(report.id, errorMessage);
          reports.push({
            reportId: report.id,
            reportCode: template.reportCode,
            title: template.title,
            status: 'failed',
            error: errorMessage,
          });
        }
      }

      dealerResults.push({
        dealerCode: dd.dealerCode,
        dealerName: dd.dealerName,
        periodStart: dd.periodStart,
        periodEnd: dd.periodEnd,
        reports,
      });
    }

    // Update run status
    const allCompleted = dealerResults.every(d => d.reports.every(r => r.status === 'completed'));
    await dbService.updateReportRunStatus(
      reportRun.id,
      allCompleted ? ReportRunStatus.COMPLETED : ReportRunStatus.FAILED
    );
    await dbService.updateSessionStatus(sessionId, SessionStatus.COMPLETED);

    return NextResponse.json({
      sessionId,
      dealers: dealerResults,
    });
  } catch (error) {
    console.error('Generation error:', error);
    if (sessionId) {
      await dbService.updateSessionStatus(sessionId, SessionStatus.FAILED).catch(() => {});
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate reports' },
      { status: 500 }
    );
  }
}
