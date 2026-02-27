'use client';

import { useState, useEffect } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SessionSummary {
  sessionId: string;
  name: string | null;
  status: string;
  dealers: string[];
  periodStart: string | null;
  periodEnd: string | null;
  runCount: number;
  createdAt: string;
}

interface SessionHistoryProps {
  onRegenerate: (sessionId: string) => void;
  refreshTrigger?: number;
}

export function SessionHistory({ onRegenerate, refreshTrigger }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/sessions?limit=10')
      .then(res => res.json())
      .then(data => setSessions(data.sessions || []))
      .catch(err => console.error('Failed to load sessions:', err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  if (loading) {
    return (
      <Card className="mt-5 rg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[18px]">
            <History className="h-5 w-5 text-[#2ea3f2]" />
            Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <Card className="mt-5 rg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[18px]">
          <History className="h-5 w-5 text-[#2ea3f2]" />
          Session History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sessions.map(session => (
            <div
              key={session.sessionId}
              className="flex items-center justify-between px-3 py-2.5 border border-[var(--border)] rounded rg-transition hover:shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate text-[var(--foreground)]">
                  {session.dealers.join(', ') || 'No dealers'}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {session.periodStart && session.periodEnd
                    ? `${new Date(session.periodStart).toLocaleDateString()} - ${new Date(session.periodEnd).toLocaleDateString()}`
                    : 'Unknown period'}
                  {' '}&middot;{' '}
                  {session.runCount} run{session.runCount !== 1 ? 's' : ''}
                  {' '}&middot;{' '}
                  {new Date(session.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRegenerate(session.sessionId)}
                disabled={session.status !== 'READY' && session.status !== 'COMPLETED'}
                className="rg-transition"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
