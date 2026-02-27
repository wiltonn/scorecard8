import { AIAssessment, KPIDataForReport } from '@/types';
import { CommentaryStyle } from '@prisma/client';

export function isAIAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function generateDepartmentAssessment(
  dealerName: string,
  departmentName: string,
  periodStart: string,
  periodEnd: string,
  kpiData: KPIDataForReport[],
  commentaryStyle: CommentaryStyle,
  useAI = false,
  classLabel: string = 'B-Class'
): Promise<AIAssessment> {

  if (!useAI || !process.env.ANTHROPIC_API_KEY) {
    return generatePlaceholderAssessment(dealerName, departmentName, kpiData, classLabel);
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic();

  // Phase 1: Generate an individual AI assessment for each KPI (parallel)
  const kpiAssessments = await Promise.all(
    kpiData.map(kpi =>
      generateSingleKpiAssessment(anthropic, dealerName, departmentName, periodStart, periodEnd, kpi, commentaryStyle, classLabel)
    )
  );

  // Phase 2: Generate department-level summary from all the KPI data + assessments
  const summary = await generateDepartmentSummary(
    anthropic, dealerName, departmentName, periodStart, periodEnd, kpiData, kpiAssessments, commentaryStyle, classLabel
  );

  return {
    ...summary,
    kpiAssessments,
  };
}

// --- Per-KPI AI call ---

async function generateSingleKpiAssessment(
  anthropic: any,
  dealerName: string,
  departmentName: string,
  periodStart: string,
  periodEnd: string,
  kpi: KPIDataForReport,
  commentaryStyle: CommentaryStyle,
  classLabel: string = 'B-Class'
): Promise<{ kpiCode: string; assessment: string }> {
  const styleGuides: Record<CommentaryStyle, string> = {
    EXECUTIVE: 'Be concise. 2-3 sentences.',
    STANDARD: 'Provide balanced detail. 3-5 sentences.',
    DETAILED: 'Provide comprehensive analysis. 5-8 sentences.',
    COACHING: 'Be supportive and developmental, focusing on improvement. 4-6 sentences.',
    DIRECT: 'Be factual and numbers-forward. 2-4 sentences.',
  };

  const pctOfBClass = kpi.percentOfBClass ? `${(kpi.percentOfBClass * 100).toFixed(0)}% of ${classLabel}` : 'N/A';
  const pctOfNat = kpi.percentOfNational ? `${(kpi.percentOfNational * 100).toFixed(0)}% of National` : 'N/A';
  const yoyChange = kpi.yoyChangePercent ? `${(kpi.yoyChangePercent * 100).toFixed(1)}% YoY` : 'N/A';

  const prompt = `You are a motorcycle dealership performance analyst. Write a focused assessment for a single KPI.

Style: ${commentaryStyle} \u2014 ${styleGuides[commentaryStyle]}

Dealership: ${dealerName}
Department: ${departmentName}
Period: ${periodStart} to ${periodEnd}

KPI: ${kpi.kpiName}
- Current Value: ${formatValue(kpi.currentValue, kpi.dataFormat)}
- Prior Year Value: ${kpi.priorYearValue != null ? formatValue(kpi.priorYearValue, kpi.dataFormat) : 'N/A'}
- YoY Change: ${yoyChange}
- ${classLabel} Average: ${formatValue(kpi.bClassAverage, kpi.dataFormat)} (${pctOfBClass})
- National Average: ${formatValue(kpi.nationalAverage, kpi.dataFormat)} (${pctOfNat})
- Benchmark Score: ${kpi.benchmarkScore || 'N/A'}
- Higher is Better: ${kpi.higherIsBetter ? 'Yes' : 'No'}

Write a professional assessment paragraph for this KPI. Reference the specific numbers. Compare against benchmarks. Note the YoY trend. Comment on the benchmark score. Do NOT include the KPI name as a heading \u2014 just the assessment text. Respond with ONLY the assessment text, no JSON or markup.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return { kpiCode: kpi.kpiCode, assessment: content.text.trim() };
    }
  } catch (error) {
    console.error(`AI assessment failed for KPI ${kpi.kpiCode}:`, error);
  }

  // Fallback if AI call fails for this KPI
  return { kpiCode: kpi.kpiCode, assessment: buildPlaceholderKpiAssessment(kpi) };
}

// --- Department summary AI call ---

async function generateDepartmentSummary(
  anthropic: any,
  dealerName: string,
  departmentName: string,
  periodStart: string,
  periodEnd: string,
  kpiData: KPIDataForReport[],
  kpiAssessments: Array<{ kpiCode: string; assessment: string }>,
  commentaryStyle: CommentaryStyle,
  classLabel: string = 'B-Class'
): Promise<Omit<AIAssessment, 'kpiAssessments'>> {
  const styleGuides: Record<CommentaryStyle, string> = {
    EXECUTIVE: 'Be concise and high-level. Keep each section to 50-75 words.',
    STANDARD: 'Provide balanced detail. Keep each section to 100-150 words.',
    DETAILED: 'Provide comprehensive analysis. Keep each section to 200-300 words.',
    COACHING: 'Be supportive and developmental. Keep each section to 150-200 words.',
    DIRECT: 'Be factual and numbers-forward. Keep each section to 75-100 words.',
  };

  const kpiSummaryLines = kpiData.map(kpi => {
    const assessment = kpiAssessments.find(a => a.kpiCode === kpi.kpiCode);
    return `- ${kpi.kpiName} [${kpi.benchmarkScore || 'N/A'}]: ${formatValue(kpi.currentValue, kpi.dataFormat)}\n  Assessment: ${assessment?.assessment || 'N/A'}`;
  }).join('\n');

  const prompt = `You are a motorcycle dealership performance analyst. Generate a department-level summary for the ${departmentName} department at ${dealerName} for ${periodStart} to ${periodEnd}.

Style: ${commentaryStyle} \u2014 ${styleGuides[commentaryStyle]}

KPI Overview (${kpiData.length} KPIs):
${kpiSummaryLines}

Respond with valid JSON matching this exact structure:
{
  "executiveSummary": "2-3 sentence overview of department performance",
  "departmentContext": "Brief context about how this department contributes to dealership health",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "recommendations": {
    "immediate": ["action 1", "action 2"],
    "shortTerm": ["action 1", "action 2"],
    "longTerm": ["action 1", "action 2"]
  },
  "criticalSummary": "Bold summary paragraph highlighting the most important takeaways",
  "performanceScoreAssessment": "A paragraph summarizing the overall performance scores across all KPIs, noting how many scored Exceptional/Strong/Moderate/Substandard/Weak, and what the scores indicate about overall ${classLabel} and national benchmark positioning",
  "performanceScoreCategories": [
    {
      "category": "Short category name (e.g. Sales Performance, Gross Profit Performance, Cost Management, Market Position/Growth, Operational Efficiency)",
      "weight": 30,
      "score": 80,
      "bullets": ["Key finding 1 referencing specific data", "Key finding 2"]
    }
  ]
}

IMPORTANT for performanceScoreCategories:
- Create exactly 5 performance categories that cover the KPIs analyzed
- Weights must sum to 100 (typically: 30, 25, 20, 15, 10)
- Scores are 0-100 based on the benchmark data
- Each category should have 2-3 bullet points summarizing key findings
- Category names should be concise (e.g. "Sales Performance", "Gross Profit Performance", "Cost Management", "Market Position/Growth", "Operational Efficiency")

Reference specific KPI names and benchmark scores. Use "${classLabel}" when referring to the volume class benchmark. Provide actionable recommendations.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return parseSummaryResponse(content.text);
    }
  } catch (error) {
    console.error('AI department summary failed:', error);
  }

  // Fallback
  return buildPlaceholderSummary(dealerName, departmentName);
}

