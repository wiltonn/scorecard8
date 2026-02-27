import { AIAssessment, KPIDataForReport, OverallScoreAssessment } from '@/types';
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

// --- Overall Scorecard Assessment ---

export async function generateOverallScorecardAssessment(
  dealerName: string,
  periodStart: string,
  periodEnd: string,
  kpiData: KPIDataForReport[],
  commentaryStyle: CommentaryStyle,
  useAI = false,
  classLabel: string = 'B-Class'
): Promise<OverallScoreAssessment> {
  if (!useAI || !process.env.ANTHROPIC_API_KEY) {
    return generatePlaceholderOverallAssessment(dealerName, kpiData, classLabel);
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic();

  const styleGuides: Record<CommentaryStyle, string> = {
    EXECUTIVE: 'Be concise and high-level. Keep sections to 50-75 words.',
    STANDARD: 'Provide balanced detail. Keep sections to 100-150 words.',
    DETAILED: 'Provide comprehensive analysis. Keep sections to 200-300 words.',
    COACHING: 'Be supportive and developmental. Keep sections to 150-200 words.',
    DIRECT: 'Be factual and numbers-forward. Keep sections to 75-100 words.',
  };

  const kpiSummaryLines = kpiData.map(kpi => {
    const pctOfBClass = kpi.percentOfBClass ? `${(kpi.percentOfBClass * 100).toFixed(0)}% of ${classLabel}` : 'N/A';
    const pctOfNat = kpi.percentOfNational ? `${(kpi.percentOfNational * 100).toFixed(0)}% of National` : 'N/A';
    return `- ${kpi.kpiName}: ${formatValue(kpi.currentValue, kpi.dataFormat)} | ${classLabel}: ${pctOfBClass} | National: ${pctOfNat} | Score: ${kpi.benchmarkScore || 'N/A'}`;
  }).join('\n');

  const prompt = `You are a motorcycle dealership performance analyst. Generate a comprehensive OVERALL DEALERSHIP PERFORMANCE SCORECARD for ${dealerName} for the period ${periodStart} to ${periodEnd}.

Style: ${commentaryStyle} — ${styleGuides[commentaryStyle]}

This report evaluates ALL departments holistically across 5 weighted categories:
1. Financial Performance (30% weight) - Overall profitability, margins, ROA, net income
2. Departmental Performance (25% weight) - Individual department contributions and efficiency
3. Cost Management (20% weight) - Expense control, wages, advertising costs
4. Market Position/Growth (15% weight) - Market share, brand contribution, competitive standing
5. Operational Efficiency (10% weight) - Absorption, service metrics, inventory management

KPI Data (${kpiData.length} KPIs across all departments):
${kpiSummaryLines}

Respond with valid JSON matching this exact structure:
{
  "reportType": "OVERALL_SCORECARD",
  "executiveSummary": "2-3 sentence overview",
  "introductionParagraph": "Detailed introduction paragraph setting the context for this overall performance assessment",
  "overallCategories": [
    {
      "category": "Financial Performance",
      "weight": 30,
      "score": 45,
      "assessmentFactors": ["Labeled Factor: explanation text...", "Another Factor: explanation..."],
      "scoringRationale": "Paragraph explaining why this score was given, referencing specific KPIs"
    }
  ],
  "overallScore": 42.5,
  "performanceRating": "NEEDS IMMEDIATE IMPROVEMENT",
  "detailedScoreAnalysis": {
    "strengths": [
      { "category": "Category Name", "score": 65, "bullets": ["Strength detail 1", "Strength detail 2"] }
    ],
    "weaknesses": [
      { "category": "Category Name", "score": 30, "bullets": ["Weakness detail 1", "Weakness detail 2"] }
    ]
  },
  "scoreImplications": ["Implication 1 with specific numbers", "Implication 2"],
  "pathToImprovement": {
    "scenario": "Description of the improvement scenario",
    "improvements": [
      { "category": "Financial Performance", "fromScore": 35, "toScore": 55, "weightedGain": 6.0, "action": "Specific action to take" }
    ],
    "resultScore": 58.5
  },
  "criticalSuccessFactors": ["Factor 1", "Factor 2", "Factor 3"],
  "finalAssessmentParagraphs": ["Bold concluding paragraph 1", "Bold concluding paragraph 2"],
  "boardActionRequired": ["Urgent action item 1", "Urgent action item 2", "Urgent action item 3"],
  "strengths": ["Overall strength 1", "Overall strength 2"],
  "weaknesses": ["Overall weakness 1", "Overall weakness 2"],
  "recommendations": {
    "immediate": ["Action 1", "Action 2"],
    "shortTerm": ["Action 1", "Action 2"],
    "longTerm": ["Action 1", "Action 2"]
  },
  "criticalSummary": "Bold summary paragraph",
  "kpiAssessments": []
}

IMPORTANT:
- overallCategories must have exactly 5 categories with weights 30, 25, 20, 15, 10
- overallScore should be the weighted total of all category scores
- performanceRating should be one of: "EXCEPTIONAL PERFORMANCE", "STRONG PERFORMANCE", "MODERATE PERFORMANCE", "NEEDS IMPROVEMENT", "NEEDS IMMEDIATE IMPROVEMENT"
- Each assessmentFactors entry should be a labeled bullet like "Factor Name: explanation..."
- Reference specific KPI values and ${classLabel} comparisons throughout
- boardActionRequired should list urgent items requiring board/management attention
- pathToImprovement should show realistic scenario with specific weighted gains`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return parseOverallScorecardResponse(content.text, dealerName, kpiData, classLabel);
    }
  } catch (error) {
    console.error('AI overall scorecard assessment failed:', error);
  }

  return generatePlaceholderOverallAssessment(dealerName, kpiData, classLabel);
}

function parseOverallScorecardResponse(
  text: string,
  dealerName: string,
  kpiData: KPIDataForReport[],
  classLabel: string
): OverallScoreAssessment {
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

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      reportType: 'OVERALL_SCORECARD',
      executiveSummary: parsed.executiveSummary || '',
      introductionParagraph: parsed.introductionParagraph || '',
      overallCategories: Array.isArray(parsed.overallCategories) ? parsed.overallCategories.map((cat: any) => ({
        category: cat.category || '',
        weight: Number(cat.weight) || 0,
        score: Number(cat.score) || 0,
        assessmentFactors: Array.isArray(cat.assessmentFactors) ? cat.assessmentFactors : [],
        scoringRationale: cat.scoringRationale || '',
      })) : [],
      overallScore: Number(parsed.overallScore) || 0,
      performanceRating: parsed.performanceRating || 'NEEDS IMPROVEMENT',
      detailedScoreAnalysis: {
        strengths: Array.isArray(parsed.detailedScoreAnalysis?.strengths) ? parsed.detailedScoreAnalysis.strengths.map((s: any) => ({
          category: s.category || '',
          score: Number(s.score) || 0,
          bullets: Array.isArray(s.bullets) ? s.bullets : [],
        })) : [],
        weaknesses: Array.isArray(parsed.detailedScoreAnalysis?.weaknesses) ? parsed.detailedScoreAnalysis.weaknesses.map((w: any) => ({
          category: w.category || '',
          score: Number(w.score) || 0,
          bullets: Array.isArray(w.bullets) ? w.bullets : [],
        })) : [],
      },
      scoreImplications: Array.isArray(parsed.scoreImplications) ? parsed.scoreImplications : [],
      pathToImprovement: {
        scenario: parsed.pathToImprovement?.scenario || '',
        improvements: Array.isArray(parsed.pathToImprovement?.improvements) ? parsed.pathToImprovement.improvements.map((imp: any) => ({
          category: imp.category || '',
          fromScore: Number(imp.fromScore) || 0,
          toScore: Number(imp.toScore) || 0,
          weightedGain: Number(imp.weightedGain) || 0,
          action: imp.action || '',
        })) : [],
        resultScore: Number(parsed.pathToImprovement?.resultScore) || 0,
      },
      criticalSuccessFactors: Array.isArray(parsed.criticalSuccessFactors) ? parsed.criticalSuccessFactors : [],
      finalAssessmentParagraphs: Array.isArray(parsed.finalAssessmentParagraphs) ? parsed.finalAssessmentParagraphs : [],
      boardActionRequired: Array.isArray(parsed.boardActionRequired) ? parsed.boardActionRequired : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      recommendations: {
        immediate: parsed.recommendations?.immediate || [],
        shortTerm: parsed.recommendations?.shortTerm || [],
        longTerm: parsed.recommendations?.longTerm || [],
      },
      criticalSummary: parsed.criticalSummary || '',
      kpiAssessments: [],
    };
  } catch {
    return generatePlaceholderOverallAssessment(dealerName, kpiData, classLabel);
  }
}

