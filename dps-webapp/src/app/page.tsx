'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { FileUploadZone, FileWithPreview } from '@/components/file-upload-zone';
import { DealerResults, DealerResult } from '@/components/dealer-results';
import { SessionHistory } from '@/components/session-history';
import { RegenerateDialog } from '@/components/regenerate-dialog';

interface ReportTemplate {
  reportCode: string;
  reportId: string;
  title: string;
  department: string;
}

export default function Home() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [commentaryStyle, setCommentaryStyle] = useState('STANDARD');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [dealerResults, setDealerResults] = useState<DealerResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [useAI, setUseAI] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);

  // Regenerate dialog state
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenSessionId, setRegenSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        const templates = data.templates || [];
        setTemplates(templates);
        setSelectedReports(templates.map((t: ReportTemplate) => t.reportCode));
        setAiAvailable(data.aiAvailable === true);
      })
      .catch(err => console.error('Failed to load templates:', err));
  }, []);

  const handleFilesChange = useCallback((newFiles: FileWithPreview[]) => {
    setFiles(newFiles);
    setError(null);
    if (newFiles.length === 0) {
      setDealerResults([]);
    }
  }, []);

  const handleGenerate = async () => {
    if (files.length === 0 || selectedReports.length === 0) {
      setError('Please select at least one file and one report type');
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    setProgressMessage(`Processing ${files.length} file${files.length > 1 ? 's' : ''}...`);
    setError(null);
    setDealerResults([]);

    try {
      const formData = new FormData();
      for (const fp of files) {
        formData.append('files', fp.file);
      }
      formData.append('reportCodes', JSON.stringify(selectedReports));
      formData.append('commentaryStyle', commentaryStyle);
      formData.append('useAI', String(useAI));

      setProgress(30);
      setProgressMessage(`Generating reports for ${files.length} dealer${files.length > 1 ? 's' : ''}...`);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      setProgress(90);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate reports');
      }

      setDealerResults(data.dealers);
      setProgress(100);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (reportId: string) => {
    const response = await fetch(`/api/reports/${reportId}`, { method: 'POST' });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportId}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const dps01to07 = ['DPS-01', 'DPS-02', 'DPS-03', 'DPS-04', 'DPS-05', 'DPS-06', 'DPS-07'];

  const toggleReport = (reportCode: string) => {
    setSelectedReports(prev => {
      if (prev.includes(reportCode)) {
        return prev.filter(r => r !== reportCode);
      }
      const next = [...prev, reportCode];
      // When DPS-08 is checked, auto-select all DPS-01 through DPS-07
      if (reportCode === 'DPS-08') {
        for (const code of dps01to07) {
          if (!next.includes(code)) {
            next.push(code);
          }
        }
      }
      return next;
    });
  };

  const handleRegenerate = (sessionId: string) => {
    setRegenSessionId(sessionId);
    setRegenOpen(true);
  };

  const handleRegenResults = (dealers: DealerResult[]) => {
    setDealerResults(dealers);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-[var(--secondary)] py-10">
      <div className="max-w-[1080px] w-[90%] mx-auto">
        <div className="mb-8">
          <h1 className="text-[30px] font-semibold text-[var(--foreground)]">
            Scorecard Generator
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Upload dealer CSV files, select reports, and generate performance scorecards.
          </p>
        </div>

        {/* Multi-File Upload */}
        <FileUploadZone
          files={files}
          onFilesChange={handleFilesChange}
          disabled={isGenerating}
        />

        {/* Report Selection */}
        <Card className="mb-5 rg-card">
          <CardHeader>
            <CardTitle className="text-[18px]">Select Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {templates.map(template => (
                <label
                  key={template.reportCode}
                  className="flex items-center gap-3 px-3 py-2.5 border border-[var(--border)] rounded cursor-pointer hover:bg-[var(--accent)] rg-transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(template.reportCode)}
                    onChange={() => toggleReport(template.reportCode)}
                    className="h-4 w-4 accent-[#2ea3f2]"
                  />
                  <div>
                    <p className="font-medium text-sm text-[var(--foreground)]">
                      {template.department}
                      {template.reportCode === 'DPS-08' && (
                        <span className="text-xs font-normal text-[var(--muted-foreground)] ml-1">(requires DPS-01–07)</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">{template.reportCode}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Commentary Style & AI Assessment */}
        <Card className="mb-5 rg-card">
          <CardHeader>
            <CardTitle className="text-[18px]">Commentary Style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={commentaryStyle} onValueChange={setCommentaryStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXECUTIVE">Executive (Concise)</SelectItem>
                <SelectItem value="STANDARD">Standard (Balanced)</SelectItem>
                <SelectItem value="DETAILED">Detailed (Comprehensive)</SelectItem>
                <SelectItem value="COACHING">Coaching (Developmental)</SelectItem>
                <SelectItem value="DIRECT">Direct (Numbers-focused)</SelectItem>
              </SelectContent>
            </Select>

            <label
              className={`flex items-center gap-3 px-3 py-2.5 border border-[var(--border)] rounded rg-transition ${
                aiAvailable ? 'cursor-pointer hover:bg-[var(--accent)]' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                disabled={!aiAvailable}
                className="h-4 w-4 accent-[#2ea3f2]"
              />
              <Sparkles className="h-4 w-4 shrink-0 text-[#2ea3f2]" />
              <div>
                <p className="font-medium text-sm text-[var(--foreground)]">AI-Generated Assessment</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {aiAvailable
                    ? 'Use Claude to generate detailed, personalized commentary'
                    : 'Unavailable — configure ANTHROPIC_API_KEY to enable'}
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={files.length === 0 || selectedReports.length === 0 || isGenerating}
          className="w-full mb-5 h-11 text-base font-medium rg-transition"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Reports...
            </>
          ) : (
            `Generate Reports for ${files.length} Dealer${files.length !== 1 ? 's' : ''}`
          )}
        </Button>

        {/* Progress */}
        {isGenerating && (
          <Card className="mb-5 rg-card">
            <CardContent className="pt-6">
              <Progress value={progress} className="mb-2" />
              <p className="text-sm text-center text-[var(--muted-foreground)]">
                {progressMessage}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results — Grouped by Dealer */}
        {dealerResults.length > 0 && (
          <div className="mb-5">
            <DealerResults dealers={dealerResults} onDownload={handleDownload} />
          </div>
        )}

        {/* Session History */}
        <SessionHistory
          onRegenerate={handleRegenerate}
          refreshTrigger={refreshTrigger}
        />

        {/* Regenerate Dialog */}
        <RegenerateDialog
          open={regenOpen}
          onOpenChange={setRegenOpen}
          sessionId={regenSessionId}
          templates={templates}
          aiAvailable={aiAvailable}
          onResults={handleRegenResults}
        />
      </div>
    </main>
  );
}
