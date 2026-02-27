import prisma from './prisma';
import {
  Dealer, DealerUpload, UploadSession, BenchmarkSnapshot, ReportRun, Report,
  SessionStatus, UploadStatus, ReportRunStatus, ReportStatus, CommentaryStyle,
  BenchmarkScore
} from '@prisma/client';

// DEALER OPERATIONS
export async function findOrCreateDealer(dealerCode: string, dealerName: string): Promise<Dealer> {
  return prisma.dealer.upsert({
    where: { dealerCode },
    update: { dealerName },
    create: { dealerCode, dealerName },
  });
}

// UPLOAD SESSION OPERATIONS
export async function createUploadSession(userId: string, name?: string): Promise<UploadSession> {
  return prisma.uploadSession.create({
    data: {
      userId,
      name,
      status: SessionStatus.PENDING,
    },
  });
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<UploadSession> {
  return prisma.uploadSession.update({
    where: { id: sessionId },
    data: { status },
  });
}

// DEALER UPLOAD OPERATIONS
export async function createDealerUpload(
  uploadSessionId: string,
  dealerId: string,
  periodStart: Date,
  periodEnd: Date,
  rawCsvData: string
): Promise<DealerUpload> {
  return prisma.dealerUpload.create({
    data: {
      uploadSessionId,
      dealerId,
      periodStart,
      periodEnd,
      rawCsvData,
      status: UploadStatus.PENDING,
    },
  });
}

export async function updateDealerUploadStatus(
  uploadId: string,
  status: UploadStatus,
  errorMessage?: string
): Promise<DealerUpload> {
  return prisma.dealerUpload.update({
    where: { id: uploadId },
    data: {
      status,
      errorMessage,
      processedAt: status === UploadStatus.EXTRACTED ? new Date() : undefined,
    },
  });
}

// BENCHMARK OPERATIONS
export async function saveBenchmarkSnapshot(
  uploadSessionId: string,
  periodStart: Date,
  periodEnd: Date,
  values: Array<{
    kpiDefinitionId: string;
    bClassAverage?: number;
    bClassYoyChange?: number;
    nationalAverage?: number;
    nationalYoyChange?: number;
  }>
): Promise<BenchmarkSnapshot> {
  // Upsert: skip if same period already exists in session
  const existing = await prisma.benchmarkSnapshot.findUnique({
    where: {
      uploadSessionId_periodStart_periodEnd: {
        uploadSessionId,
        periodStart,
        periodEnd,
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.benchmarkSnapshot.create({
    data: {
      uploadSessionId,
      periodStart,
      periodEnd,
      benchmarkValues: {
        createMany: {
          data: values,
        },
      },
    },
    include: { benchmarkValues: true },
  });
}

export async function getBenchmarkValues(
  uploadSessionId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const snapshot = await prisma.benchmarkSnapshot.findUnique({
    where: {
      uploadSessionId_periodStart_periodEnd: {
        uploadSessionId,
        periodStart,
        periodEnd,
      },
    },
    include: {
      benchmarkValues: {
        include: { kpiDefinition: true },
      },
    },
  });

  return snapshot?.benchmarkValues ?? [];
}

// REPORT RUN OPERATIONS
export async function createReportRun(
  uploadSessionId: string,
  commentaryStyle: CommentaryStyle,
  templateCodes: string[]
): Promise<ReportRun> {
  return prisma.reportRun.create({
    data: {
      uploadSessionId,
      commentaryStyle,
      templateCodes,
      status: ReportRunStatus.PENDING,
    },
  });
}

export async function updateReportRunStatus(
  runId: string,
  status: ReportRunStatus
): Promise<ReportRun> {
  return prisma.reportRun.update({
    where: { id: runId },
    data: { status },
  });
}

// SESSION DATA LOADING
export async function getSessionWithData(sessionId: string, userId?: string) {
  return prisma.uploadSession.findFirst({
    where: { id: sessionId, ...(userId ? { userId } : {}) },
    include: {
      dealerUploads: {
        include: {
          dealer: true,
          kpiValues: {
            include: { kpiDefinition: { include: { department: true, rulesetType: true } } },
          },
        },
      },
      benchmarkSnapshots: {
        include: {
          benchmarkValues: {
            include: { kpiDefinition: true },
          },
        },
      },
      reportRuns: {
        include: { reports: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function getRecentSessions(userId: string, limit = 20, offset = 0) {
  const where = { userId };
  const [sessions, total] = await Promise.all([
    prisma.uploadSession.findMany({
      where,
      include: {
        dealerUploads: {
          include: { dealer: true },
        },
        reportRuns: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.uploadSession.count({ where }),
  ]);

  return { sessions, total };
}

// KPI OPERATIONS
export async function getAllKpiDefinitions() {
  return prisma.kpiDefinition.findMany({
    include: {
      department: true,
      rulesetType: true,
    },
    orderBy: [
      { department: { displayOrder: 'asc' } },
      { displayOrder: 'asc' },
    ],
  });
}

export async function saveKpiValues(
  dealerUploadId: string,
  kpiValues: Array<{
    kpiDefinitionId: string;
    currentValue: number;
    priorYearValue?: number;
    yoyChangeAbsolute?: number;
    yoyChangePercent?: number;
    percentOfBClass?: number;
    percentOfNational?: number;
    benchmarkScore?: BenchmarkScore;
  }>
): Promise<void> {
  await prisma.kpiValue.createMany({
    data: kpiValues.map(kv => ({
      dealerUploadId,
      ...kv,
    })),
  });
}

// REPORT OPERATIONS
export async function createReport(
  reportRunId: string,
  dealerUploadId: string,
  templateId: string
): Promise<Report> {
  return prisma.report.create({
    data: {
      reportRunId,
      dealerUploadId,
      templateId,
      status: ReportStatus.PENDING,
    },
  });
}

export async function updateReportWithDocument(
  reportId: string,
  documentPath: string,
  documentSize: number,
  aiAssessment: object
): Promise<Report> {
  return prisma.report.update({
    where: { id: reportId },
    data: {
      documentPath,
      documentSize,
      aiAssessment,
      status: ReportStatus.COMPLETED,
      generatedAt: new Date(),
    },
  });
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus
): Promise<Report> {
  return prisma.report.update({
    where: { id: reportId },
    data: { status },
  });
}

export async function updateReportError(
  reportId: string,
  errorMessage: string
): Promise<Report> {
  return prisma.report.update({
    where: { id: reportId },
    data: {
      status: ReportStatus.FAILED,
      errorMessage,
    },
  });
}

export async function getReportWithDetails(reportId: string) {
  return prisma.report.findUnique({
    where: { id: reportId },
    include: {
      template: {
        include: { department: true },
      },
      dealerUpload: {
        include: {
          dealer: true,
          kpiValues: {
            include: { kpiDefinition: true },
          },
        },
      },
      reportRun: {
        include: {
          uploadSession: {
            include: {
              benchmarkSnapshots: {
                include: { benchmarkValues: true },
              },
            },
          },
        },
      },
    },
  });
}

// REPORT HISTORY
export async function getReportHistory(options: {
  dealerCode?: string;
  limit?: number;
  offset?: number;
}) {
  const { dealerCode, limit = 20, offset = 0 } = options;

  const where = dealerCode
    ? { dealerUpload: { dealer: { dealerCode } }, status: ReportStatus.COMPLETED }
    : { status: ReportStatus.COMPLETED };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        template: true,
        dealerUpload: {
          include: { dealer: true },
        },
      },
      orderBy: { generatedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.report.count({ where }),
  ]);

  return { reports, total };
}

// TEMPLATES
export async function getReportTemplates() {
  return prisma.reportTemplate.findMany({
    include: { department: true },
    orderBy: { department: { displayOrder: 'asc' } },
  });
}

export async function getReportTemplatesByCode(reportCodes: string[]) {
  return prisma.reportTemplate.findMany({
    where: { reportCode: { in: reportCodes } },
    include: { department: true },
  });
}

export async function getReportWithOwnerCheck(reportId: string, userId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      template: {
        include: { department: true },
      },
      dealerUpload: {
        include: {
          dealer: true,
          kpiValues: {
            include: { kpiDefinition: true },
          },
        },
      },
      reportRun: {
        include: {
          uploadSession: {
            include: {
              benchmarkSnapshots: {
                include: { benchmarkValues: true },
              },
            },
          },
        },
      },
    },
  });

  if (!report || report.reportRun.uploadSession.userId !== userId) {
    return null;
  }

  return report;
}
