import { NextRequest, NextResponse } from 'next/server';
import { CommentaryStyle, SessionStatus, ReportRunStatus, ReportStatus } from '@prisma/client';
import * as dbService from '@/lib/db-service';
import * as fileStorage from '@/lib/file-storage';
import { generateDepartmentAssessment } from '@/lib/ai-assessor';
import { generateDepartmentReport } from '@/lib/docx-generator';
import { KPIDataForReport } from '@/types';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sessionId, reportCodes, commentaryStyle, useAI: useAIParam, classLabel: classLabelParam } = body as {
      sessionId: string;
      reportCodes: string[];
      commentaryStyle: CommentaryStyle;
      useAI?: boolean;
      classLabel?: string;
    };
    const useAI = useAIParam === true;
    const classLabel = classLabelParam || 'B-Class';

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }
    if (!reportCodes || reportCodes.length === 0) {
      return NextResponse.json({ error: 'reportCodes is required' }, { status: 400 });
    }

    // 1. Verify session exists and is ready
    const session = await dbService.getSessionWithData(sessionId, user.id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.status !== SessionStatus.READY && session.status !== SessionStatus.COMPLETED) {
      return NextResponse.json({ error: 'Session is not ready for regeneration' }, { status: 400 });
    }

    // 2. Get templates
    const templates = await dbService.getReportTemplatesByCode(reportCodes);
    if (templates.length === 0) {
      return NextResponse.json({ error: 'No valid templates found' }, { status: 400 });
    }

    // 3. Create new ReportRun
    const style = commentaryStyle || CommentaryStyle.STANDARD;
    const reportRun = await dbService.createReportRun(sessionId, style, reportCodes);
    await dbService.updateReportRunStatus(reportRun.id, ReportRunStatus.GENERATING);

    // 4. Build benchmark lookup from stored snapshots
    const benchmarkMap = new Map<string, { bClassAverage?: number | null; bClassYoyChange?: number | null; nationalAverage?: number | null; nationalYoyChange?: number | null }>();
    for (const snapshot of session.benchmarkSnapshots) {
      for (const bv of snapshot.benchmarkValues) {
        benchmarkMap.set(bv.kpiDefinitionId, {
          bClassAverage: bv.bClassAverage,
          bClassYoyChange: bv.bClassYoyChange,
          nationalAverage: bv.nationalAverage,
          nationalYoyChange: bv.nationalYoyChange,
        });
      }
    }

    // 5. Generate reports for each dealer x template
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

    for (const du of session.dealerUploads) {
      const reports: Array<{
        reportId: string;
        reportCode: string;
        title: string;
        status: 'completed' | 'failed';
        error?: string;
      }> = [];

      // Merge KPI values with benchmark data for report generation
      const mergedKpiValues: (KPIDataForReport & { departmentId?: string })[] = du.kpiValues.map(kv => {
        const benchmark = benchmarkMap.get(kv.kpiDefinitionId);
        return {
          kpiCode: kv.kpiDefinition.kpiCode,
          kpiName: kv.kpiDefinition.kpiName,
          dataFormat: kv.kpiDefinition.dataFormat,
          higherIsBetter: kv.kpiDefinition.higherIsBetter,
          benchmarkMin: kv.kpiDefinition.benchmarkMin,
          benchmarkMax: kv.kpiDefinition.benchmarkMax,
          currentValue: kv.currentValue,
          priorYearValue: kv.priorYearValue,
          yoyChangeAbsolute: kv.yoyChangeAbsolute,
          yoyChangePercent: kv.yoyChangePercent,
          percentOfBClass: kv.percentOfBClass,
          percentOfNational: kv.percentOfNational,
          benchmarkScore: kv.benchmarkScore,
          bClassAverage: benchmark?.bClassAverage,
          bClassYoyChange: benchmark?.bClassYoyChange,
          nationalAverage: benchmark?.nationalAverage,
          nationalYoyChange: benchmark?.nationalYoyChange,
          departmentId: kv.kpiDefinition.departmentId,
        };
      });

      for (const template of templates) {
        const report = await dbService.createReport(reportRun.id, du.id, template.id);

        try {
          await dbService.updateReportStatus(report.id, ReportStatus.GENERATING);

          // Filter KPIs for this department
          const deptKpiValues = mergedKpiValues.filter(kv => kv.departmentId === template.departmentId);

          // Generate AI assessment
          const assessment = await generateDepartmentAssessment(
            du.dealer.dealerName,
            template.department.name,
            du.periodStart.toISOString().split('T')[0],
            du.periodEnd.toISOString().split('T')[0],
            deptKpiValues,
            style,
            useAI,
            classLabel
          );

          // Generate DOCX
          const docxBuffer = await generateDepartmentReport(
            du.dealer.dealerName,
            du.dealer.dealerCode,
            template.title,
            du.periodStart.toISOString().split('T')[0],
            du.periodEnd.toISOString().split('T')[0],
            deptKpiValues,
            assessment,
            classLabel
          );

          // Save file
          const { filePath, fileSize } = await fileStorage.saveReportFile(
            du.dealer.dealerCode,
            template.reportId,
            du.periodEnd,
            docxBuffer
          );

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
        dealerCode: du.dealer.dealerCode,
        dealerName: du.dealer.dealerName,
        periodStart: du.periodStart.toISOString().split('T')[0],
        periodEnd: du.periodEnd.toISOString().split('T')[0],
        reports,
      });
    }

    // Update run status
    const allCompleted = dealerResults.every(d => d.reports.every(r => r.status === 'completed'));
    await dbService.updateReportRunStatus(
      reportRun.id,
      allCompleted ? ReportRunStatus.COMPLETED : ReportRunStatus.FAILED
    );

    return NextResponse.json({
      sessionId,
      dealers: dealerResults,
    });
  } catch (error) {
    console.error('Regeneration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate reports' },
      { status: 500 }
    );
  }
}
