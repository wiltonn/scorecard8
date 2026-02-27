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
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const { sessions, total } = await dbService.getRecentSessions(user.id, limit, offset);

    return NextResponse.json({
      sessions: sessions.map(s => ({
        sessionId: s.id,
        name: s.name,
        status: s.status,
        dealers: s.dealerUploads.map(du => du.dealer.dealerName),
        periodStart: s.dealerUploads[0]?.periodStart ?? null,
        periodEnd: s.dealerUploads[0]?.periodEnd ?? null,
        runCount: s.reportRuns.length,
        createdAt: s.createdAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
