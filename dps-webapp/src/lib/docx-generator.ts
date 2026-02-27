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
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
} from 'docx';
import { AIAssessment, KPIDataForReport, PerformanceScoreCategory } from '@/types';
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
              text: '\u2022',
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
              new TextRun({ text: 'Dealership: ', bold: true }),
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
            children: [new TextRun({ text: 'Detailed KPI Analysis', bold: true })],
          }),

          // KPI Sections
          ...generateKPISections(kpiData, assessment, classLabel),

          // Performance Score Assessment
          ...generatePerformanceScoreSection(assessment),

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
            children: [new TextRun({ text: 'Conclusion', bold: true })],
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

    // KPI Header - use csvDescription (full name from CSV) if available, otherwise kpiName
    const kpiDisplayName = kpi.csvDescription || kpi.kpiName;
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `${index + 1}. ${kpiDisplayName}`, bold: true })],
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

    // YoY Change (only show if there is actual YoY data, not default zeros)
    if (kpi.yoyChangeAbsolute != null && (kpi.yoyChangeAbsolute !== 0 || kpi.yoyChangePercent !== 0)) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [
            new TextRun({ text: 'Year-over-Year Change: ', bold: true }),
            new TextRun(formatYoYChange(kpi.yoyChangeAbsolute, kpi.yoyChangePercent, kpi.dataFormat)),
          ],
        })
      );
    }

    // Class Average Comparison
    if (kpi.bClassAverage != null) {
      const classPctStr = kpi.percentOfBClass != null
        ? ` (${formatPercentDetailed(kpi.percentOfBClass)} of Class)`
        : '';
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [
            new TextRun({ text: `${classLabel} Average: `, bold: true }),
            new TextRun(
              `${formatValue(kpi.bClassAverage, kpi.dataFormat)}${classPctStr}`
            ),
          ],
        })
      );
    }

    // National Average Comparison
    if (kpi.nationalAverage != null) {
      const natPctStr = kpi.percentOfNational != null
        ? ` (${formatPercentDetailed(kpi.percentOfNational)} of National)`
        : '';
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [
            new TextRun({ text: 'National Average: ', bold: true }),
            new TextRun(
              `${formatValue(kpi.nationalAverage, kpi.dataFormat)}${natPctStr}`
            ),
          ],
        })
      );
    }

    // Assessment with benchmark score merged in
    const assessmentPrefix = benchmarkLabel ? `${benchmarkLabel} \u2014 ` : '';
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

function generatePerformanceScoreSection(assessment: AIAssessment): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const categories = assessment.performanceScoreCategories;

  if (!categories || categories.length === 0) {
    // Fallback: render as plain text if no structured data
    if (assessment.performanceScoreAssessment) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'Performance Score Assessment', bold: true })],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun(assessment.performanceScoreAssessment)],
        }),
      );
    }
    return elements;
  }

  // Section heading
  elements.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Performance Score Assessment', bold: true })],
    }),
  );

  // Numbered subsections for each category
  categories.forEach((cat, idx) => {
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `${idx + 1}. ${cat.category} (${cat.weight}% weight)`, bold: true })],
      }),
    );

    // Score line
    elements.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: `Score: ${cat.score}/100`, bold: true })],
      }),
    );

    // Bullet points
    cat.bullets.forEach((bullet, bulletIdx) => {
      elements.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: bulletIdx === cat.bullets.length - 1 ? { after: 200 } : undefined,
          children: [new TextRun(bullet)],
        }),
      );
    });
  });

  // Performance Score Summary heading
  elements.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300 },
      children: [new TextRun({ text: 'Performance Score Summary', bold: true })],
    }),
  );

  // Build the summary table
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerShading = { fill: '1F4E79', type: ShadingType.CLEAR };
  const altRowShading = { fill: 'F2F2F2', type: ShadingType.CLEAR };
  const colWidths = [3600, 1800, 1800, 2160];
  const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

  const headerRow = new TableRow({
    tableHeader: true,
    children: ['Performance Category', 'Weight', 'Score', 'Weighted Score'].map((text, i) =>
      new TableCell({
        borders,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: headerShading,
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, color: 'FFFFFF' })],
        })],
      }),
    ),
  });

  const dataRows = categories.map((cat, idx) => {
    const weightedScore = (cat.weight / 100 * cat.score).toFixed(2);
    const rowShading = idx % 2 === 1 ? altRowShading : undefined;

    return new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: colWidths[0], type: WidthType.DXA },
          shading: rowShading,
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun(cat.category)] })],
        }),
        new TableCell({
          borders,
          width: { size: colWidths[1], type: WidthType.DXA },
          shading: rowShading,
          margins: cellMargins,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun(`${cat.weight}%`)],
          })],
        }),
        new TableCell({
          borders,
          width: { size: colWidths[2], type: WidthType.DXA },
          shading: rowShading,
          margins: cellMargins,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun(String(cat.score))],
          })],
        }),
        new TableCell({
          borders,
          width: { size: colWidths[3], type: WidthType.DXA },
          shading: rowShading,
          margins: cellMargins,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun(weightedScore)],
          })],
        }),
      ],
    });
  });

  // Totals row
  const totalWeightedScore = categories
    .reduce((sum, cat) => sum + (cat.weight / 100 * cat.score), 0)
    .toFixed(2);

  const totalsRow = new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: colWidths[0], type: WidthType.DXA },
        shading: headerShading,
        margins: cellMargins,
        children: [new Paragraph({
          children: [new TextRun({ text: 'TOTAL', bold: true, color: 'FFFFFF' })],
        })],
      }),
      new TableCell({
        borders,
        width: { size: colWidths[1], type: WidthType.DXA },
        shading: headerShading,
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '100%', bold: true, color: 'FFFFFF' })],
        })],
      }),
      new TableCell({
        borders,
        width: { size: colWidths[2], type: WidthType.DXA },
        shading: headerShading,
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '-', bold: true, color: 'FFFFFF' })],
        })],
      }),
      new TableCell({
        borders,
        width: { size: colWidths[3], type: WidthType.DXA },
        shading: headerShading,
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: totalWeightedScore, bold: true, color: 'FFFFFF' })],
        })],
      }),
    ],
  });

  elements.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [headerRow, ...dataRows, totalsRow],
    }),
  );

  return elements;
}

