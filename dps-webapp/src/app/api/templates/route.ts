import { NextResponse } from 'next/server';
import * as dbService from '@/lib/db-service';
import { isAIAvailable } from '@/lib/ai-assessor';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const templates = await dbService.getReportTemplates();

    return NextResponse.json({
      templates: templates.map(t => ({
        reportCode: t.reportCode,
        reportId: t.reportId,
        title: t.title,
        department: t.reportCode === 'DPS-08' ? t.title : t.department.name,
      })),
      aiAvailable: isAIAvailable(),
    });
  } catch (error) {
    console.error('Templates API error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates', details: String(error) }, { status: 500 });
  }
}
