import Papa from 'papaparse';
import { ParsedCSVData, ParsedCSVRow } from '@/types';

export function parseCSV(csvContent: string): ParsedCSVData {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parsing error: ${result.errors[0].message}`);
  }

  const data = result.data as Record<string, any>[];
  
  if (data.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Extract dealer code from column headers
  const headers = Object.keys(data[0]);
  const dealerCYColumn = headers.find(h => h.endsWith('_CY') && !h.startsWith('B_Class') && !h.startsWith('ABC-Moto'));
  
  if (!dealerCYColumn) {
    throw new Error('Could not find dealer column in CSV');
  }

  // Extract dealer code (remove _CY suffix)
  const dealerCode = dealerCYColumn.replace('_CY', '').replace(/\s+/g, '');
  const dealerName = dealerCode.replace(/_/g, ' ');

  // Get period from first row
  const firstRow = data[0];
  const periodStart = firstRow['Start_Date'] || '';
  const periodEnd = firstRow['End_Date'] || '';

  // Parse all rows
  const rows: ParsedCSVRow[] = data.map(row => {
    const currentValue = parseFloat(row[dealerCYColumn]) || 0;
    const yoyAbsoluteCol = headers.find(h => h.includes(dealerCode.split('_')[0]) && h.includes('CY_vs_LY'));
    const yoyPercentCol = headers.find(h => h.includes(dealerCode.split('_')[0]) && h.includes('YoY_Change'));

    return {
      department: row['Department'] || '',
      description: row['Description'] || '',
      currentValue,
      yoyChangeAbsolute: yoyAbsoluteCol ? (parseFloat(row[yoyAbsoluteCol]) || 0) : 0,
      yoyChangePercent: yoyPercentCol ? (parseFloat(row[yoyPercentCol]) || 0) : 0,
      bClassAverage: parseFloat(row['B_Class_CY']) || 0,
      bClassYoyChange: parseFloat(row['B_Class_CY_vs_LY']) || 0,
      percentOfBClass: parseFloat(row['B_class_%_of_Class']) || 0,
      nationalAverage: parseFloat(row['ABC-Moto_CY']) || 0,
      nationalYoyChange: parseFloat(row['ABC-Moto_CY_vs_LY']) || 0,
      percentOfNational: parseFloat(row['ABC-Moto_%_of_Nat_Avg']) || 0,
    };
  });

  return {
    dealerCode,
    dealerName,
    periodStart,
    periodEnd,
    rows,
  };
}

export function validateCSVStructure(csvContent: string): { valid: boolean; error?: string } {
  try {
    const result = Papa.parse(csvContent, { header: true, preview: 2 });
    
    if (result.errors.length > 0) {
      return { valid: false, error: result.errors[0].message };
    }

    const headers = result.meta.fields || [];
    const requiredHeaders = ['Start_Date', 'End_Date', 'Department', 'Description', 'B_Class_CY'];
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        return { valid: false, error: `Missing required column: ${required}` };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Failed to parse CSV' };
  }
}