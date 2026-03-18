/** Sidebar — matches the Stitch dashboard left sidebar exactly. */

import type { ModeInfo } from '../lib/api';

type Tab = 'chat' | 'documents' | 'upload' | 'dashboard';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  mode: ModeInfo | null;
  onToggleMode: () => void;
  isToggling: boolean;
  documents: string[];
  onClearChat: () => void;
}

export function Sidebar({
  activeTab, onTabChange, mode, onToggleMode, isToggling, documents, onClearChat,
}: SidebarProps) {
  const isLocal = mode?.mode === 'local';

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
      {/* Logo / Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-xl">auto_awesome</span>
        </div>
        <div>
          <h1 className="text-base font-bold leading-none">Aether AI</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Enterprise v2.4</p>
        </div>
      </div>
      
      {/* New Chat */}
      <div className="px-4 mb-4">
        <button
          onClick={() => { onClearChat(); onTabChange('chat'); }}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Chat
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 custom-scrollbar space-y-6">
        {/* Recent */}
        <div>
          <p className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Recent</p>
          <div className="space-y-0.5">
            <button
              onClick={() => onTabChange('chat')}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'chat'
                  ? 'bg-primary/5 text-primary'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`material-symbols-outlined text-lg ${activeTab === 'chat' ? '' : 'text-slate-400'}`}>chat_bubble</span>
              <span className="truncate">Current Session</span>
            </button>
          </div>
        </div>

        {/* Collections */}
        <div>
          <div className="flex items-center justify-between px-4 mb-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Collections</p>
            <button
              onClick={() => onTabChange('upload')}
              className="cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-slate-400 hover:text-primary">add_circle</span>
            </button>
          </div>
          <div className="space-y-0.5">
            {documents.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-600 text-sm">
                <span className="material-symbols-outlined text-lg text-slate-400">folder</span>
                <span className="truncate">No documents yet</span>
              </div>
            ) : (
              documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 text-sm cursor-pointer">
                  <span className="material-symbols-outlined text-lg text-slate-400">folder</span>
                  <span className="truncate">{doc}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </nav>

      {/* User Profile Card — matches Stitch exactly */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onToggleMode}
          disabled={isToggling}
          className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer"
        >
          <div className={`size-9 rounded-full overflow-hidden flex items-center justify-center ${
            isLocal ? 'bg-emerald-100' : 'bg-purple-100'
          }`}>
            <span className={`material-symbols-outlined text-lg ${isLocal ? 'text-emerald-600' : 'text-purple-600'}`}>
              {isLocal ? 'shield' : 'cloud'}
            </span>
          </div>
          <div className="flex-1 overflow-hidden text-left">
            <p className="text-sm font-semibold truncate">
              {isLocal ? 'Local Mode' : 'Cloud Mode'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {isToggling ? 'Switching...' : isLocal ? 'GDPR Safe' : 'Enterprise Admin'}
            </p>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-lg">settings</span>
        </button>
      </div>
    </aside>
  );
}
