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

  const toggleReport = (code: string) => {
    setSelectedReports(prev =>
      prev.includes(code) ? prev.filter(r => r !== code) : [...prev, code]
    );
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
          <DialogTitle>Regenerate Reports</DialogTitle>
          <DialogDescription>
            Generate new reports from existing KPI data with different settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Commentary Style</label>
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
            className={`flex items-center gap-3 p-3 border rounded-lg ${
              aiAvailable ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              disabled={!aiAvailable}
              className="h-4 w-4"
            />
            <Sparkles className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium text-sm">AI-Generated Assessment</p>
              <p className="text-xs text-gray-500">
                {aiAvailable
                  ? 'Use Claude for personalized commentary'
                  : 'Unavailable — configure ANTHROPIC_API_KEY'}
              </p>
            </div>
          </label>

          <div>
            <label className="text-sm font-medium mb-2 block">Reports to Generate</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {templates.map(template => (
                <label
                  key={template.reportCode}
                  className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(template.reportCode)}
                    onChange={() => toggleReport(template.reportCode)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{template.department}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
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
