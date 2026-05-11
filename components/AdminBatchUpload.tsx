'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface UploadResult {
  total: number;
  successCount: number;
  failCount: number;
  parseErrors: string[];
  results: { success: boolean; name: string; contract_address?: string; error?: string }[];
}

export default function AdminBatchUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    setProgress(10);
    setResult(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 85));
    }, 500);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/batch-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => setResult(data), 300);
    } catch (e: any) {
      clearInterval(progressInterval);
      setProgress(100);
      setResult({ total: 0, successCount: 0, failCount: 0, parseErrors: [e.message], results: [] });
    } finally {
      setTimeout(() => {
        setUploading(false);
      }, 500);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleUpload(file);
  };

  const resetUpload = () => {
    setResult(null);
    setFileName(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-medium text-foreground mb-1">Batch Upload Markets</h2>
        <p className="text-xs text-muted-foreground">
          Upload a CSV or GeoJSON file (max 10 records). CSV columns: name, description, category, lng, lat, endTimeUnix, resolutionTimeUnix, liquidity (optional).
        </p>
      </div>

      {/* Drop zone */}
      {!result && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.geojson,.json"
            onChange={(e) => handleUpload(e.target.files?.[0] || null)}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-xl ${dragOver ? 'bg-primary/20' : 'bg-muted/30'} flex items-center justify-center transition-colors`}>
              <Upload className={`w-6 h-6 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm text-foreground font-medium">
                {dragOver ? 'Drop file here' : 'Drag & drop a file here'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                or click to browse — CSV or GeoJSON
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File info + progress */}
      {uploading && (
        <Card className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">Processing...</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {progress}%
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </Card>
      )}

      {/* Results */}
      {result && !uploading && (
        <Card className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Upload Results</h3>
            <Button variant="ghost" size="sm" onClick={resetUpload} className="h-7 text-xs">
              Upload another
            </Button>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{result.total} total</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">{result.successCount} created</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400">{result.failCount} failed</span>
            </div>
          </div>

          {/* Progress bar for success rate */}
          {result.total > 0 && (
            <Progress
              value={(result.successCount / result.total) * 100}
              className="h-2"
            />
          )}

          {/* Parse warnings */}
          {result.parseErrors.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <AlertCircle className="w-3 h-3" />
                Parse warnings:
              </div>
              {result.parseErrors.map((e, i) => (
                <p key={i} className="text-xs text-amber-400/80 pl-5">{e}</p>
              ))}
            </div>
          )}

          {/* Errors */}
          {result.results.filter((r) => !r.success).length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <XCircle className="w-3 h-3" />
                Errors:
              </div>
              {result.results.filter((r) => !r.success).map((r, i) => (
                <p key={i} className="text-xs text-red-400/80 pl-5">{r.name}: {r.error}</p>
              ))}
            </div>
          )}

          {/* Successful markets */}
          {result.successCount > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Created markets (simulated, no on-chain deployment):</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.results.filter((r) => r.success).map((r, i) => (
                  <div key={i} className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="truncate">{r.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 ml-2 shrink-0">
                      {r.contract_address?.slice(0, 10)}...
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