function generatePlaceholderOverallAssessment(
  dealerName: string,
  kpiData: KPIDataForReport[],
  classLabel: string = 'B-Class'
): OverallScoreAssessment {
  const categories = [
    { category: 'Financial Performance', weight: 30, score: 45 },
    { category: 'Departmental Performance', weight: 25, score: 50 },
    { category: 'Cost Management', weight: 20, score: 55 },
    { category: 'Market Position/Growth', weight: 15, score: 40 },
    { category: 'Operational Efficiency', weight: 10, score: 50 },
  ];

  const overallScore = categories.reduce((sum, cat) => sum + (cat.weight / 100 * cat.score), 0);

  return {
    reportType: 'OVERALL_SCORECARD',
    executiveSummary: `This report provides a comprehensive cross-departmental performance assessment for ${dealerName}. The assessment evaluates ${kpiData.length} KPIs across all departments against ${classLabel} averages and national benchmarks.`,
    introductionParagraph: `This Overall Dealership Performance Scorecard provides a holistic assessment of ${dealerName}'s operations across all departments. The analysis synthesizes data from ${kpiData.length} key performance indicators spanning financial performance, departmental operations, cost management, market positioning, and operational efficiency. Each category is weighted according to its strategic importance and scored on a 0-100 scale. Enable AI-generated commentary for detailed, personalized analysis.`,
    overallCategories: categories.map(cat => ({
      ...cat,
      assessmentFactors: [
        'Data-driven performance tracking is in place across departments',
        `Enable AI commentary for detailed ${cat.category.toLowerCase()} assessment`,
      ],
      scoringRationale: `${cat.category} score of ${cat.score}/100 is based on ${classLabel} and national benchmark comparisons. Enable AI-generated commentary for a detailed scoring rationale.`,
    })),
    overallScore: parseFloat(overallScore.toFixed(2)),
    performanceRating: overallScore >= 80 ? 'STRONG PERFORMANCE' : overallScore >= 60 ? 'MODERATE PERFORMANCE' : overallScore >= 40 ? 'NEEDS IMPROVEMENT' : 'NEEDS IMMEDIATE IMPROVEMENT',
    detailedScoreAnalysis: {
      strengths: [
        { category: 'Departmental Performance', score: 50, bullets: ['Comprehensive KPI monitoring in place', 'Regular benchmark comparisons against industry standards'] },
      ],
      weaknesses: [
        { category: 'Market Position/Growth', score: 40, bullets: ['Enable AI commentary for detailed weakness analysis', 'Full assessment requires AI-generated commentary'] },
      ],
    },
    scoreImplications: [
      `Overall weighted score of ${overallScore.toFixed(1)}/100 indicates areas requiring attention`,
      'Enable AI commentary for specific score implications and recommendations',
      `Performance benchmarked against ${classLabel} averages and national standards`,
    ],
    pathToImprovement: {
      scenario: 'Targeted improvement across key categories could significantly improve the overall score. Enable AI for specific improvement scenarios.',
      improvements: categories.map(cat => ({
        category: cat.category,
        fromScore: cat.score,
        toScore: Math.min(cat.score + 15, 100),
        weightedGain: parseFloat(((15 * cat.weight) / 100).toFixed(1)),
        action: `Implement targeted improvements in ${cat.category.toLowerCase()}`,
      })),
      resultScore: parseFloat((overallScore + 15).toFixed(2)),
    },
    criticalSuccessFactors: [
      'Enable AI-generated commentary for personalized critical success factors',
      'Review all KPIs marked as Substandard or Weak',
      `Compare against ${classLabel} top performers`,
    ],
    finalAssessmentParagraphs: [
      `This assessment provides benchmark scores and comparisons for ${dealerName} across all departments. Enable AI-generated commentary for detailed, personalized analysis and strategic recommendations.`,
    ],
    boardActionRequired: [
      'Review comprehensive KPI performance data across all departments',
      'Enable AI-generated commentary for specific board action items',
      'Prioritize departments showing below-benchmark performance',
    ],
    strengths: [
      'Data-driven performance tracking in place',
      'Comprehensive cross-departmental KPI monitoring',
    ],
    weaknesses: [
      'AI-generated detailed analysis not enabled',
      'Enable AI toggle with a valid API key for personalized recommendations',
    ],
    recommendations: {
      immediate: ['Review KPIs marked as Substandard or Weak', `Compare against ${classLabel} top performers`],
      shortTerm: ['Develop action plans for underperforming areas', 'Set quarterly improvement targets'],
      longTerm: ['Implement continuous improvement processes', 'Consider ManageByNumbers training courses'],
    },
    criticalSummary: `This overall performance scorecard provides benchmark scores and cross-departmental comparisons for ${dealerName}. Enable AI-generated commentary for detailed, personalized analysis and recommendations.`,
    kpiAssessments: [],
  };
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
