'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { previewCsvFile, CsvPreviewData } from '@/lib/csv-preview';

export interface FileWithPreview {
  file: File;
  preview: CsvPreviewData | null;
  error?: string;
}

interface FileUploadZoneProps {
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  disabled?: boolean;
}

export function FileUploadZone({ files, onFilesChange, disabled }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback(async (newFiles: File[]) => {
    const csvFiles = newFiles.filter(f => f.name.endsWith('.csv'));
    const previewed: FileWithPreview[] = await Promise.all(
      csvFiles.map(async (file) => {
        try {
          const preview = await previewCsvFile(file);
          return { file, preview };
        } catch {
          return { file, preview: null, error: 'Could not parse CSV' };
        }
      })
    );

    // Deduplicate by filename
    const existing = new Set(files.map(f => f.file.name));
    const unique = previewed.filter(f => !existing.has(f.file.name));
    onFilesChange([...files, ...unique]);
  }, [files, onFilesChange]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <Card className="mb-5 rg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[18px]">
          <Upload className="h-5 w-5 text-[#2ea3f2]" />
          Upload CSV Files
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded px-8 py-10 text-center rg-transition ${
            isDragging
              ? 'border-[#2ea3f2] bg-[var(--accent)]'
              : 'border-[var(--border)]'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={disabled}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <FileText className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-40" />
            <p className="text-base mb-1 text-[var(--foreground)] font-medium">
              {files.length === 0
                ? 'Click or drag CSV files here'
                : 'Add more CSV files'}
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Upload one CSV per dealer
            </p>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((fp, index) => (
              <div
                key={fp.file.name}
                className="flex items-center justify-between px-3 py-2.5 border border-[var(--border)] rounded bg-white rg-transition hover:shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-[#2ea3f2] shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate text-[var(--foreground)]">{fp.file.name}</p>
                    {fp.preview ? (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {fp.preview.dealerName} &middot; {fp.preview.periodStart} to {fp.preview.periodEnd}
                      </p>
                    ) : fp.error ? (
                      <p className="text-xs text-[var(--destructive)]">{fp.error}</p>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <label
              htmlFor="file-upload"
              className="flex items-center gap-2 p-2 text-sm text-[#2ea3f2] cursor-pointer hover:text-[#1a8fd8] rg-transition font-medium"
            >
              <Plus className="h-4 w-4" />
              Add more files
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
