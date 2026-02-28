export interface ParsedCSVRow {
  department: string;
  description: string;
  currentValue: number;
  yoyChangeAbsolute: number;
  yoyChangePercent: number;
  bClassAverage: number;
  bClassYoyChange: number;
  percentOfBClass: number;
  nationalAverage: number;
  nationalYoyChange: number;
  percentOfNational: number;
}

export interface ParsedCSVData {
  dealerCode: string;
  dealerName: string;
  periodStart: string;
  periodEnd: string;
  rows: ParsedCSVRow[];
  classLabel: string;
}

export interface PerformanceScoreCategory {
  category: string;
  weight: number;
  score: number;
  bullets: string[];
}

export interface AIAssessment {
  executiveSummary: string;
  departmentContext?: string;
  kpiAssessments: Array<{
    kpiCode: string;
    assessment: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  criticalSummary: string;
  performanceScoreAssessment?: string;
  performanceScoreCategories?: PerformanceScoreCategory[];
}

export interface DepartmentalAssessmentInput {
  reportCode: string;       // 'DPS-01' .. 'DPS-07'
  departmentName: string;   // e.g. 'New Vehicle Sales'
  assessment: AIAssessment; // The stored aiAssessment JSON
}

export interface KPIDataForReport {
  kpiCode: string;
  kpiName: string;
  csvDescription?: string;
  dataFormat: string;
  currentValue: number;
  priorYearValue?: number | null;
  yoyChangeAbsolute?: number | null;
  yoyChangePercent?: number | null;
  bClassAverage?: number | null;
  bClassYoyChange?: number | null;
  percentOfBClass?: number | null;
  nationalAverage?: number | null;
  nationalYoyChange?: number | null;
  percentOfNational?: number | null;
  benchmarkScore?: string | null;
  benchmarkMin?: number | null;
  benchmarkMax?: number | null;
  higherIsBetter: boolean;
  classLabel?: string;
}

export interface OverallScoreCategory {
  category: string;
  weight: number;
  score: number;
  assessmentFactors: string[];
  scoringRationale: string;
}

export interface OverallScoreAssessment extends AIAssessment {
  reportType: 'OVERALL_SCORECARD';
  introductionParagraph: string;
  overallCategories: OverallScoreCategory[];
  overallScore: number;
  performanceRating: string;
  detailedScoreAnalysis: {
    strengths: Array<{ category: string; score: number; bullets: string[] }>;
    weaknesses: Array<{ category: string; score: number; bullets: string[] }>;
  };
  scoreImplications: string[];
  pathToImprovement: {
    scenario: string;
    improvements: Array<{ category: string; fromScore: number; toScore: number; weightedGain: number; action: string }>;
    resultScore: number;
  };
  criticalSuccessFactors: string[];
  finalAssessmentParagraphs: string[];
  boardActionRequired: string[];
}