// --- Placeholder generators ---

function generatePlaceholderAssessment(
  dealerName: string,
  departmentName: string,
  kpiData: KPIDataForReport[],
  classLabel: string = 'B-Class'
): AIAssessment {
  return {
    ...buildPlaceholderSummary(dealerName, departmentName, classLabel),
    kpiAssessments: kpiData.map(kpi => ({
      kpiCode: kpi.kpiCode,
      assessment: buildPlaceholderKpiAssessment(kpi, classLabel),
    })),
  };
}

function buildPlaceholderKpiAssessment(kpi: KPIDataForReport, classLabel: string = 'B-Class'): string {
  const currentFormatted = formatValue(kpi.currentValue, kpi.dataFormat);
  const parts: string[] = [];

  parts.push(`${kpi.kpiName} is currently at ${currentFormatted}.`);

  if (kpi.yoyChangePercent != null && kpi.yoyChangePercent !== 0) {
    const direction = kpi.yoyChangePercent > 0 ? 'increased' : 'decreased';
    const favorable = kpi.higherIsBetter
      ? (kpi.yoyChangePercent > 0 ? 'favorable' : 'unfavorable')
      : (kpi.yoyChangePercent < 0 ? 'favorable' : 'unfavorable');
    parts.push(
      `This has ${direction} by ${Math.abs(kpi.yoyChangePercent * 100).toFixed(1)}% year-over-year, which is a ${favorable} trend.`
    );
  }

  if (kpi.percentOfBClass) {
    const pct = (kpi.percentOfBClass * 100).toFixed(0);
    if (kpi.percentOfBClass >= 1.1) {
      parts.push(`At ${pct}% of the ${classLabel} average, this metric significantly exceeds the volume class benchmark.`);
    } else if (kpi.percentOfBClass >= 0.95) {
      parts.push(`At ${pct}% of the ${classLabel} average, this metric is tracking in line with the volume class benchmark.`);
    } else {
      parts.push(`At ${pct}% of the ${classLabel} average, this metric is below the volume class benchmark and warrants attention.`);
    }
  }

  if (kpi.percentOfNational) {
    const pct = (kpi.percentOfNational * 100).toFixed(0);
    if (kpi.percentOfNational >= 1.1) {
      parts.push(`Performance is ${pct}% of the national average, outperforming the broader market.`);
    } else if (kpi.percentOfNational >= 0.95) {
      parts.push(`Performance is ${pct}% of the national average, roughly in line with the market.`);
    } else {
      parts.push(`Performance is ${pct}% of the national average, trailing the broader market.`);
    }
  }

  if (kpi.benchmarkScore && kpi.benchmarkScore !== 'NA') {
    parts.push(`Benchmark assessment: ${kpi.benchmarkScore}.`);
  }

  return parts.join(' ');
}

