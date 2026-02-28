'use client';

import { useState, useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DealerResult } from '@/components/dealer-results';

interface ReportTemplate {
  reportCode: string;
  reportId: string;
  title: string;
  department: string;
}

interface RegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  templates: ReportTemplate[];
  aiAvailable: boolean;
  onResults: (dealers: DealerResult[]) => void;
}

export function RegenerateDialog({
  open,
  onOpenChange,
  sessionId,
  templates,
  aiAvailable,
  onResults,
}: RegenerateDialogProps) {
  const [commentaryStyle, setCommentaryStyle] = useState('STANDARD');
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [useAI, setUseAI] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedReports(templates.map(t => t.reportCode));
      setUseAI(false);
      setError(null);
    }
  }, [open, templates]);

  const dps01to07 = ['DPS-01', 'DPS-02', 'DPS-03', 'DPS-04', 'DPS-05', 'DPS-06', 'DPS-07'];

  const toggleReport = (code: string) => {
    setSelectedReports(prev => {
      if (prev.includes(code)) {
        return prev.filter(r => r !== code);
      }
      const next = [...prev, code];
      // When DPS-08 is checked, auto-select all DPS-01 through DPS-07
      if (code === 'DPS-08') {
        for (const c of dps01to07) {
          if (!next.includes(c)) {
            next.push(c);
          }
        }
      }
      return next;
    });
  };

  const handleRegenerate = async () => {
    if (!sessionId || selectedReports.length === 0) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          reportCodes: selectedReports,
          commentaryStyle,
          useAI,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate');
      }

      onResults(data.dealers);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[18px]">Regenerate Reports</DialogTitle>
          <DialogDescription>
            Generate new reports from existing KPI data with different settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--foreground)]">Commentary Style</label>
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
          </div>

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
                  ? 'Use Claude for personalized commentary'
                  : 'Unavailable — configure ANTHROPIC_API_KEY'}
              </p>
            </div>
          </label>

          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--foreground)]">Reports to Generate</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {templates.map(template => (
                <label
                  key={template.reportCode}
                  className="flex items-center gap-2 px-2.5 py-2 border border-[var(--border)] rounded cursor-pointer hover:bg-[var(--accent)] rg-transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(template.reportCode)}
                    onChange={() => toggleReport(template.reportCode)}
                    className="h-4 w-4 accent-[#2ea3f2]"
                  />
                  <span className="text-sm text-[var(--foreground)]">
                    {template.department}
                    {template.reportCode === 'DPS-08' && (
                      <span className="text-xs text-[var(--muted-foreground)] ml-1">(synthesizes DPS-01–07)</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRegenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isRegenerating || selectedReports.length === 0}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              'Regenerate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
