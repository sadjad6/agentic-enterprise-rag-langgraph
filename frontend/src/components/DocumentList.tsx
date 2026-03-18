/** DocumentList — displays indexed documents with metadata. */

import { FileText } from 'lucide-react';

interface DocumentListProps {
  documents: string[];
}

export function DocumentList({ documents }: DocumentListProps) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold gradient-text mb-4">Indexed Documents</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {documents.length} document{documents.length !== 1 ? 's' : ''} available for search.
      </p>

      {documents.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <FileText size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No documents indexed yet. Upload files to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc, i) => (
            <div key={i} className="glass-card flex items-center gap-3 px-4 py-3">
              <FileText size={16} style={{ color: 'var(--accent-secondary)' }} />
              <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {doc}
              </span>
              <span className="badge badge-local text-xs">indexed</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
