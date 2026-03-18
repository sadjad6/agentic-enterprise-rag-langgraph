/** DocumentUpload — drag-and-drop file upload with robust Stitch-matching styling. */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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
    <div className="mx-auto" style={{ maxWidth: '42rem', padding: '1.5rem' }}>
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100" style={{ marginBottom: '1rem' }}>Upload Documents</h2>
      <p className="text-sm text-slate-500" style={{ marginBottom: '1.5rem' }}>
        Upload PDF, TXT, or Markdown files to index them for search.
      </p>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`text-center cursor-pointer transition-all bg-white dark:bg-slate-800 border-2 border-dashed ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-slate-200 dark:border-slate-700'
        }`}
        style={{ padding: '2.5rem', borderRadius: '0.75rem' }}
      >
        <input {...getInputProps()} id="file-upload" />
        <span className={`material-symbols-outlined block mx-auto ${
          isDragActive ? 'text-primary' : 'text-slate-400'
        }`} style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>
          upload_file
        </span>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-slate-400" style={{ marginTop: '0.5rem' }}>
          or click to browse • PDF, TXT, MD supported
        </p>
      </div>

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="flex flex-col" style={{ marginTop: '1.5rem', gap: '0.5rem' }}>
          {uploads.map((u, i) => (
            <div
              key={i}
              className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              style={{ gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.75rem' }}
            >
              <span className="material-symbols-outlined text-primary block" style={{ fontSize: '1.125rem' }}>description</span>
              <span className="flex-1 text-sm truncate text-slate-700 dark:text-slate-300">
                {u.file.name}
              </span>

              {u.status === 'uploading' && (
                <span className="material-symbols-outlined text-primary animate-spin block" style={{ fontSize: '1.125rem' }}>progress_activity</span>
              )}
              {u.status === 'success' && (
                <span className="flex items-center text-xs text-emerald-600" style={{ gap: '0.25rem' }}>
                  <span className="material-symbols-outlined block" style={{ fontSize: '0.875rem' }}>check_circle</span>
                  {u.result?.chunks_created} chunks • {u.result?.language_detected.toUpperCase()}
                </span>
              )}
              {u.status === 'error' && (
                <span className="flex items-center text-xs text-red-500" style={{ gap: '0.25rem' }}>
                  <span className="material-symbols-outlined block" style={{ fontSize: '0.875rem' }}>error</span>
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
