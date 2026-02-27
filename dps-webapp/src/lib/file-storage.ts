import * as fs from 'fs/promises';
import * as path from 'path';

const STORAGE_PATH = process.env.REPORT_STORAGE_PATH || './generated-reports';

export async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(STORAGE_PATH, { recursive: true });
}

export async function saveReportFile(
  dealerCode: string,
  reportId: string,
  periodEnd: Date,
  buffer: Buffer
): Promise<{ filePath: string; fileSize: number }> {
  await ensureStorageDir();

  const dealerDir = path.join(STORAGE_PATH, dealerCode);
  await fs.mkdir(dealerDir, { recursive: true });

  const periodStr = periodEnd.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  }).replace(' ', '');
  
  const timestamp = Date.now();
  const filename = `${reportId}_${dealerCode}_R12_${periodStr}_${timestamp}.docx`;
  const filePath = path.join(dealerDir, filename);

  await fs.writeFile(filePath, buffer);

  return {
    filePath,
    fileSize: buffer.length,
  };
}

export async function getReportFile(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

export async function deleteReportFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn(`Failed to delete file: ${filePath}`);
  }
}