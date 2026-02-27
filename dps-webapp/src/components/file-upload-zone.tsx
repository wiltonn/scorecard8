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
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload CSV Files
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
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
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg mb-2">
              {files.length === 0
                ? 'Click or drag CSV files here'
                : 'Add more CSV files'}
            </p>
            <p className="text-sm text-gray-500">
              Upload one CSV per dealer
            </p>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((fp, index) => (
              <div
                key={fp.file.name}
                className="flex items-center justify-between p-3 border rounded-lg bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{fp.file.name}</p>
                    {fp.preview ? (
                      <p className="text-sm text-gray-500">
                        {fp.preview.dealerName} &middot; {fp.preview.periodStart} to {fp.preview.periodEnd}
                      </p>
                    ) : fp.error ? (
                      <p className="text-sm text-red-500">{fp.error}</p>
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
              className="flex items-center gap-2 p-2 text-sm text-blue-600 cursor-pointer hover:underline"
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
