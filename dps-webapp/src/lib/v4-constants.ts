/**
 * DPS v4 Spec Constants
 * Centralizes all v4 scoring framework constants, KPI mappings, colors, and rules.
 */

// --- 4-Category Weighted Scoring Framework (Section 4.1) ---

export const V4_SCORING_CATEGORIES = [
  { category: 'Financial Performance', weight: 30 },
  { category: 'Operational Efficiency & Expense Management', weight: 25 },
  { category: 'Market Position & Customer Satisfaction', weight: 20 },
  { category: 'Financial Health & Stability', weight: 25 },
] as const;

// --- KPI-to-Category Mapping (Section 4.2) ---

export const KPI_TO_CATEGORY_MAP: Record<string, string> = {
  // Category 1 — Financial Performance (30%)
  OVERALL_NET_SALES: 'Financial Performance',
  OVERALL_GROSS_MARGIN: 'Financial Performance',
  ABC_PRODUCT_GROSS_MARGIN: 'Financial Performance',
  NET_OPERATING_PROFIT: 'Financial Performance',
  NET_OPERATING_PROFIT_PCT: 'Financial Performance',
  NET_INCOME_AFTER_TAX: 'Financial Performance',
  NET_INCOME_PCT: 'Financial Performance',
  TOTAL_ABSORPTION: 'Financial Performance',
  // Department-level gross margin and sales KPIs
  NEW_ABC_GROSS_MARGIN: 'Financial Performance',
  NEW_ABC_NET_SALES: 'Financial Performance',
  NEW_ABC_UNITS_SOLD: 'Financial Performance',
  USED_ABC_GROSS_MARGIN: 'Financial Performance',
  USED_ABC_NET_SALES: 'Financial Performance',
  TOTAL_USED_GROSS_MARGIN: 'Financial Performance',
  PA_GROSS_MARGIN: 'Financial Performance',
  ABC_PA_GROSS_MARGIN: 'Financial Performance',
  AL_GROSS_MARGIN: 'Financial Performance',
  ABC_AL_GROSS_MARGIN: 'Financial Performance',
  SERVICE_GROSS_MARGIN: 'Financial Performance',
  SERVICE_LABOR_GROSS_MARGIN: 'Financial Performance',
  FI_TOTAL_SALES: 'Financial Performance',

  // Category 2 — Operational Efficiency & Expense Management (25%)
  ROA: 'Operational Efficiency & Expense Management',
  EMPLOYEE_WAGES_PCT: 'Operational Efficiency & Expense Management',
  GM_ADMIN_WAGES_PCT: 'Operational Efficiency & Expense Management',
  OPERATING_EXPENSES_PCT: 'Operational Efficiency & Expense Management',
  ADVERTISING_PER_UNIT: 'Operational Efficiency & Expense Management',
  ADVERTISING_PCT_SALES: 'Operational Efficiency & Expense Management',
  PROFICIENCY: 'Operational Efficiency & Expense Management',
  EFFICIENCY: 'Operational Efficiency & Expense Management',
  EFFECTIVE_SELLING_RATE: 'Operational Efficiency & Expense Management',
  LABOR_SALES_PER_RO: 'Operational Efficiency & Expense Management',
  ABC_PA_INVENTORY_TURNS: 'Operational Efficiency & Expense Management',
  ABC_AL_INVENTORY_TURNS: 'Operational Efficiency & Expense Management',
  ABC_PA_NONMOVING_INVENTORY: 'Operational Efficiency & Expense Management',
  ABC_AL_NONMOVING_INVENTORY: 'Operational Efficiency & Expense Management',
  ABC_AL_SEASONAL_SELLTHROUGH: 'Operational Efficiency & Expense Management',

  // Category 3 — Market Position & Customer Satisfaction (20%)
  NEW_ABC_CONTRIBUTION_DAT: 'Market Position & Customer Satisfaction',
  MARKET_SHARE_601CC: 'Market Position & Customer Satisfaction',
  CXI_NPS: 'Market Position & Customer Satisfaction',

  // Category 4 — Financial Health & Stability (25%)
  CURRENT_RATIO: 'Financial Health & Stability',
  DEBT_EQUITY_RATIO: 'Financial Health & Stability',
  DEBT_TNW_RATIO: 'Financial Health & Stability',
};

