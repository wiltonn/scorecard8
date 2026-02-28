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
  ImageRun,
} from 'docx';
import { OverallScoreAssessment } from '@/types';
import * as fs from 'fs';
import * as path from 'path';

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

export async function generateOverallScorecardReport(
  dealerName: string,
  _dealerCode: string,
  _reportTitle: string,
  periodStart: string,
  periodEnd: string,
  assessment: OverallScoreAssessment,
  classLabel: string = 'B-Class'
): Promise<Buffer> {
  // Load logo image
  let logoImageRun: ImageRun | null = null;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'resultGuruLogo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    logoImageRun = new ImageRun({
      data: logoBuffer,
      transformation: { width: 150, height: 40 },
      type: 'png',
    });
  } catch {
    // Logo not available, skip it
  }

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
          reference: 'subbullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u2013',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
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
                children: logoImageRun
                  ? [logoImageRun]
                  : [new TextRun({ text: 'ResultsOnTrac', size: 20, color: '666666', italics: true })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 20 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 20 }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title section
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: 'Manage by Numbers', size: 28, font: 'Arial', color: '333333' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'DEALER PERFORMANCE SCORECARD', size: 36, bold: true, font: 'Arial' })],
          }),

          // Dealer info
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: dealerName, size: 28, bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: 'Overall Dealership Performance SCORE', size: 22, color: '555555' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Report Period: ', bold: true }),
              new TextRun(`${periodStart} to ${periodEnd}`),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({ text: 'Report Date: ', bold: true }),
              new TextRun(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })),
            ],
          }),

          // Introduction paragraph
          new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun(assessment.introductionParagraph)],
          }),

          // Page break before category sections
          new Paragraph({ children: [new PageBreak()] }),

          // 5 Performance Category sections
          ...generateCategorySections(assessment),

          // Page break before summary table
          new Paragraph({ children: [new PageBreak()] }),

          // Summary Table
          ...generateSummaryTable(assessment),

          // Performance Rating box
          ...generatePerformanceRatingBox(assessment),

          // Detailed Score Analysis
          ...generateDetailedScoreAnalysis(assessment),

          // Page break before implications
          new Paragraph({ children: [new PageBreak()] }),

          // Score Implications
          ...generateScoreImplications(assessment),

          // Path to Improvement
          ...generatePathToImprovement(assessment),

          // Final Assessment
          ...generateFinalAssessment(assessment),

          // Board Action Required
          ...generateBoardActionRequired(assessment),

          // Footer notes
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: `Report prepared based on operational data for the period ${periodStart} to ${periodEnd}. `,
                italics: true,
                size: 20,
              }),
              new TextRun({
                text: 'This assessment is generated by ResultsOnTrac analytics and should be reviewed by management.',
                italics: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 100 },
            children: [
              new TextRun({
                text: `${classLabel} benchmark comparisons used throughout this report.`,
                italics: true,
                size: 20,
                color: '888888',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function generateCategorySections(assessment: OverallScoreAssessment): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  assessment.overallCategories.forEach((cat, idx) => {
    // Category heading
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `${idx + 1}. ${cat.category} (${cat.weight}% Weight)`, bold: true })],
      })
    );

    // Score line
    paragraphs.push(
      new Paragraph({
        spacing: { after: 150 },
        children: [new TextRun({ text: `Score: ${cat.score}/100`, bold: true, size: 26 })],
      })
    );

    // Assessment Factors heading
    paragraphs.push(
      new Paragraph({
        spacing: { before: 100, after: 80 },
        children: [new TextRun({ text: 'Assessment Factors:', bold: true, underline: {} })],
      })
    );

    // Assessment factor bullets
    cat.assessmentFactors.forEach(factor => {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun(factor)],
        })
      );
    });

    // Scoring Rationale heading
    paragraphs.push(
      new Paragraph({
        spacing: { before: 150, after: 80 },
        children: [new TextRun({ text: 'Scoring Rationale:', bold: true, underline: {} })],
      })
    );

    // Scoring rationale paragraph
    paragraphs.push(
      new Paragraph({
        spacing: { after: 300 },
        children: [new TextRun(cat.scoringRationale)],
      })
    );
  });

  return paragraphs;
}

function generateSummaryTable(assessment: OverallScoreAssessment): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Performance Score Summary', bold: true })],
    })
  );

  const headerShading = { fill: 'D1D5DB', type: ShadingType.CLEAR };
  const yellowShading = { fill: 'FEF08A', type: ShadingType.CLEAR };
  const colWidths = [3600, 1800, 1800, 2160];

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
          children: [new TextRun({ text, bold: true })],
        })],
      })
    ),
  });

  const dataRows = assessment.overallCategories.map(cat => {
    const weightedScore = (cat.weight / 100 * cat.score).toFixed(2);
    return new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: colWidths[0], type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun(cat.category)] })],
        }),
        new TableCell({
          borders,
          width: { size: colWidths[1], type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun(`${cat.weight}%`)],
          })],
        }),
        new TableCell({
          borders,
          width: { size: colWidths[2], type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun(String(cat.score))],
          })],
        }),
        new TableCell({
          borders,
          width: { size: colWidths[3], type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun(weightedScore)],
          })],
        }),
      ],
    });
  });

  // Totals row with yellow background
  const totalsRow = new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: colWidths[0], type: WidthType.DXA },
        shading: yellowShading,
        margins: cellMargins,
        children: [new Paragraph({
          children: [new TextRun({ text: 'OVERALL WEIGHTED SCORE', bold: true })],
        })],
      }),
      new TableCell({
        borders,
        width: { size: colWidths[1], type: WidthType.DXA },
        shading: yellowShading,
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '100%', bold: true })],
        })],
      }),
      new TableCell({
        borders,
        width: { size: colWidths[2], type: WidthType.DXA },
        shading: yellowShading,
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '-', bold: true })],
        })],
      }),
      new TableCell({
        borders,
        width: { size: colWidths[3], type: WidthType.DXA },
        shading: yellowShading,
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(assessment.overallScore), bold: true })],
        })],
      }),
    ],
  });

  elements.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [headerRow, ...dataRows, totalsRow],
    })
  );

  return elements;
}

