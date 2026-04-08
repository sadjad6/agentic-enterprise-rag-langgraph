/** Header — matches the Stitch dashboard header layout with interactive Share & Menu. */

import { useCallback, useEffect, useRef, useState } from 'react';

interface HeaderProps {
  isLocal: boolean;
  title?: string;
  onRenameSession?: (newTitle: string) => void;
  onDeleteSession?: () => void;
  onExportChat?: () => void;
}

const DROPDOWN_CLOSE_DELAY_MS = 150;

export function Header({
  isLocal,
  title = 'New Chat',
  onRenameSession,
  onDeleteSession,
  onExportChat,
}: HeaderProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);

  const menuRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setIsShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus rename input when it opens
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      /* Clipboard API unavailable — ignore gracefully */
    }
  }, []);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== title) {
      onRenameSession?.(trimmed);
    }
    setIsRenaming(false);
  }, [renameValue, title, onRenameSession]);

  const handleExport = useCallback(() => {
    onExportChat?.();
    setTimeout(() => setIsMenuOpen(false), DROPDOWN_CLOSE_DELAY_MS);
  }, [onExportChat]);

  const handleDelete = useCallback(() => {
    onDeleteSession?.();
    setTimeout(() => setIsMenuOpen(false), DROPDOWN_CLOSE_DELAY_MS);
  }, [onDeleteSession]);

  return (
    <header
      className="border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10"
      style={{ height: '4rem', padding: '0 2rem' }}
    >
      <div className="flex items-center" style={{ gap: '1rem' }}>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="bg-slate-200" style={{ height: '1rem', width: '1px' }} />
        <div
          className={`flex items-center text-[11px] font-bold border ${
            isLocal
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'bg-purple-50 text-purple-700 border-purple-100'
          }`}
          style={{ gap: '0.375rem', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}
        >
          <span
            className={`animate-pulse ${isLocal ? 'bg-emerald-500' : 'bg-purple-500'}`}
            style={{ width: '0.375rem', height: '0.375rem', borderRadius: '9999px' }}
          />
          {isLocal ? 'LOCAL MODE' : 'CLOUD MODE'}
        </div>
      </div>

      <div className="flex items-center" style={{ gap: '0.75rem' }}>
        {/* ── Share Button + Popover ───────────────────────── */}
        <div ref={shareRef} className="relative">
          <button
            id="header-share-btn"
            onClick={() => {
              setIsShareOpen((prev) => !prev);
              setIsMenuOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
            aria-label="Share session"
          >
            <span className="material-symbols-outlined block">share</span>
          </button>

          {isShareOpen && <SharePopover isCopied={isCopied} onCopyLink={handleCopyLink} />}
        </div>

        {/* ── Three-dots Menu + Dropdown ───────────────────── */}
        <div ref={menuRef} className="relative">
          <button
            id="header-menu-btn"
            onClick={() => {
              setIsMenuOpen((prev) => !prev);
              setIsShareOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
            aria-label="Session menu"
          >
            <span className="material-symbols-outlined block">more_vert</span>
          </button>

          {isMenuOpen && (
            <MenuDropdown
              onRename={() => {
                setRenameValue(title);
                setIsRenaming(true);
                setIsMenuOpen(false);
              }}
              onExport={handleExport}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      {/* ── Rename Modal ──────────────────────────────────── */}
      {isRenaming && (
        <RenameModal
          ref={renameInputRef}
          value={renameValue}
          onChange={setRenameValue}
          onSubmit={handleRenameSubmit}
          onCancel={() => setIsRenaming(false)}
        />
      )}
    </header>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function SharePopover({
  isCopied,
  onCopyLink,
}: {
  isCopied: boolean;
  onCopyLink: () => void;
}) {
  return (
    <div
      className="absolute right-0 bg-white border border-slate-200 shadow-xl animate-fade-in"
      style={{
        top: 'calc(100% + 0.5rem)',
        borderRadius: '0.875rem',
        width: '18rem',
        padding: '1.25rem',
        zIndex: 50,
      }}
    >
      <p className="text-sm font-semibold text-slate-900" style={{ marginBottom: '0.375rem' }}>
        Share Session
      </p>
      <p className="text-xs text-slate-500" style={{ marginBottom: '1rem', lineHeight: '1.5' }}>
        Copy a link to share this chat session.
      </p>
      <div className="flex" style={{ gap: '0.5rem' }}>
        <div
          className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-600 truncate"
          style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}
        >
          {window.location.href}
        </div>
        <button
          onClick={onCopyLink}
          className={`text-xs font-semibold shrink-0 transition-all ${
            isCopied
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
          style={{ padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1px solid transparent' }}
        >
          {isCopied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function MenuDropdown({
  onRename,
  onExport,
  onDelete,
}: {
  onRename: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const items = [
    { label: 'Rename', icon: 'edit', action: onRename, danger: false },
    { label: 'Export Chat', icon: 'download', action: onExport, danger: false },
    { label: 'Delete Session', icon: 'delete', action: onDelete, danger: true },
  ];

  return (
    <div
      className="absolute right-0 bg-white border border-slate-200 shadow-xl animate-fade-in flex flex-col"
      style={{
        top: 'calc(100% + 0.5rem)',
        borderRadius: '0.75rem',
        width: '13rem',
        padding: '0.375rem',
        zIndex: 50,
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          id={`menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          onClick={item.action}
          className={`flex items-center w-full text-left text-sm transition-colors ${
            item.danger
              ? 'text-red-600 hover:bg-red-50'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
          style={{ gap: '0.625rem', padding: '0.625rem 0.75rem', borderRadius: '0.5rem' }}
        >
          <span
            className={`material-symbols-outlined block ${item.danger ? 'text-red-400' : 'text-slate-400'}`}
            style={{ fontSize: '1.125rem' }}
          >
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

import { forwardRef } from 'react';

const RenameModal = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (val: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
  }
>(function RenameModal({ value, onChange, onSubmit, onCancel }, ref) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 100, backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="bg-white shadow-2xl animate-fade-in flex flex-col"
        style={{ borderRadius: '1rem', padding: '1.5rem', width: '24rem', gap: '1rem' }}
      >
        <p className="text-sm font-semibold text-slate-900">Rename Session</p>
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          className="w-full border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40"
          style={{ padding: '0.625rem 0.75rem', borderRadius: '0.5rem' }}
          placeholder="Enter session name"
        />
        <div className="flex justify-end" style={{ gap: '0.5rem' }}>
          <button
            onClick={onCancel}
            className="text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem' }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
});
