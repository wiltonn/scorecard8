import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  LevelFormat,
} from 'docx';
import { AIAssessment, KPIDataForReport } from '@/types';
import { getBenchmarkScoreLabel } from './benchmark-engine';

export async function generateDepartmentReport(
  dealerName: string,
  dealerCode: string,
  reportTitle: string,
  periodStart: string,
  periodEnd: string,
  kpiData: KPIDataForReport[],
  assessment: AIAssessment,
  classLabel: string = 'B-Class'
): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 24 },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 32, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 240, after: 240 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 200, after: 120 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: 'numbers',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: dealerName, size: 20, color: '666666' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', size: 20 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 20 }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: reportTitle, bold: true })],
          }),

          // Dealer Info
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'Dealership Name: ', bold: true }),
              new TextRun(dealerName),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'Period: ', bold: true }),
              new TextRun(`${periodStart} to ${periodEnd}`),
            ],
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [
              new TextRun({ text: 'Report Date: ', bold: true }),
              new TextRun(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })),
            ],
          }),

          // Executive Summary
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'Executive Summary', bold: true })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun(assessment.executiveSummary)],
          }),

          // Page break before detailed analysis
          new Paragraph({ children: [new PageBreak()] }),

          // Detailed Performance Analysis
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'Detailed Performance Analysis', bold: true })],
          }),

          // KPI Sections
          ...generateKPISections(kpiData, assessment, classLabel),

          // Performance Score Assessment
          ...(assessment.performanceScoreAssessment ? [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: 'Performance Score Assessment', bold: true })],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun(assessment.performanceScoreAssessment)],
            }),
          ] : []),

          // Page break before recommendations
          new Paragraph({ children: [new PageBreak()] }),

          // Strategic Recommendations
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'Strategic Recommendations', bold: true })],
          }),

          // Immediate Actions
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Immediate Actions (0-3 months)', bold: true })],
          }),
          ...assessment.recommendations.immediate.map(
            (rec, i) =>
              new Paragraph({
                numbering: { reference: 'numbers', level: 0 },
                children: [new TextRun(rec)],
              })
          ),

          // Short-term Actions
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Short-Term Actions (3-6 months)', bold: true })],
          }),
          ...assessment.recommendations.shortTerm.map(
            (rec) =>
              new Paragraph({
                numbering: { reference: 'numbers', level: 0 },
                children: [new TextRun(rec)],
              })
          ),

          // Long-term Strategies
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Long-Term Strategies (6-12 months)', bold: true })],
          }),
          ...assessment.recommendations.longTerm.map(
            (rec) =>
              new Paragraph({
                numbering: { reference: 'numbers', level: 0 },
                children: [new TextRun(rec)],
              })
          ),

          // Critical Summary
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400 },
            children: [new TextRun({ text: 'Critical Summary', bold: true })],
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [new TextRun({ text: assessment.criticalSummary, bold: true })],
          }),

          // Footer notes
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: `Report prepared based on operational data for the period ${periodStart} to ${periodEnd}`,
                italics: true,
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function generateKPISections(
  kpiData: KPIDataForReport[],
  assessment: AIAssessment,
  classLabel: string = 'B-Class'
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  kpiData.forEach((kpi, index) => {
    const kpiAssessment = assessment.kpiAssessments.find(a => a.kpiCode === kpi.kpiCode);
    const assessmentText = kpiAssessment?.assessment || 'Assessment not available.';
    const benchmarkLabel = kpi.benchmarkScore && kpi.benchmarkScore !== 'NA'
      ? getBenchmarkScoreLabel(kpi.benchmarkScore as any)
      : null;

    // KPI Header
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `${index + 1}. ${kpi.kpiName}`, bold: true })],
      })
    );

    // Current Year
    paragraphs.push(
      new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [
          new TextRun({ text: 'Current Year: ', bold: true }),
          new TextRun(formatValue(kpi.currentValue, kpi.dataFormat)),
        ],
      })
    );

    // YoY Change
    if (kpi.yoyChangeAbsolute != null) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [
            new TextRun({ text: 'Year-over-Year Change: ', bold: true }),
            new TextRun(
              `${formatChange(kpi.yoyChangeAbsolute, kpi.dataFormat)} (${formatPercent(kpi.yoyChangePercent)})`
            ),
          ],
        })
      );
    }

    // Class Average Comparison
    if (kpi.bClassAverage != null) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [
            new TextRun({ text: `${classLabel} Average Comparison: `, bold: true }),
            new TextRun(
              `${formatPercent(kpi.percentOfBClass)} of benchmark (${formatValue(kpi.bClassAverage, kpi.dataFormat)})`
            ),
          ],
        })
      );
    }

    // National Average Comparison
    if (kpi.nationalAverage != null) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [
            new TextRun({ text: 'National Average Comparison: ', bold: true }),
            new TextRun(
              `${formatPercent(kpi.percentOfNational)} of benchmark (${formatValue(kpi.nationalAverage, kpi.dataFormat)})`
            ),
          ],
        })
      );
    }

    // Assessment with benchmark score merged in
    const assessmentPrefix = benchmarkLabel ? `${benchmarkLabel} — ` : '';
    paragraphs.push(
      new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        spacing: { after: 300 },
        children: [
          new TextRun({ text: 'Assessment: ', bold: true }),
          ...(benchmarkLabel ? [new TextRun({ text: assessmentPrefix, bold: true })] : []),
          new TextRun(assessmentText),
        ],
      })
    );
  });

  return paragraphs;
}

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
      return new Intl.NumberFormat('en-US').format(value);
    case 'SCORE':
      return value.toFixed(2);
    default:
      return String(value);
  }
}

function formatChange(value: number | null | undefined, format: string): string {
  if (value == null) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatValue(value, format)}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return `${(value * 100).toFixed(0)}%`;
}