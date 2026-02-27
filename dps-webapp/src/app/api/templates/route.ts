import { NextResponse } from 'next/server';
import * as dbService from '@/lib/db-service';
import { isAIAvailable } from '@/lib/ai-assessor';

export async function GET() {
  try {
    const templates = await dbService.getReportTemplates();

    return NextResponse.json({
      templates: templates.map(t => ({
        reportCode: t.reportCode,
        reportId: t.reportId,
        title: t.title,
        department: t.department.name,
      })),
      aiAvailable: isAIAvailable(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}