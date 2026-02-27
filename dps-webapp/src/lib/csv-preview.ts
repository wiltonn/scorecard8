/**
 * Client-side CSV preview utility.
 * Reads the first ~2KB of a CSV file to extract dealer name and period
 * for the upload preview. Simple string splitting — no PapaParse needed.
 */

export interface CsvPreviewData {
  dealerName: string;
  periodStart: string;
  periodEnd: string;
}

export async function previewCsvFile(file: File): Promise<CsvPreviewData> {
  const slice = file.slice(0, 2048);
  const text = await slice.text();
  const lines = text.split('\n').filter(l => l.trim());

  if (lines.length < 2) {
    throw new Error('CSV file appears empty');
  }

  // Parse header row to find dealer column
  const headers = parseCSVLine(lines[0]);
  const dealerCol = headers.find(
    h => h.endsWith('_CY') && !h.startsWith('B_Class') && !h.startsWith('ABC-Moto')
  );

  const dealerName = dealerCol
    ? dealerCol.replace('_CY', '').replace(/_/g, ' ').trim()
    : 'Unknown Dealer';

  // Parse first data row for period
  const dataValues = parseCSVLine(lines[1]);
  const startDateIdx = headers.indexOf('Start_Date');
  const endDateIdx = headers.indexOf('End_Date');

  const periodStart = startDateIdx >= 0 ? dataValues[startDateIdx]?.trim() || '' : '';
  const periodEnd = endDateIdx >= 0 ? dataValues[endDateIdx]?.trim() || '' : '';

  return { dealerName, periodStart, periodEnd };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
