'use client';

import { useState, useRef } from 'react';

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
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/batch-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ total: 0, successCount: 0, failCount: 0, parseErrors: [e.message], results: [] });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleUpload(file);
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#94a3b8' }}>Batch Upload Markets</h2>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
        Upload a CSV or GeoJSON file (max 10 records). CSV columns: name, description, category, lng, lat, endTimeUnix, resolutionTimeUnix, liquidity (optional).
      </p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#6366f1' : '#334155'}`,
          borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer',
          background: dragOver ? 'rgba(99,102,241,0.1)' : 'transparent', transition: 'all 0.2s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.geojson,.json"
          onChange={(e) => handleUpload(e.target.files?.[0] || null)}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: 32, marginBottom: 8, color: '#64748b' }}>+</div>
        <div style={{ color: '#94a3b8', fontSize: 14 }}>Drag & drop a file here, or click to browse</div>
        <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>CSV or GeoJSON supported</div>
      </div>

      {uploading && (
        <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>Uploading and processing...</div>
      )}

      {result && !uploading && (
        <div style={{ marginTop: 16, background: '#16213e', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#94a3b8' }}>Upload Results</h3>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <span style={{ color: '#22c55e' }}>✅ {result.successCount} created</span>
            <span style={{ color: '#ef4444' }}>❌ {result.failCount} failed</span>
            <span style={{ color: '#64748b' }}>📄 {result.total} total</span>
          </div>

          {result.parseErrors.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 4 }}>Parse warnings:</div>
              {result.parseErrors.map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: '#f59e0b', padding: '2px 0' }}>{e}</div>
              ))}
            </div>
          )}

          {result.results.filter((r) => !r.success).length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 4 }}>Errors:</div>
              {result.results.filter((r) => !r.success).map((r, i) => (
                <div key={i} style={{ fontSize: 11, color: '#ef4444', padding: '2px 0' }}>
                  {r.name}: {r.error}
                </div>
              ))}
            </div>
          )}

          {result.successCount > 0 && (
            <div style={{ marginTop: 12, fontSize: 11, color: '#64748b' }}>
              Markets created as simulated (no on-chain deployment).
              {result.results.filter((r) => r.success).map((r, i) => (
                <div key={i} style={{ padding: '2px 0' }}>
                  {r.name} → {r.contract_address?.slice(0, 14)}...
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
