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
}

export interface KPIDataForReport {
  kpiCode: string;
  kpiName: string;
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
}