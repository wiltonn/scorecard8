import Papa from 'papaparse';
import { ParsedCSVData, ParsedCSVRow } from '@/types';

/**
 * Detect dynamic class/national columns from CSV headers.
 * Supports patterns like B_Class_CY, A_class_CY, ABC-Moto_CY, ABC_CY, etc.
 */
function detectColumns(headers: string[]) {
  // Find class column: matches *_class_CY or *_Class_CY (but NOT ABC* and NOT dealer)
  const classCol = headers.find(h => /^[A-Z]_[Cc]lass_CY$/i.test(h));
  const classYoYCol = headers.find(h => /^[A-Z]_[Cc]lass_CY_vs_LY$/i.test(h));
  const classPctCol = headers.find(h => /^[A-Z]_[Cc]lass_%_of_Class$/i.test(h));

  // Find national column: starts with ABC, ends with _CY, not YoY/pct
  const nationalCol = headers.find(h => /^ABC[^_]*_CY$/.test(h));
  const nationalYoYCol = headers.find(h => /^ABC[^_]*_CY_vs_LY$/.test(h));
  const nationalPctCol = headers.find(h => /^ABC[^_]*_%_of_(Class|Nat_Avg|Nat)$/i.test(h));

  // Extract class label from column name: A_class_CY -> "A-Class", B_Class_CY -> "B-Class"
  let classLabel = 'B-Class';
  if (classCol) {
    const match = classCol.match(/^([A-Z])_[Cc]lass/i);
    if (match) {
      classLabel = `${match[1].toUpperCase()}-Class`;
    }
  }

  return {
    classCol,
    classYoYCol,
    classPctCol,
    nationalCol,
    nationalYoYCol,
    nationalPctCol,
    classLabel,
  };
}

/**
 * Convert short date like "25-Jan" or "25-Dec" to "January 2025" or "December 2025".
 * Handles formats: "YY-Mon" (e.g. "25-Jan") and passes through already-formatted dates.
 */
function formatPeriodDate(raw: string): string {
  if (!raw) return raw;
  // Match pattern like "25-Jan", "25-Dec"
  const match = raw.match(/^(\d{2})-([A-Za-z]{3})$/);
  if (!match) return raw; // Already formatted or unknown format
  const yearShort = parseInt(match[1], 10);
  const monthAbbr = match[2];
  const fullYear = yearShort >= 50 ? 1900 + yearShort : 2000 + yearShort;
  // Parse month abbreviation to full month name
  const monthNames: Record<string, string> = {
    Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
    May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
    Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
  };
  const fullMonth = monthNames[monthAbbr] || monthAbbr;
  return `${fullMonth} ${fullYear}`;
}

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

  const headers = Object.keys(data[0]);
  const columns = detectColumns(headers);

  // Extract dealer code from column headers
  // Dealer CY column: ends with _CY, not a class/national column, not Start_Date/End_Date etc.
  const nonDealerPrefixes = ['Start_Date', 'End_Date', 'Department', 'Description'];
  const knownCols = new Set([
    columns.classCol, columns.classYoYCol, columns.classPctCol,
    columns.nationalCol, columns.nationalYoYCol, columns.nationalPctCol,
  ].filter(Boolean));

  const dealerCYColumn = headers.find(h =>
    h.endsWith('_CY') &&
    !knownCols.has(h) &&
    !nonDealerPrefixes.includes(h) &&
    !h.includes('_vs_LY') &&
    !h.includes('YoY_Change') &&
    !h.includes('%_of_')
  );

  if (!dealerCYColumn) {
    throw new Error('Could not find dealer column in CSV');
  }

  // Extract dealer code (remove _CY suffix)
  const dealerCode = dealerCYColumn.replace('_CY', '').replace(/\s+/g, '');
  // Build dealer name: use dealer code directly, preserving underscores.
  // Only append brand suffix if dealer code does not already contain it.
  let brandSuffix = '';
  if (columns.nationalCol) {
    brandSuffix = columns.nationalCol.replace(/_CY$/, '');
  }
  let dealerName = dealerCode;
  if (brandSuffix && !dealerCode.includes(brandSuffix)) {
    dealerName = `${dealerCode}_${brandSuffix}`;
  }

  // Get period from first row and format as full month/year
  const firstRow = data[0];
  const periodStart = formatPeriodDate(firstRow['Start_Date'] || '');
  const periodEnd = formatPeriodDate(firstRow['End_Date'] || '');

  // Detect dealer-specific YoY columns.
  // The dealer CY column prefix (without _CY) is used to find matching _CY_vs_LY and _YoY_Change columns.
  // Use the full dealer code prefix from the CY column name for accurate matching.
  const dealerPrefix = dealerCYColumn.replace(/_CY$/, '');
  const yoyAbsoluteCol = headers.find(h => h.startsWith(dealerPrefix) && h.endsWith('_CY_vs_LY'));
  const yoyPercentCol = headers.find(h => h.startsWith(dealerPrefix) && h.endsWith('_YoY_Change'));

  // Parse all rows
  const rows: ParsedCSVRow[] = data.map(row => {
    const currentValue = parseFloat(row[dealerCYColumn]) || 0;

    return {
      department: row['Department'] || '',
      description: row['Description'] || '',
      currentValue,
      yoyChangeAbsolute: yoyAbsoluteCol ? (parseFloat(row[yoyAbsoluteCol]) || 0) : 0,
      yoyChangePercent: yoyPercentCol ? (parseFloat(row[yoyPercentCol]) || 0) : 0,
      bClassAverage: columns.classCol ? (parseFloat(row[columns.classCol]) || 0) : 0,
      bClassYoyChange: columns.classYoYCol ? (parseFloat(row[columns.classYoYCol]) || 0) : 0,
      percentOfBClass: columns.classPctCol ? (parseFloat(row[columns.classPctCol]) || 0) : 0,
      nationalAverage: columns.nationalCol ? (parseFloat(row[columns.nationalCol]) || 0) : 0,
      nationalYoyChange: columns.nationalYoYCol ? (parseFloat(row[columns.nationalYoYCol]) || 0) : 0,
      percentOfNational: columns.nationalPctCol ? (parseFloat(row[columns.nationalPctCol]) || 0) : 0,
    };
  });

  return {
    dealerCode,
    dealerName,
    periodStart,
    periodEnd,
    rows,
    classLabel: columns.classLabel,
  };
}

export function validateCSVStructure(csvContent: string): { valid: boolean; error?: string } {
  try {
    const result = Papa.parse(csvContent, { header: true, preview: 2 });

    if (result.errors.length > 0) {
      return { valid: false, error: result.errors[0].message };
    }

    const headers = result.meta.fields || [];

    // Check required basic headers
    const basicHeaders = ['Start_Date', 'End_Date', 'Department', 'Description'];
    for (const required of basicHeaders) {
      if (!headers.includes(required)) {
        return { valid: false, error: `Missing required column: ${required}` };
      }
    }

    // Check for class column (dynamic: A_class_CY, B_Class_CY, etc.)
    const hasClassCol = headers.some(h => /^[A-Z]_[Cc]lass_CY$/i.test(h));
    if (!hasClassCol) {
      return { valid: false, error: 'Missing required class column (e.g., B_Class_CY or A_class_CY)' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Failed to parse CSV' };
  }
}
