'use client';

import { CheckCircle, XCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface GeneratedReport {
  reportId: string;
  reportCode: string;
  title: string;
  status: 'completed' | 'failed';
  error?: string;
}

export interface DealerResult {
  dealerCode: string;
  dealerName: string;
  periodStart: string;
  periodEnd: string;
  reports: GeneratedReport[];
}

interface DealerResultsProps {
  dealers: DealerResult[];
  onDownload: (reportId: string) => void;
}

export function DealerResults({ dealers, onDownload }: DealerResultsProps) {
  if (dealers.length === 0) return null;

  const completedCount = (d: DealerResult) => d.reports.filter(r => r.status === 'completed').length;

  // Single dealer — no tabs needed
  if (dealers.length === 1) {
    const dealer = dealers[0];
    return (
      <Card className="rg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[18px]">
            Generated Reports — {dealer.dealerName}
            <Badge variant="secondary" className="text-xs">{completedCount(dealer)}/{dealer.reports.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReportList reports={dealer.reports} onDownload={onDownload} />
        </CardContent>
      </Card>
    );
  }

  // Multiple dealers — tabbed layout
  return (
    <Card className="rg-card">
      <CardHeader>
        <CardTitle className="text-[18px]">Generated Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={dealers[0].dealerCode}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {dealers.map(d => (
              <TabsTrigger key={d.dealerCode} value={d.dealerCode} className="gap-1">
                {d.dealerName}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {completedCount(d)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {dealers.map(d => (
            <TabsContent key={d.dealerCode} value={d.dealerCode}>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                Period: {d.periodStart} to {d.periodEnd}
              </p>
              <ReportList reports={d.reports} onDownload={onDownload} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ReportList({
  reports,
  onDownload,
}: {
  reports: GeneratedReport[];
  onDownload: (reportId: string) => void;
}) {
  return (
    <div className="space-y-2">
      {reports.map(report => (
        <div
          key={report.reportId}
          className="flex items-center justify-between px-3 py-2.5 border border-[var(--border)] rounded rg-transition hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            {report.status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-[#4caf50]" />
            ) : (
              <XCircle className="h-5 w-5 text-[var(--destructive)]" />
            )}
            <div>
              <p className="font-medium text-sm text-[var(--foreground)]">{report.title}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{report.reportCode}</p>
            </div>
          </div>
          {report.status === 'completed' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(report.reportId)}
              className="rg-transition"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          ) : (
            <span className="text-sm text-[var(--destructive)]">{report.error}</span>
          )}
        </div>
      ))}
    </div>
  );
}
