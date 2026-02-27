import { PrismaClient, DataFormat } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // DEPARTMENTS
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'OVERALL' },
      update: {},
      create: { code: 'OVERALL', name: 'Financial Performance', displayOrder: 1 }
    }),
    prisma.department.upsert({
      where: { code: 'NEW_VEHICLE' },
      update: {},
      create: { code: 'NEW_VEHICLE', name: 'New Vehicle Sales', displayOrder: 2 }
    }),
    prisma.department.upsert({
      where: { code: 'USED_VEHICLE' },
      update: {},
      create: { code: 'USED_VEHICLE', name: 'Used Vehicle Sales', displayOrder: 3 }
    }),
    prisma.department.upsert({
      where: { code: 'FI' },
      update: {},
      create: { code: 'FI', name: 'F&I Sales', displayOrder: 4 }
    }),
    prisma.department.upsert({
      where: { code: 'PA' },
      update: {},
      create: { code: 'PA', name: 'P&A Sales', displayOrder: 5 }
    }),
    prisma.department.upsert({
      where: { code: 'AL' },
      update: {},
      create: { code: 'AL', name: 'A&L Sales', displayOrder: 6 }
    }),
    prisma.department.upsert({
      where: { code: 'SERVICE' },
      update: {},
      create: { code: 'SERVICE', name: 'Service Sales', displayOrder: 7 }
    }),
  ]);

  const deptMap = Object.fromEntries(departments.map(d => [d.code, d.id]));

  // RULESET TYPES
  await Promise.all([
    prisma.rulesetType.upsert({
      where: { id: 'ZZZ' },
      update: {},
      create: {
        id: 'ZZZ',
        name: 'No Benchmark Scoring',
        description: 'Comparison data only',
        logic: 'N/A',
        isScored: false
      }
    }),
    prisma.rulesetType.upsert({
      where: { id: 'A' },
      update: {},
      create: {
        id: 'A',
        name: 'Overall Income-Type',
        description: 'Higher % of volume class = better',
        logic: '<93%: Substandard, 93-110%: Acceptable, 110-120%: Great, ≥120%: Exceptional',
        isScored: true
      }
    }),
    prisma.rulesetType.upsert({
      where: { id: 'B' },
      update: {},
      create: {
        id: 'B',
        name: 'Overall Expense-Type',
        description: 'Lower % of volume class = better',
        logic: '<90%: Exceptional, 90-95%: Good, 95-105%: Acceptable, 105-115%: Weak, ≥115%: Substandard',
        isScored: true
      }
    }),
    prisma.rulesetType.upsert({
      where: { id: 'C' },
      update: {},
      create: {
        id: 'C',
        name: 'Market Position',
        description: 'Higher % contribution = better',
        logic: '<90%: Poor, 90-95%: Weak, 95-105%: Acceptable, 105-115%: Good, ≥115%: Great',
        isScored: true
      }
    }),
    prisma.rulesetType.upsert({
      where: { id: 'D' },
      update: {},
      create: {
        id: 'D',
        name: 'Current Ratio',
        description: 'Absolute value ranges',
        logic: '<0.7: Substandard, 0.7-1.0: Weak, 1.0-2.0: Acceptable, 2.0-2.8: Good, ≥2.8: Substandard',
        isScored: true
      }
    }),
    prisma.rulesetType.upsert({
      where: { id: 'E' },
      update: {},
      create: {
        id: 'E',
        name: 'ROA Scoring',
        description: 'Simplified ROA thresholds',
        logic: '<90%: Substandard, 90-120%: Acceptable, ≥120%: Exceptional',
        isScored: true
      }
    }),
    prisma.rulesetType.upsert({
      where: { id: 'F' },
      update: {},
      create: {
        id: 'F',
        name: 'Department Income-Type',
        description: 'Min/Max thresholds - higher is better',
        logic: '<Min: Substandard, Min-Max: Good, ≥Max: Excellent',
        isScored: true
      }
    }),
    prisma.rulesetType.upsert({
      where: { id: 'G' },
      update: {},
      create: {
        id: 'G',
        name: 'Department Expense-Type',
        description: 'Min/Max thresholds - lower is better',
        logic: '<Min: Excellent, Min-Max: Good, ≥Max: Substandard',
        isScored: true
      }
    }),
  ]);

  // RULESET THRESHOLD CONFIGS
  await Promise.all([
    prisma.rulesetThresholdConfig.upsert({
      where: { id: 'threshold-A' },
      update: {},
      create: { id: 'threshold-A', rulesetTypeId: 'A', thresholds: { substandard: 0.93, acceptable: 1.10, great: 1.20 } }
    }),
    prisma.rulesetThresholdConfig.upsert({
      where: { id: 'threshold-B' },
      update: {},
      create: { id: 'threshold-B', rulesetTypeId: 'B', thresholds: { exceptional: 0.90, good: 0.95, acceptable: 1.05, weak: 1.15 } }
    }),
    prisma.rulesetThresholdConfig.upsert({
      where: { id: 'threshold-C' },
      update: {},
      create: { id: 'threshold-C', rulesetTypeId: 'C', thresholds: { poor: 0.90, weak: 0.95, acceptable: 1.05, good: 1.15 } }
    }),
    prisma.rulesetThresholdConfig.upsert({
      where: { id: 'threshold-D' },
      update: {},
      create: { id: 'threshold-D', rulesetTypeId: 'D', thresholds: { substandard_low: 0.7, weak: 1.0, acceptable: 2.0, good: 2.8 } }
    }),
    prisma.rulesetThresholdConfig.upsert({
      where: { id: 'threshold-E' },
      update: {},
      create: { id: 'threshold-E', rulesetTypeId: 'E', thresholds: { substandard: 0.90, acceptable: 1.20 } }
    }),
  ]);

  // KPI DEFINITIONS - Overall (20)
  const overallKpis = [
    { kpiCode: 'OVERALL_NET_SALES', kpiName: 'Net Sales', csvDescription: 'Overall Dealership Net Sales', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 1 },
    { kpiCode: 'OVERALL_GROSS_MARGIN', kpiName: 'Gross Margin %', csvDescription: 'Overall Dealership Gross Margin %', rulesetTypeId: 'A', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 2 },
    { kpiCode: 'ABC_PRODUCT_GROSS_MARGIN', kpiName: 'Total ABC Product Gross Margin %', csvDescription: 'Total ABC Product Gross Margin % (Excl. Service Labour)', rulesetTypeId: 'A', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 3 },
    { kpiCode: 'EMPLOYEE_WAGES_PCT', kpiName: 'Employee Wages as % of Sales', csvDescription: 'Employee Wages as a % of Overall Dealership Sales', rulesetTypeId: 'B', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: false, displayOrder: 4 },
    { kpiCode: 'GM_ADMIN_WAGES_PCT', kpiName: 'GM & Admin Wages as % of Sales', csvDescription: 'General Management & Admin. Wages as a % of Overall Dealership Sales', rulesetTypeId: 'B', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: false, displayOrder: 5 },
    { kpiCode: 'ADVERTISING_PER_UNIT', kpiName: 'Advertising $ Per Unit Sold', csvDescription: 'Advertising Dollars Per Unit Sold', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: false, displayOrder: 6 },
    { kpiCode: 'ADVERTISING_PCT_SALES', kpiName: 'Advertising as % of Net Sales', csvDescription: 'Advertising as a % of Net Sales', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: false, displayOrder: 7 },
    { kpiCode: 'OPERATING_EXPENSES_PCT', kpiName: 'Operating Expenses as % of Sales', csvDescription: 'Total Operating Expenses as % of Net Sales', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: false, displayOrder: 8 },
    { kpiCode: 'NET_OPERATING_PROFIT', kpiName: 'Net Operating Profit ($)', csvDescription: 'Net Operating Profit Before Taxes and Non-Operating Income/Expenses ($)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 9 },
    { kpiCode: 'NET_OPERATING_PROFIT_PCT', kpiName: 'Net Operating Profit % (ROS)', csvDescription: 'Net Operating Profit as a % of Net Sales (RETURN ON SALES)', rulesetTypeId: 'A', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 10 },
    { kpiCode: 'NET_INCOME_AFTER_TAX', kpiName: 'Net Income After Taxes ($)', csvDescription: 'Net Income (Loss) After Taxes ($)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 11 },
    { kpiCode: 'NET_INCOME_PCT', kpiName: 'Net Income as % of Sales', csvDescription: 'Net Income (Loss) After Taxes as % of Sales', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 12 },
    { kpiCode: 'TOTAL_ABSORPTION', kpiName: 'Total Absorption', csvDescription: 'Total Absorption', rulesetTypeId: 'A', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 13 },
    { kpiCode: 'CXI_NPS', kpiName: 'CXI Net Promoter Score', csvDescription: 'CXI Net Promoter Score (NPS)', rulesetTypeId: 'A', dataFormat: DataFormat.SCORE, higherIsBetter: true, displayOrder: 14 },
    { kpiCode: 'NEW_ABC_CONTRIBUTION_DAT', kpiName: 'New ABC Sales % Contribution', csvDescription: 'New ABC Sales % Contribution within DAT', rulesetTypeId: 'C', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 15 },
    { kpiCode: 'MARKET_SHARE_601CC', kpiName: 'Market Share % (601cc+)', csvDescription: 'Total Brand Market Share % within DAT (601cc+)', rulesetTypeId: 'C', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 16 },
    { kpiCode: 'CURRENT_RATIO', kpiName: 'Current Ratio', csvDescription: 'Current Ratio', rulesetTypeId: 'D', dataFormat: DataFormat.RATIO, higherIsBetter: true, displayOrder: 17 },
    { kpiCode: 'DEBT_EQUITY_RATIO', kpiName: 'Debt/Equity Ratio', csvDescription: 'Debt / Equity Ratio', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.RATIO, higherIsBetter: false, displayOrder: 18 },
    { kpiCode: 'DEBT_TNW_RATIO', kpiName: 'Debt to TNW Ratio', csvDescription: 'Debt to TNW Ratio', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.RATIO, higherIsBetter: false, displayOrder: 19 },
    { kpiCode: 'ROA', kpiName: 'Return on Operating Assets (ROA)', csvDescription: 'Return on Operating Assets - YTD (ROA)', rulesetTypeId: 'E', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 20 },
  ];

  // New Vehicle KPIs (8)
  const newVehicleKpis = [
    { kpiCode: 'NEW_ABC_UNITS_SOLD', kpiName: '# of New ABC Motorcycles Sold', csvDescription: '# of New ABC Motorcycles Sold', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.NUMBER, higherIsBetter: true, displayOrder: 1 },
    { kpiCode: 'NEW_ABC_NET_SALES', kpiName: 'New ABC Motorcycle Net Sales $', csvDescription: 'New ABC Motorcycle Net Sales $', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 2 },
    { kpiCode: 'NEW_ABC_GROSS_MARGIN', kpiName: 'New ABC MC Gross Margin %', csvDescription: 'New ABC MC Gross Margin %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.13, benchmarkMax: 0.15, displayOrder: 3 },
    { kpiCode: 'NEW_ABC_AVG_SELLING_PRICE', kpiName: 'New ABC MC Average Selling Price', csvDescription: 'New ABC MC Average Selling Price', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 4 },
    { kpiCode: 'ABC1_PERFORMANCE_REWARDS', kpiName: 'ABC 1 Performance Rewards Earned', csvDescription: 'ABC 1 Performance Rewards Earned', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 5 },
    { kpiCode: 'NEW_OTHER_UNITS_SOLD', kpiName: '# of New Other MC/Vehicles Sold', csvDescription: '# of New Other (NON ABC) MC/Vehicles/Units Sold', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.NUMBER, higherIsBetter: true, displayOrder: 6 },
    { kpiCode: 'NEW_OTHER_NET_SALES', kpiName: 'New Other MC/Vehicles Net Sales $', csvDescription: 'New Other (NON ABC) MC/Vehicles/Units Net Sales $', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 7 },
    { kpiCode: 'NEW_OTHER_GROSS_MARGIN', kpiName: 'New Other MC/Vehicles Gross Margin %', csvDescription: 'New Other (NON ABC) MC/Vehicles/Units Gross Margin %', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 8 },
  ];

  // Used Vehicle KPIs (11)
  const usedVehicleKpis = [
    { kpiCode: 'USED_ABC_UNITS_SOLD', kpiName: '# of Used ABC MC Sold', csvDescription: '# of Used ABC MC Sold', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.NUMBER, higherIsBetter: true, displayOrder: 1 },
    { kpiCode: 'USED_ABC_NET_SALES', kpiName: 'Used ABC MC Net Sales $', csvDescription: 'Used ABC MC Net Sales $', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 2 },
    { kpiCode: 'USED_ABC_GROSS_MARGIN', kpiName: 'Used ABC Gross Margin %', csvDescription: 'Used ABC Gross Margin %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.11, benchmarkMax: 0.135, displayOrder: 3 },
    { kpiCode: 'USED_ABC_AVG_SELLING_PRICE', kpiName: 'Used ABC MC Average Selling Price', csvDescription: 'Used ABC MC Average Selling Price', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 4 },
    { kpiCode: 'NEW_USED_RATIO_ABC', kpiName: 'New:Used Ratio (ABC)', csvDescription: 'New:Used Ratio (ABC)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.RATIO, higherIsBetter: true, displayOrder: 5 },
    { kpiCode: 'USED_NONABC_UNITS_SOLD', kpiName: '# of Used NON-ABC MC Sold', csvDescription: '# of Used NON-ABC MC Sold', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.NUMBER, higherIsBetter: true, displayOrder: 6 },
    { kpiCode: 'USED_NONABC_NET_SALES', kpiName: 'Used NON-ABC MC Net Sales $', csvDescription: 'Used NON-ABC MC Net Sales $', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 7 },
    { kpiCode: 'USED_NONABC_GROSS_MARGIN', kpiName: 'Used NON-ABC MC Gross Margin %', csvDescription: 'Used NON-ABC MC Gross Margin %', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 8 },
    { kpiCode: 'TOTAL_USED_UNITS_SOLD', kpiName: 'Total # of Used MC Sold', csvDescription: 'Total # of Used MC (ABC & NON-ABC) Sold', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.NUMBER, higherIsBetter: true, displayOrder: 9 },
    { kpiCode: 'TOTAL_USED_NET_SALES', kpiName: 'Total Used MC Net Sales $', csvDescription: 'Total Used MC (ABC & NON-ABC) Net Sales $', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 10 },
    { kpiCode: 'TOTAL_USED_GROSS_MARGIN', kpiName: 'Total Used MC Gross Margin %', csvDescription: 'Total Used MC (ABC & NON-ABC) Gross Margin %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.11, benchmarkMax: 0.135, displayOrder: 11 },
  ];

  // F&I KPIs (7)
  const fiKpis = [
    { kpiCode: 'FI_TOTAL_SALES', kpiName: 'Total F&I Sales $', csvDescription: 'Total Finance & Insurance Sales $', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 1 },
    { kpiCode: 'FI_GROSS_PROFIT_PTUR', kpiName: 'F&I Gross Profit PTUR', csvDescription: 'F&I Gross Profit Per Total Units Retailed (PTUR)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 2 },
    { kpiCode: 'ABCFS_FI_INCOME_PNUHMR', kpiName: 'ABCFS F&I Income PNUHMR', csvDescription: 'ABCFS F&I Income Per New & Used ABC MC Retailed (PNUHMR)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 3 },
    { kpiCode: 'ABCFS_FI_GROSS_PROFIT_PNUHMR', kpiName: 'ABCFS F&I Gross Profit PNUHMR', csvDescription: 'ABCFS F&I Gross Profit Per New & Used ABC MC Retailed (PNUHMR)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 4 },
    { kpiCode: 'ABCFS_ESP_PENETRATION', kpiName: 'ABCFS ESP Penetration %', csvDescription: 'ABCFS ESP Penetration %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.45, benchmarkMax: 0.60, displayOrder: 5 },
    { kpiCode: 'ABCFS_RETAIL_FINANCE_PENETRATION', kpiName: 'ABCFS Retail Finance Penetration %', csvDescription: 'ABCFS Retail Finance Product Penetration %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.45, benchmarkMax: 0.60, displayOrder: 6 },
    { kpiCode: 'LIFE_DISABILITY_PENETRATION', kpiName: 'Life & Disability Insurance Penetration %', csvDescription: 'Life & Disability Insurance Penetration %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.20, benchmarkMax: 0.25, displayOrder: 7 },
  ];

  // P&A KPIs (8)
  const paKpis = [
    { kpiCode: 'PA_TOTAL_SALES', kpiName: 'Total P&A Sales', csvDescription: 'Total P&A Sales', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 1 },
    { kpiCode: 'PA_GROSS_MARGIN', kpiName: 'P&A Gross Margin %', csvDescription: 'P&A Gross Margin %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.30, benchmarkMax: 0.40, displayOrder: 2 },
    { kpiCode: 'ABC_PA_TOTAL_SALES', kpiName: 'ABC P&A Total Sales', csvDescription: 'Total Sales - ABC Parts & Accessories', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 3 },
    { kpiCode: 'ABC_PA_GROSS_MARGIN', kpiName: 'ABC P&A Gross Margin %', csvDescription: 'ABC Parts & Accessories Gross Margin %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.31, benchmarkMax: 0.42, displayOrder: 4 },
    { kpiCode: 'PA_NET_SALES_PTUR', kpiName: 'P&A Net Sales PTUR', csvDescription: 'P&A Net Sales Per Total Units Retailed (PTUR)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 5 },
    { kpiCode: 'ABC_PA_NET_SALES_PNHMR', kpiName: 'ABC P&A Net Sales PNHMR', csvDescription: 'ABC P&A Net Sales per New ABC MC Retailed (PNHMR)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 6 },
    { kpiCode: 'ABC_PA_INVENTORY_TURNS', kpiName: 'ABC P&A Inventory Turns', csvDescription: 'ABC P&A Inventory Turns', rulesetTypeId: 'F', dataFormat: DataFormat.RATIO, higherIsBetter: true, benchmarkMin: 3.0, benchmarkMax: 3.5, displayOrder: 7 },
    { kpiCode: 'ABC_PA_NONMOVING_INVENTORY', kpiName: 'ABC P&A Non-Moving Inventory %', csvDescription: 'ABC P&A Non-Moving Inventory %', rulesetTypeId: 'G', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: false, benchmarkMin: 0.15, benchmarkMax: 0.20, displayOrder: 8 },
  ];

  // A&L KPIs (9)
  const alKpis = [
    { kpiCode: 'AL_TOTAL_SALES', kpiName: 'Total A&L Sales', csvDescription: 'Total A&L Sales', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 1 },
    { kpiCode: 'AL_GROSS_MARGIN', kpiName: 'A&L Gross Margin %', csvDescription: 'Apparel & Licensing Gross Margin %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.31, benchmarkMax: 0.42, displayOrder: 2 },
    { kpiCode: 'ABC_AL_TOTAL_SALES', kpiName: 'ABC A&L Total Sales', csvDescription: 'Total Sales - ABC Apparel & Licensing', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 3 },
    { kpiCode: 'ABC_AL_GROSS_MARGIN', kpiName: 'ABC A&L Gross Margin %', csvDescription: 'ABC Apparel & Licensing Gross Margin %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.33, benchmarkMax: 0.44, displayOrder: 4 },
    { kpiCode: 'AL_NET_SALES_PTUR', kpiName: 'A&L Net Sales PTUR', csvDescription: 'Apparl. & Licens. Net Sales per Total Units Retailed (PTUR)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 5 },
    { kpiCode: 'ABC_AL_NET_SALES_PNHMR', kpiName: 'ABC A&L Net Sales PNHMR', csvDescription: 'ABC A&L Net Sales per New ABC MC Retailed (PNHMR)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 6 },
    { kpiCode: 'ABC_AL_SEASONAL_SELLTHROUGH', kpiName: 'ABC A&L Seasonal Sell-through %', csvDescription: 'ABC A&L Seasonal Product Sell-through %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.65, benchmarkMax: 0.75, displayOrder: 7 },
    { kpiCode: 'ABC_AL_INVENTORY_TURNS', kpiName: 'ABC A&L Inventory Turns', csvDescription: 'ABC A&L Inventory Turns', rulesetTypeId: 'F', dataFormat: DataFormat.RATIO, higherIsBetter: true, benchmarkMin: 2.5, benchmarkMax: 3.0, displayOrder: 8 },
    { kpiCode: 'ABC_AL_NONMOVING_INVENTORY', kpiName: 'ABC A&L Non-Moving Inventory %', csvDescription: 'ABC A&L Non-Moving Inventory %', rulesetTypeId: 'G', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: false, benchmarkMin: 0.15, benchmarkMax: 0.20, displayOrder: 9 },
  ];

  // Service KPIs (15)
  const serviceKpis = [
    { kpiCode: 'SERVICE_NET_SALES', kpiName: 'Total Service Net Sales $', csvDescription: 'Total Service Net Sales $', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 1 },
    { kpiCode: 'SERVICE_GROSS_MARGIN', kpiName: 'Service Sales Gross Margin %', csvDescription: 'Service Sales Gross Margin %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.60, benchmarkMax: 0.64, displayOrder: 2 },
    { kpiCode: 'SERVICE_LABOR_NET_SALES', kpiName: 'Service Labour Net Sales $', csvDescription: 'Total Service Labour Net Sales $', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 3 },
    { kpiCode: 'SERVICE_LABOR_GROSS_MARGIN', kpiName: 'Service Labour Gross Margin %', csvDescription: 'Service Labour Gross Margin %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.65, benchmarkMax: 0.75, displayOrder: 4 },
    { kpiCode: 'LABOR_REVENUE_PTUR', kpiName: 'Labor Revenue PTUR', csvDescription: 'Labor Revenue Per Total Units Retailed (PTUR)', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 5 },
    { kpiCode: 'SERVICE_SALES_PTUR', kpiName: 'Service Sales $ PTUR', csvDescription: 'Service Sales $ Per Total Units Retailed', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 6 },
    { kpiCode: 'SERVICE_PA_TO_LABOR_RATIO', kpiName: 'Service P&A to Labour Hour Ratio', csvDescription: 'Service Parts & Accessories Dollars to Labour Hour Ratio', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, displayOrder: 7 },
    { kpiCode: 'PROFICIENCY', kpiName: 'Proficiency (Profitability)', csvDescription: 'Proficiency (Profitability)', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.70, benchmarkMax: 0.78, displayOrder: 8 },
    { kpiCode: 'EFFICIENCY', kpiName: 'Efficiency', csvDescription: 'Efficiency', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.92, benchmarkMax: 0.97, displayOrder: 9 },
    { kpiCode: 'RO_PER_TECH_PER_DAY', kpiName: 'RO per Tech per Day', csvDescription: 'Repair Orders (RO) per Tech per day', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.NUMBER, higherIsBetter: true, displayOrder: 10 },
    { kpiCode: 'SERVICE_LABOR_GP_CP', kpiName: 'Service Labour GP CP %', csvDescription: 'Service Labour Gross profit CP %', rulesetTypeId: 'F', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, benchmarkMin: 0.65, benchmarkMax: 0.72, displayOrder: 11 },
    { kpiCode: 'SERVICE_LABOR_GP_INTERNAL', kpiName: 'Service Labour GP Internal %', csvDescription: 'Service Labour Gross profit Internal PDI/Deal %', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 12 },
    { kpiCode: 'SERVICE_LABOR_GP_WARRANTY', kpiName: 'Service Labour GP Warranty %', csvDescription: 'Service Labour Gross profit Warranty %', rulesetTypeId: 'ZZZ', dataFormat: DataFormat.PERCENTAGE, higherIsBetter: true, displayOrder: 13 },
    { kpiCode: 'EFFECTIVE_SELLING_RATE', kpiName: 'Effective Selling Rate', csvDescription: 'Effective Selling Rate', rulesetTypeId: 'F', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, benchmarkMin: 110, benchmarkMax: 145, displayOrder: 14 },
    { kpiCode: 'LABOR_SALES_PER_RO', kpiName: 'Labour Sales per RO', csvDescription: 'Labour Sales per RO', rulesetTypeId: 'F', dataFormat: DataFormat.CURRENCY, higherIsBetter: true, benchmarkMin: 300, benchmarkMax: 330, displayOrder: 15 },
  ];

  // Insert all KPIs
  const allKpis = [
    ...overallKpis.map(k => ({ ...k, departmentId: deptMap['OVERALL'] })),
    ...newVehicleKpis.map(k => ({ ...k, departmentId: deptMap['NEW_VEHICLE'] })),
    ...usedVehicleKpis.map(k => ({ ...k, departmentId: deptMap['USED_VEHICLE'] })),
    ...fiKpis.map(k => ({ ...k, departmentId: deptMap['FI'] })),
    ...paKpis.map(k => ({ ...k, departmentId: deptMap['PA'] })),
    ...alKpis.map(k => ({ ...k, departmentId: deptMap['AL'] })),
    ...serviceKpis.map(k => ({ ...k, departmentId: deptMap['SERVICE'] })),
  ];

  for (const kpi of allKpis) {
    await prisma.kpiDefinition.upsert({
      where: { kpiCode: kpi.kpiCode },
      update: kpi,
      create: kpi,
    });
  }

  // REPORT TEMPLATES
  const reportTemplates = [
    { reportCode: 'DPS-01', reportId: 'DPS-07001-01', title: 'Overall Dealership Financial Performance Analysis', departmentId: deptMap['OVERALL'], kpiCodes: overallKpis.map(k => k.kpiCode) },
    { reportCode: 'DPS-02', reportId: 'DPS-07001-02', title: 'New Vehicle Sales Department Performance Analysis', departmentId: deptMap['NEW_VEHICLE'], kpiCodes: newVehicleKpis.map(k => k.kpiCode) },
    { reportCode: 'DPS-03', reportId: 'DPS-07001-03', title: 'Used Vehicle Sales Department Performance Analysis', departmentId: deptMap['USED_VEHICLE'], kpiCodes: usedVehicleKpis.map(k => k.kpiCode) },
    { reportCode: 'DPS-04', reportId: 'DPS-07001-04', title: 'F&I Sales Department Performance Analysis', departmentId: deptMap['FI'], kpiCodes: fiKpis.map(k => k.kpiCode) },
    { reportCode: 'DPS-05', reportId: 'DPS-07001-05', title: 'Parts & Accessories Sales Department Performance Analysis', departmentId: deptMap['PA'], kpiCodes: paKpis.map(k => k.kpiCode) },
    { reportCode: 'DPS-06', reportId: 'DPS-07001-06', title: 'A&L Sales Growth Department Performance Analysis', departmentId: deptMap['AL'], kpiCodes: alKpis.map(k => k.kpiCode) },
    { reportCode: 'DPS-07', reportId: 'DPS-07001-07', title: 'Service Sales Growth Department Performance Analysis', departmentId: deptMap['SERVICE'], kpiCodes: serviceKpis.map(k => k.kpiCode) },
  ];

  for (const template of reportTemplates) {
    await prisma.reportTemplate.upsert({
      where: { reportCode: template.reportCode },
      update: template,
      create: template,
    });
  }

  console.log('Database seeded successfully!');
  console.log(`- ${departments.length} departments`);
  console.log(`- 8 ruleset types`);
  console.log(`- ${allKpis.length} KPI definitions`);
  console.log(`- ${reportTemplates.length} report templates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });