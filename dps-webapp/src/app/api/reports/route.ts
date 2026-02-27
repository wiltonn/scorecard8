import { NextRequest, NextResponse } from 'next/server';
import * as dbService from '@/lib/db-service';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dealerCode = searchParams.get('dealerCode') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const { reports, total } = await dbService.getReportHistory({ dealerCode, limit, offset });

    return NextResponse.json({
      reports: reports.map(r => ({
        id: r.id,
        reportCode: r.template.reportCode,
        reportTitle: r.template.title,
        dealerCode: r.dealerUpload.dealer.dealerCode,
        dealerName: r.dealerUpload.dealer.dealerName,
        periodStart: r.dealerUpload.periodStart,
        periodEnd: r.dealerUpload.periodEnd,
        generatedAt: r.generatedAt,
        documentPath: r.documentPath,
        documentSize: r.documentSize,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
