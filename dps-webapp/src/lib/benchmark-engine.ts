import { BenchmarkScore } from '@prisma/client';
import { SIZE_KPI_CODES, getInventoryTurnsMetadata } from './v4-constants';

export interface InventoryTurnsMetadata {
  diminishingReturns: boolean;
  recommendPAMTool: boolean;
  toleranceGraceApplied: boolean;
}

export interface BenchmarkResult {
  score: BenchmarkScore;
  inventoryTurnsMetadata?: InventoryTurnsMetadata | null;
}

export function calculateBenchmarkScore(
  percentOfBClass: number,
  currentValue: number,
  rulesetType: string,
  benchmarkMin?: number | null,
  benchmarkMax?: number | null,
  kpiCode?: string
): BenchmarkScore {
  // Size KPIs get SIZE verdict — no benchmark scoring
  if (kpiCode && SIZE_KPI_CODES.has(kpiCode)) {
    return BenchmarkScore.SIZE;
  }

  // Inventory turns special handling
  if (kpiCode) {
    const invMeta = getInventoryTurnsMetadata(kpiCode, currentValue, benchmarkMin, benchmarkMax);
    if (invMeta?.toleranceGraceApplied) {
      return BenchmarkScore.GOOD;
    }
  }

  switch (rulesetType) {
    case 'ZZZ':
      return BenchmarkScore.NA;
    case 'A':
      return applyRulesetA(percentOfBClass);
    case 'B':
      return applyRulesetB(percentOfBClass);
    case 'C':
      return applyRulesetC(percentOfBClass);
    case 'D':
      return applyRulesetD(currentValue);
    case 'E':
      return applyRulesetE(percentOfBClass);
    case 'F':
      return applyRulesetF(currentValue, benchmarkMin, benchmarkMax);
    case 'G':
      return applyRulesetG(currentValue, benchmarkMin, benchmarkMax);
    default:
      return BenchmarkScore.NA;
  }
}

// Ruleset A - Overall Income-Type (vs Volume Class)
// Higher % of class = better
function applyRulesetA(pctOfClass: number): BenchmarkScore {
  if (pctOfClass < 0.93) return BenchmarkScore.SUBSTANDARD;
  if (pctOfClass < 1.10) return BenchmarkScore.ACCEPTABLE;
  if (pctOfClass < 1.20) return BenchmarkScore.GREAT;
  return BenchmarkScore.EXCEPTIONAL;
}

// Ruleset B - Overall Expense-Type (vs Volume Class)
// Lower % of class = better
function applyRulesetB(pctOfClass: number): BenchmarkScore {
  if (pctOfClass < 0.90) return BenchmarkScore.EXCEPTIONAL;
  if (pctOfClass < 0.95) return BenchmarkScore.GOOD;
  if (pctOfClass < 1.05) return BenchmarkScore.ACCEPTABLE;
  if (pctOfClass < 1.15) return BenchmarkScore.WEAK;
  return BenchmarkScore.SUBSTANDARD;
}

// Ruleset C - Market Position (vs Volume Class)
// Higher % = better market position
function applyRulesetC(pctOfClass: number): BenchmarkScore {
  if (pctOfClass < 0.90) return BenchmarkScore.SUBSTANDARD;
  if (pctOfClass < 0.95) return BenchmarkScore.WEAK;
  if (pctOfClass < 1.05) return BenchmarkScore.ACCEPTABLE;
  if (pctOfClass < 1.15) return BenchmarkScore.GOOD;
  return BenchmarkScore.GREAT;
}

// Ruleset D - Current Ratio (Absolute Values)
// Special: too high is also bad
function applyRulesetD(value: number): BenchmarkScore {
  if (value < 0.7) return BenchmarkScore.SUBSTANDARD;
  if (value < 1.0) return BenchmarkScore.WEAK;
  if (value < 2.0) return BenchmarkScore.ACCEPTABLE;
  if (value < 2.8) return BenchmarkScore.GOOD;
  return BenchmarkScore.SUBSTANDARD; // Too high
}

// Ruleset E - ROA Scoring
function applyRulesetE(pctOfClass: number): BenchmarkScore {
  if (pctOfClass < 0.90) return BenchmarkScore.SUBSTANDARD;
  if (pctOfClass < 1.20) return BenchmarkScore.ACCEPTABLE;
  return BenchmarkScore.EXCEPTIONAL;
}

// Ruleset F - Department Income-Type (Min/Max)
// Higher is better
function applyRulesetF(
  value: number,
  min?: number | null,
  max?: number | null
): BenchmarkScore {
  if (min == null || max == null) return BenchmarkScore.NA;
  if (value < min) return BenchmarkScore.SUBSTANDARD;
  if (value < max) return BenchmarkScore.GOOD;
  return BenchmarkScore.GREAT;
}

// Ruleset G - Department Expense-Type (Min/Max)
// Lower is better
function applyRulesetG(
  value: number,
  min?: number | null,
  max?: number | null
): BenchmarkScore {
  if (min == null || max == null) return BenchmarkScore.NA;
  if (value < min) return BenchmarkScore.GREAT;
  if (value < max) return BenchmarkScore.GOOD;
  return BenchmarkScore.SUBSTANDARD;
}

export function getBenchmarkScoreLabel(score: BenchmarkScore): string {
  const labels: Record<BenchmarkScore, string> = {
    EXCEPTIONAL: 'Exceptional',
    GREAT: 'Great',
    GOOD: 'Good',
    ACCEPTABLE: 'Acceptable',
    WEAK: 'Weak',
    SUBSTANDARD: 'Substandard',
    SIZE: 'Size',
    NA: 'N/A',
  };
  return labels[score] || 'N/A';
}
