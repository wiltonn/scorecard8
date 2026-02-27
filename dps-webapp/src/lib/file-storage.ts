import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
const BUCKET = 'generated-reports';

const s3 = new S3Client({
  forcePathStyle: true,
  region: 'us-east-1',
  endpoint: process.env.SUPABASE_S3_ENDPOINT || 'https://jipsjajtalixgugdgqro.storage.supabase.co/storage/v1/s3',
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_KEY_ID || '',
    secretAccessKey: process.env.SUPABASE_S3_SECRET || '',
  },
});

export async function saveReportFile(
  dealerCode: string,
  reportId: string,
  periodEnd: Date,
  buffer: Buffer
): Promise<{ filePath: string; fileSize: number }> {
  const periodStr = periodEnd.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  }).replace(' ', '');

  const timestamp = Date.now();
  const filename = `${reportId}_${dealerCode}_R12_${periodStr}_${timestamp}.docx`;
  const key = `${dealerCode}/${filename}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }));

  return {
    filePath: key,
    fileSize: buffer.length,
  };
}

export async function getReportFile(filePath: string): Promise<Buffer> {
  const response = await s3.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: filePath,
  }));

  const bytes = await response.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export async function deleteReportFile(filePath: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: filePath,
    }));
  } catch (error) {
    console.warn(`Failed to delete file: ${filePath}`);
  }
}