export function formatValue(value: number | null | undefined, format: string): string {
  if (value == null) return 'N/A';

  switch (format) {
    case 'CURRENCY': {
      // Accounting notation: positive = $6,727,091, negative = ($82,306)
      if (value < 0) {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(-value);
        return `(${formatted})`;
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    }
    case 'PERCENTAGE':
      return `${(value * 100).toFixed(2)}%`;
    case 'RATIO':
      return value.toFixed(2);
    case 'NUMBER':
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }).format(Math.round(value));
    case 'SCORE':
      // Remove unnecessary trailing zeros (87.50 -> 87.5, 90.00 -> 90)
      return parseFloat(value.toFixed(1)).toString();
    default:
      return String(value);
  }
}

export function formatChange(value: number | null | undefined, format: string): string {
  if (value == null) return 'N/A';
  if (format === 'CURRENCY') {
    // Currency change uses explicit +/- signs, not accounting parens
    const sign = value >= 0 ? '+' : '-';
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
    return `${sign}${formatted}`;
  }
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatValue(value, format)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return `${(value * 100).toFixed(0)}%`;
}

export function formatPercentDetailed(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  // One decimal, but strip trailing .0: 137.0% -> 137%, 91.5% -> 91.5%
  return `${parseFloat((value * 100).toFixed(1))}%`;
}

/**
 * Format YoY change with context-appropriate display.
 * Expected formats (matching reference reports):
 * - CURRENCY:   "+$388,048 (+3%)"
 * - PERCENTAGE: "-0.46 percentage points (-2%)"
 * - NUMBER:     "+2 units (+1%)"
 * - RATIO:      "-0.08 (-6%)"
 * - SCORE:      "-5.69 points (-6%)"
 */
export function formatYoYChange(
  absChange: number | null | undefined,
  pctChange: number | null | undefined,
  format: string
): string {
  if (absChange == null) return 'N/A';
  const pctSign = pctChange != null && pctChange >= 0 ? '+' : '';
  const pctStr = pctChange != null ? `${pctSign}${formatPercent(pctChange)}` : 'N/A';

  switch (format) {
    case 'PERCENTAGE': {
      const ppValue = (absChange * 100).toFixed(2);
      const sign = absChange >= 0 ? '+' : '';
      return `${sign}${ppValue} percentage points (${pctStr})`;
    }
    case 'CURRENCY': {
      const absFmt = formatChange(absChange, 'CURRENCY');
      return `${absFmt} (${pctStr})`;
    }
    case 'NUMBER': {
      const absRounded = Math.round(absChange);
      const sign = absRounded >= 0 ? '+' : '';
      return `${sign}${absRounded} units (${pctStr})`;
    }
    case 'RATIO': {
      const sign = absChange >= 0 ? '+' : '';
      return `${sign}${absChange.toFixed(2)} (${pctStr})`;
    }
    case 'SCORE': {
      const sign = absChange >= 0 ? '+' : '';
      const absStr = parseFloat(absChange.toFixed(2)).toString();
      return `${sign}${absStr} points (${pctStr})`;
    }
    default: {
      const sign = absChange >= 0 ? '+' : '';
      return `${sign}${formatValue(absChange, format)} (${pctStr})`;
    }
  }
}
