/** Header — matches the Stitch dashboard header layout. Dynamic title from props. */

interface HeaderProps {
  isLocal: boolean;
  title?: string;
}

export function Header({ isLocal, title = 'New Chat' }: HeaderProps) {
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
          <span className={`animate-pulse ${isLocal ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: '0.375rem', height: '0.375rem', borderRadius: '9999px' }} />
          {isLocal ? 'LOCAL MODE' : 'CLOUD MODE'}
        </div>
      </div>
      <div className="flex items-center" style={{ gap: '0.75rem' }}>
        <button 
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
        >
          <span className="material-symbols-outlined block">share</span>
        </button>
        <button 
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
        >
          <span className="material-symbols-outlined block">more_vert</span>
        </button>
      </div>
    </header>
  );
}