function buildPlaceholderSummary(
  dealerName: string,
  departmentName: string,
  classLabel: string = 'B-Class'
): Omit<AIAssessment, 'kpiAssessments'> {
  return {
    executiveSummary: `This report provides a comprehensive analysis of ${departmentName} performance for ${dealerName}. The assessment is based on current period data compared against ${classLabel} averages and national benchmarks.`,
    departmentContext: `The ${departmentName} department plays a critical role in overall dealership profitability and customer satisfaction.`,
    strengths: [
      'Data-driven performance tracking in place',
      'Comprehensive KPI monitoring across departments',
      'Regular benchmark comparisons against industry standards',
    ],
    weaknesses: [
      'AI-generated detailed analysis not enabled',
      'Enable AI toggle with a valid API key for personalized recommendations',
      'Full assessment requires AI-generated commentary',
    ],
    recommendations: {
      immediate: [
        'Review KPIs marked as Substandard or Weak',
        `Compare against ${classLabel} top performers`,
      ],
      shortTerm: [
        'Develop action plans for underperforming areas',
        'Set quarterly improvement targets',
      ],
      longTerm: [
        'Implement continuous improvement processes',
        'Consider ManageByNumbers training courses',
      ],
    },
    criticalSummary: `This ${departmentName} report provides benchmark scores and comparisons for ${dealerName}. Enable AI-generated commentary for detailed, personalized analysis and recommendations.`,
    performanceScoreAssessment: `Performance scores are based on ${classLabel} and national benchmark comparisons. Enable AI-generated commentary for a detailed performance score assessment.`,
    performanceScoreCategories: [
      { category: 'Sales Performance', weight: 30, score: 70, bullets: ['Data-driven performance tracking in place', 'Enable AI for detailed analysis'] },
      { category: 'Gross Profit Performance', weight: 25, score: 70, bullets: ['Comprehensive KPI monitoring', 'Enable AI for detailed analysis'] },
      { category: 'Cost Management', weight: 20, score: 70, bullets: ['Regular benchmark comparisons', 'Enable AI for detailed analysis'] },
      { category: 'Market Position/Growth', weight: 15, score: 70, bullets: ['Industry standard tracking', 'Enable AI for detailed analysis'] },
      { category: 'Operational Efficiency', weight: 10, score: 70, bullets: ['Balanced operations monitoring', 'Enable AI for detailed analysis'] },
    ],
  };
}

// --- Utilities ---

function formatValue(value: number | null | undefined, format: string): string {
  if (value == null) return 'N/A';

  switch (format) {
    case 'CURRENCY':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    case 'PERCENTAGE':
      return `${(value * 100).toFixed(2)}%`;
    case 'RATIO':
      return value.toFixed(2);
    case 'NUMBER':
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value));
    case 'SCORE':
      return parseFloat(value.toFixed(1)).toString();
    default:
      return String(value);
  }
}

function parseSummaryResponse(text: string): Omit<AIAssessment, 'kpiAssessments'> {
  let jsonStr = text;
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      jsonStr = text.substring(startIdx, endIdx + 1);
    }
  }

  const parsed = JSON.parse(jsonStr);
  return {
    executiveSummary: parsed.executiveSummary || '',
    departmentContext: parsed.departmentContext || '',
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    recommendations: {
      immediate: parsed.recommendations?.immediate || [],
      shortTerm: parsed.recommendations?.shortTerm || [],
      longTerm: parsed.recommendations?.longTerm || [],
    },
    criticalSummary: parsed.criticalSummary || '',
    performanceScoreAssessment: parsed.performanceScoreAssessment || '',
    performanceScoreCategories: Array.isArray(parsed.performanceScoreCategories)
      ? parsed.performanceScoreCategories.map((cat: any) => ({
          category: cat.category || '',
          weight: Number(cat.weight) || 0,
          score: Number(cat.score) || 0,
          bullets: Array.isArray(cat.bullets) ? cat.bullets : [],
        }))
      : undefined,
  };
}
