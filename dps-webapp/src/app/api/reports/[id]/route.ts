import { NextRequest, NextResponse } from 'next/server';
import * as dbService from '@/lib/db-service';
import * as fileStorage from '@/lib/file-storage';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const report = await dbService.getReportWithOwnerCheck(id, user.id);

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      reportCode: report.template.reportCode,
      reportTitle: report.template.title,
      department: report.template.department.name,
      dealerCode: report.dealerUpload.dealer.dealerCode,
      dealerName: report.dealerUpload.dealer.dealerName,
      periodStart: report.dealerUpload.periodStart,
      periodEnd: report.dealerUpload.periodEnd,
      generatedAt: report.generatedAt,
      documentSize: report.documentSize,
      aiAssessment: report.aiAssessment,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const report = await dbService.getReportWithOwnerCheck(id, user.id);

    if (!report || !report.documentPath) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const fileBuffer = await fileStorage.getReportFile(report.documentPath);
    const filename = report.documentPath.split('/').pop() || 'report.docx';

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(fileBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to download report' }, { status: 500 });
  }
}
