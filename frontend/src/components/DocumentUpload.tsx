/** DocumentUpload — drag-and-drop file upload with Stitch-matching Tailwind styling. */

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
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Upload Documents</h2>
      <p className="text-sm text-slate-500 mb-6">
        Upload PDF, TXT, or Markdown files to index them for search.
      </p>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`p-10 text-center cursor-pointer transition-all rounded-xl border-2 border-dashed bg-white dark:bg-slate-800 ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <input {...getInputProps()} id="file-upload" />
        <span className={`material-symbols-outlined text-4xl mx-auto mb-4 block ${
          isDragActive ? 'text-primary' : 'text-slate-400'
        }`}>
          upload_file
        </span>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          or click to browse • PDF, TXT, MD supported
        </p>
      </div>

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="mt-6 space-y-2">
          {uploads.map((u, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <span className="material-symbols-outlined text-primary text-lg">description</span>
              <span className="flex-1 text-sm truncate text-slate-700 dark:text-slate-300">
                {u.file.name}
              </span>

              {u.status === 'uploading' && (
                <span className="material-symbols-outlined text-primary text-lg animate-spin">progress_activity</span>
              )}
              {u.status === 'success' && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {u.result?.chunks_created} chunks • {u.result?.language_detected.toUpperCase()}
                </span>
              )}
              {u.status === 'error' && (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <span className="material-symbols-outlined text-sm">error</span>
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