// --- Cross-Department Relationships (Section 5) ---

export const CROSS_DEPT_RELATIONSHIPS: Record<string, string> = {
  FI: 'F&I contract sales volume is directly linked to the number of new and used ABC-Moto units retailed. Include explicit analysis of how unit volume performance has impacted F&I results.',
  PA: 'P&A sales are directly linked to the number of new and used ABC-Moto units retailed (both as direct sales at delivery and as ongoing aftermarket demand). Include explicit analysis of this relationship.',
  AL: 'Apparel & Licensing sales are directly linked to the number of new and used ABC-Moto units retailed. Include explicit analysis of this relationship.',
  SERVICE: 'Service demand (labour and parts throughput) is directly linked to the vehicle parc built from new and used unit sales. Include explicit analysis of how unit volume trends are affecting service department capacity utilization.',
};

// --- Mandatory Word Replacements (Section 9) ---

const WORD_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bCatastrophic\b/gi, replacement: 'significantly substandard' },
  { pattern: /\bFailure\b/gi, replacement: 'substantial issues' },
  { pattern: /\bFailing\b/gi, replacement: 'underperforming' },
  { pattern: /\bCollapsed\b/gi, replacement: 'declined' },
  { pattern: /\bCollapse\b/gi, replacement: 'decline' },
];

