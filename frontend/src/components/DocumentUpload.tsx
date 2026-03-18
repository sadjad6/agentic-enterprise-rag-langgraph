/** DocumentUpload — drag-and-drop file upload with progress. */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

interface UploadState {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  result?: { chunks_created: number; language_detected: string };
  error?: string;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: UploadState[] = acceptedFiles.map((file) => ({
      file,
      status: 'pending' as const,
    }));
    setUploads((prev) => [...prev, ...newUploads]);

    for (const upload of newUploads) {
      setUploads((prev) =>
        prev.map((u) => (u.file === upload.file ? { ...u, status: 'uploading' } : u))
      );

      try {
        const result = await api.upload(upload.file);
        setUploads((prev) =>
          prev.map((u) =>
            u.file === upload.file
              ? { ...u, status: 'success', result: { chunks_created: result.chunks_created, language_detected: result.language_detected } }
              : u
          )
        );
        onUploadComplete();
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.file === upload.file
              ? { ...u, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
              : u
          )
        );
      }
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold gradient-text mb-4">Upload Documents</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Upload PDF, TXT, or Markdown files to index them for search.
      </p>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className="glass-card p-10 text-center cursor-pointer transition-all"
        style={{
          border: isDragActive
            ? '2px dashed var(--accent-primary)'
            : '2px dashed var(--border)',
        }}
      >
        <input {...getInputProps()} id="file-upload" />
        <Upload
          size={40}
          className="mx-auto mb-4"
          style={{ color: isDragActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
        />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          or click to browse • PDF, TXT, MD supported
        </p>
      </div>

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="mt-6 space-y-2">
          {uploads.map((u, i) => (
            <div
              key={i}
              className="glass-card flex items-center gap-3 px-4 py-3"
            >
              <FileText size={16} style={{ color: 'var(--accent-secondary)' }} />
              <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {u.file.name}
              </span>

              {u.status === 'uploading' && (
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
              )}
              {u.status === 'success' && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--success)' }}>
                  <CheckCircle size={14} />
                  {u.result?.chunks_created} chunks • {u.result?.language_detected.toUpperCase()}
                </span>
              )}
              {u.status === 'error' && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--error)' }}>
                  <AlertCircle size={14} />
                  Failed
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