function generatePerformanceRatingBox(assessment: OverallScoreAssessment): (Paragraph | Table)[] {
  // Light red background box for performance rating
  return [
    new Paragraph({ spacing: { before: 300 }, children: [] }),
    // Use a single-cell table to simulate a colored box
    ...createColoredBox(
      'FEF2F2',
      [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: 'Overall Performance Rating', bold: true, size: 28 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: assessment.performanceRating, bold: true, size: 32, color: '991B1B' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80 },
          children: [new TextRun({ text: `Score: ${assessment.overallScore}/100`, size: 24 })],
        }),
      ]
    ),
  ];
}

function generateDetailedScoreAnalysis(assessment: OverallScoreAssessment): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300 },
      children: [new TextRun({ text: 'Detailed Score Analysis', bold: true })],
    })
  );

  // Strengths
  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'Relative Strengths', bold: true })],
    })
  );

  for (const strength of assessment.detailedScoreAnalysis.strengths) {
    paragraphs.push(
      new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: `${strength.category} (Score: ${strength.score}/100)`, bold: true })],
      })
    );
    for (const bullet of strength.bullets) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'subbullets', level: 0 },
          children: [new TextRun(bullet)],
        })
      );
    }
  }

  // Weaknesses
  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'Critical Weaknesses', bold: true })],
    })
  );

  for (const weakness of assessment.detailedScoreAnalysis.weaknesses) {
    paragraphs.push(
      new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: `${weakness.category} (Score: ${weakness.score}/100)`, bold: true })],
      })
    );
    for (const bullet of weakness.bullets) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'subbullets', level: 0 },
          children: [new TextRun(bullet)],
        })
      );
    }
  }

  return paragraphs;
}

function generateScoreImplications(assessment: OverallScoreAssessment): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Score Implications', bold: true })],
    })
  );

  assessment.scoreImplications.forEach((imp, idx) => {
    paragraphs.push(
      new Paragraph({
        numbering: { reference: 'numbers', level: 0 },
        spacing: idx === assessment.scoreImplications.length - 1 ? { after: 300 } : undefined,
        children: [new TextRun(imp)],
      })
    );
  });

  return paragraphs;
}

function generatePathToImprovement(assessment: OverallScoreAssessment): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Path to Improvement', bold: true })],
    })
  );

  // Blue box for scenario
  elements.push(
    ...createColoredBox(
      'EFF6FF',
      [
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: 'Improvement Scenario', bold: true, size: 26 })],
        }),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun(assessment.pathToImprovement.scenario)],
        }),
        // Improvement details
        ...assessment.pathToImprovement.improvements.map(imp =>
          new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            children: [
              new TextRun({ text: `${imp.category}: `, bold: true }),
              new TextRun(`${imp.fromScore} \u2192 ${imp.toScore} (+${imp.weightedGain.toFixed(1)} weighted points) \u2014 ${imp.action}`),
            ],
          })
        ),
        new Paragraph({
          spacing: { before: 150 },
          children: [
            new TextRun({ text: 'Projected Score: ', bold: true, size: 26 }),
            new TextRun({ text: `${assessment.pathToImprovement.resultScore}/100`, bold: true, size: 26, color: '1E40AF' }),
          ],
        }),
      ]
    )
  );

  // Critical Success Factors
  if (assessment.criticalSuccessFactors.length > 0) {
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300 },
        children: [new TextRun({ text: 'Critical Success Factors', bold: true })],
      })
    );

    for (const factor of assessment.criticalSuccessFactors) {
      elements.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun(factor)],
        })
      );
    }
  }

  return elements;
}

function generateFinalAssessment(assessment: OverallScoreAssessment): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Final Assessment', bold: true })],
    })
  );

  // Yellow box for final assessment
  elements.push(
    ...createColoredBox(
      'FEFCE8',
      assessment.finalAssessmentParagraphs.map((para, idx) =>
        new Paragraph({
          spacing: idx < assessment.finalAssessmentParagraphs.length - 1 ? { after: 150 } : undefined,
          children: [new TextRun({ text: para, bold: true })],
        })
      )
    )
  );

  return elements;
}

function generateBoardActionRequired(assessment: OverallScoreAssessment): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300 },
      children: [new TextRun({ text: 'Board Action Required', bold: true })],
    })
  );

  // Red box for board action
  elements.push(
    ...createColoredBox(
      'FEE2E2',
      [
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: 'IMMEDIATE ACTION REQUIRED', bold: true, color: '991B1B', size: 26 })],
        }),
        ...assessment.boardActionRequired.map(action =>
          new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            children: [new TextRun({ text: action, bold: true })],
          })
        ),
      ]
    )
  );

  return elements;
}

/**
 * Creates a colored box using a single-cell table with background shading.
 */
function createColoredBox(fillColor: string, children: Paragraph[]): Table[] {
  const boxBorder = { style: BorderStyle.SINGLE, size: 1, color: fillColor };
  return [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: boxBorder, bottom: boxBorder, left: boxBorder, right: boxBorder },
              width: { size: 9360, type: WidthType.DXA },
              shading: { fill: fillColor, type: ShadingType.CLEAR },
              margins: { top: 200, bottom: 200, left: 300, right: 300 },
              children,
            }),
          ],
        }),
      ],
    }),
  ];
}