export function applyWordReplacements(text: string): string {
  let result = text;
  for (const { pattern, replacement } of WORD_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// --- Brand Color Constants (Section 8.4) ---

export const V4_COLORS = {
  DARK_BLUE: '1F3864',
  ACCENT_BLUE: '2E75B6',
  LIGHT_BLUE: 'D6E4F0',
  ROW_ALT: 'EBF3FB',
  GREEN_BG: 'D5F5E3',
  YELLOW_BG: 'FEF9E7',
  RED_BG: 'FADBD8',
  ORANGE_BG: 'FDEBD0',
  BLUE_BG: 'D6EAF8',
} as const;

// --- Score Table Conditional Shading (Section 8.5) ---

export function getScoreShading(score: number): { fill: string; textColor: string } {
  if (score >= 75) return { fill: V4_COLORS.GREEN_BG, textColor: '1E8449' };
  if (score >= 60) return { fill: V4_COLORS.YELLOW_BG, textColor: '9A7D0A' };
  return { fill: V4_COLORS.RED_BG, textColor: 'CB4335' };
}

// --- Verdict Cell Shading ---

export function getVerdictShading(verdict: string): { fill: string } {
  switch (verdict) {
    case 'EXCEPTIONAL':
      return { fill: V4_COLORS.BLUE_BG };
    case 'GREAT':
    case 'GOOD':
      return { fill: V4_COLORS.GREEN_BG };
    case 'ACCEPTABLE':
      return { fill: V4_COLORS.YELLOW_BG };
    case 'WEAK':
      return { fill: V4_COLORS.ORANGE_BG };
    case 'SUBSTANDARD':
      return { fill: V4_COLORS.RED_BG };
    case 'SIZE':
      return { fill: V4_COLORS.LIGHT_BLUE };
    default:
      return { fill: 'FFFFFF' };
  }
}

// --- Approved KPI Codes per Department (Section 7) ---

export const APPROVED_KPI_CODES: Record<string, string[]> = {
  OVERALL: [
    'OVERALL_NET_SALES', 'OVERALL_GROSS_MARGIN', 'ABC_PRODUCT_GROSS_MARGIN',
    'EMPLOYEE_WAGES_PCT', 'GM_ADMIN_WAGES_PCT', 'ADVERTISING_PER_UNIT',
    'ADVERTISING_PCT_SALES', 'OPERATING_EXPENSES_PCT', 'NET_OPERATING_PROFIT',
    'NET_OPERATING_PROFIT_PCT', 'NET_INCOME_AFTER_TAX', 'NET_INCOME_PCT',
    'TOTAL_ABSORPTION', 'CXI_NPS', 'NEW_ABC_CONTRIBUTION_DAT',
    'MARKET_SHARE_601CC', 'CURRENT_RATIO', 'DEBT_EQUITY_RATIO',
    'DEBT_TNW_RATIO', 'ROA',
  ],
  NEW_VEHICLE: [
    'NEW_ABC_UNITS_SOLD', 'NEW_ABC_NET_SALES', 'NEW_ABC_GROSS_MARGIN',
    'NEW_ABC_AVG_SELLING_PRICE', 'ABC1_PERFORMANCE_REWARDS',
    'NEW_OTHER_UNITS_SOLD', 'NEW_OTHER_NET_SALES', 'NEW_OTHER_GROSS_MARGIN',
  ],
  USED_VEHICLE: [
    'USED_ABC_UNITS_SOLD', 'USED_ABC_NET_SALES', 'USED_ABC_GROSS_MARGIN',
    'USED_ABC_AVG_SELLING_PRICE', 'NEW_USED_RATIO_ABC',
    'USED_NONABC_UNITS_SOLD', 'USED_NONABC_NET_SALES', 'USED_NONABC_GROSS_MARGIN',
    'TOTAL_USED_UNITS_SOLD', 'TOTAL_USED_NET_SALES', 'TOTAL_USED_GROSS_MARGIN',
  ],
  FI: [
    'FI_TOTAL_SALES', 'FI_GROSS_PROFIT_PTUR', 'ABCFS_FI_INCOME_PNUHMR',
    'ABCFS_FI_GROSS_PROFIT_PNUHMR', 'ABCFS_ESP_PENETRATION',
    'ABCFS_RETAIL_FINANCE_PENETRATION', 'LIFE_DISABILITY_PENETRATION',
  ],
  PA: [
    'PA_TOTAL_SALES', 'PA_GROSS_MARGIN', 'ABC_PA_TOTAL_SALES',
    'ABC_PA_GROSS_MARGIN', 'PA_NET_SALES_PTUR', 'ABC_PA_NET_SALES_PNHMR',
    'ABC_PA_INVENTORY_TURNS', 'ABC_PA_NONMOVING_INVENTORY',
  ],
  AL: [
    'AL_TOTAL_SALES', 'AL_GROSS_MARGIN', 'ABC_AL_TOTAL_SALES',
    'ABC_AL_GROSS_MARGIN', 'AL_NET_SALES_PTUR', 'ABC_AL_NET_SALES_PNHMR',
    'ABC_AL_SEASONAL_SELLTHROUGH', 'ABC_AL_INVENTORY_TURNS',
    'ABC_AL_NONMOVING_INVENTORY',
  ],
  SERVICE: [
    'SERVICE_NET_SALES', 'SERVICE_GROSS_MARGIN', 'SERVICE_LABOR_NET_SALES',
    'SERVICE_LABOR_GROSS_MARGIN', 'LABOR_REVENUE_PTUR', 'SERVICE_SALES_PTUR',
    'SERVICE_PA_TO_LABOR_RATIO', 'PROFICIENCY', 'EFFICIENCY',
    'RO_PER_TECH_PER_DAY', 'EFFECTIVE_SELLING_RATE', 'LABOR_SALES_PER_RO',
  ],
};

// --- Size KPI Codes (no benchmark scoring, context only) ---

export const SIZE_KPI_CODES = new Set([
  'OVERALL_NET_SALES',
  'ADVERTISING_PER_UNIT',
  'ADVERTISING_PCT_SALES',
  'NET_OPERATING_PROFIT',
  'NET_INCOME_AFTER_TAX',
  'NET_INCOME_PCT',
  'DEBT_EQUITY_RATIO',
  'DEBT_TNW_RATIO',
  'NEW_ABC_UNITS_SOLD',
  'NEW_ABC_NET_SALES',
  'NEW_ABC_AVG_SELLING_PRICE',
  'ABC1_PERFORMANCE_REWARDS',
  'NEW_OTHER_UNITS_SOLD',
  'NEW_OTHER_NET_SALES',
  'USED_ABC_UNITS_SOLD',
  'USED_ABC_NET_SALES',
  'USED_ABC_AVG_SELLING_PRICE',
  'NEW_USED_RATIO_ABC',
  'USED_NONABC_UNITS_SOLD',
  'USED_NONABC_NET_SALES',
  'TOTAL_USED_UNITS_SOLD',
  'TOTAL_USED_NET_SALES',
  'FI_TOTAL_SALES',
  'FI_GROSS_PROFIT_PTUR',
  'ABCFS_FI_INCOME_PNUHMR',
  'ABCFS_FI_GROSS_PROFIT_PNUHMR',
  'PA_TOTAL_SALES',
  'ABC_PA_TOTAL_SALES',
  'PA_NET_SALES_PTUR',
  'ABC_PA_NET_SALES_PNHMR',
  'AL_TOTAL_SALES',
  'ABC_AL_TOTAL_SALES',
  'AL_NET_SALES_PTUR',
  'ABC_AL_NET_SALES_PNHMR',
  'SERVICE_NET_SALES',
  'SERVICE_LABOR_NET_SALES',
  'LABOR_REVENUE_PTUR',
  'SERVICE_SALES_PTUR',
  'SERVICE_PA_TO_LABOR_RATIO',
  'RO_PER_TECH_PER_DAY',
]);

// --- Inventory Turns KPIs (Section 3.5) ---

export const INVENTORY_TURNS_KPIS = {
  PA: 'ABC_PA_INVENTORY_TURNS',
  AL: 'ABC_AL_INVENTORY_TURNS',
} as const;

export const INVENTORY_TURNS_DIMINISHING_THRESHOLD = 4.5;

// P&A gets -10% tolerance grace; A&L does NOT
export function getInventoryTurnsMetadata(
  kpiCode: string,
  value: number,
  benchmarkMin: number | null | undefined,
  benchmarkMax: number | null | undefined
): { diminishingReturns: boolean; recommendPAMTool: boolean; toleranceGraceApplied: boolean } | null {
  if (kpiCode !== INVENTORY_TURNS_KPIS.PA && kpiCode !== INVENTORY_TURNS_KPIS.AL) {
    return null;
  }

  const diminishingReturns = value > INVENTORY_TURNS_DIMINISHING_THRESHOLD;
  const isGreatOrAbove = benchmarkMax != null && value >= benchmarkMax;
  const recommendPAMTool = !isGreatOrAbove;

  let toleranceGraceApplied = false;
  if (kpiCode === INVENTORY_TURNS_KPIS.PA && benchmarkMin != null) {
    // -10% tolerance: if within 10% below min, treat as GOOD
    const toleranceThreshold = benchmarkMin * 0.9;
    if (value >= toleranceThreshold && value < benchmarkMin) {
      toleranceGraceApplied = true;
    }
  }

  return { diminishingReturns, recommendPAMTool, toleranceGraceApplied };
}

// --- Canadian Market Leniency (Section 4.4) ---

export const CANADIAN_MARKET_LENIENCY_INSTRUCTION = `IMPORTANT: In view of the documented challenges in the Canadian market in 2025 — including tariff-driven cost pressure, consumer anti-American product sentiment, threats of US annexation affecting brand perception, and increasingly high-priced ABC-Moto products — apply a MORE LENIENT and GENEROUS level of scoring at all levels across all categories. This leniency should be referenced explicitly in the report where applied.`;
