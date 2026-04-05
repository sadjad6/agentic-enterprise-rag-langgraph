/** Sidebar — matches the Stitch dashboard left sidebar layout. Dynamic data from props. */

import type { ModeInfo } from '../lib/api';
import type { ChatSession } from '../hooks/useApp';

type Tab = 'chat' | 'documents' | 'upload' | 'dashboard';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  mode: ModeInfo | null;
  documents: string[];
  onClearChat: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  mode,
  documents,
  onClearChat,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
}: SidebarProps) {
  const isLocal = mode?.mode === 'local';
  const modeName = isLocal ? 'Local Mode' : 'Cloud Mode';

  return (
    <aside 
      className="border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0"
      style={{ width: '16rem' }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center" style={{ padding: '1.5rem', gap: '0.75rem' }}>
        <div 
          className="bg-primary flex items-center justify-center text-white"
          style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem' }}
        >
          <span className="material-symbols-outlined block" style={{ fontSize: '1.25rem' }}>auto_awesome</span>
        </div>
        <div>
          <h1 className="text-base font-bold leading-none">Aether AI</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider" style={{ marginTop: '0.25rem' }}>Enterprise v2.4</p>
        </div>
      </div>

      {/* New Chat */}
      <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
        <button
          onClick={() => { onClearChat(); onTabChange('chat'); }}
          className="w-full flex items-center justify-center bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-colors shadow-sm shadow-primary/20"
          style={{ gap: '0.5rem', padding: '0.625rem 0', borderRadius: '0.75rem' }}
        >
          <span className="material-symbols-outlined block" style={{ fontSize: '1.125rem' }}>add</span>
          New Chat
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col" style={{ padding: '0 0.5rem', gap: '1.5rem' }}>
        {/* Recent Chats */}
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest" style={{ padding: '0 1rem', marginBottom: '0.5rem' }}>Recent</p>
          <div className="flex flex-col" style={{ gap: '0.125rem' }}>
            {sessions.length === 0 ? (
               <div className="text-[11px] text-slate-400 font-medium px-4 py-2 italic">
                 No recent chats
               </div>
            ) : (
               sessions.map((session) => {
                 const isActive = activeSessionId === session.id && activeTab === 'chat';
                 return (
                   <div
                     key={session.id}
                     className={`w-full flex items-center justify-between text-sm font-medium transition-colors group cursor-pointer ${
                       isActive
                         ? 'bg-primary/5 text-primary'
                         : 'text-slate-600 hover:bg-slate-50'
                     }`}
                     style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem' }}
                     onClick={() => {
                        onSelectSession(session.id);
                        onTabChange('chat');
                     }}
                   >
                     <div className="flex items-center truncate max-w-[80%]" style={{ gap: '0.75rem' }}>
                       <span className={`material-symbols-outlined block shrink-0 ${isActive ? '' : 'text-slate-400'}`} style={{ fontSize: '1.125rem' }}>
                         chat_bubble
                       </span>
                       <span className="truncate">{session.title}</span>
                     </div>
                     
                     <button
                        onClick={(e) => {
                           e.stopPropagation();
                           onDeleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 rounded p-1 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                     >
                        <span className="material-symbols-outlined block" style={{ fontSize: '1.125rem' }}>delete</span>
                     </button>
                   </div>
                 );
               })
            )}
          </div>
        </div>

        {/* Collections */}
        <div>
          <div className="flex items-center justify-between" style={{ padding: '0 1rem', marginBottom: '0.5rem' }}>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Collections</p>
            <button onClick={() => onTabChange('upload')} className="cursor-pointer flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-400 hover:text-primary transition-colors block" style={{ fontSize: '0.875rem' }}>add_circle</span>
            </button>
          </div>
          <div className="flex flex-col" style={{ gap: '0.125rem' }}>
            {documents.length === 0 ? (
              <div 
                className="flex items-center text-slate-400 text-sm"
                style={{ gap: '0.75rem', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}
              >
                <span className="material-symbols-outlined block" style={{ fontSize: '1.125rem' }}>folder_off</span>
                <span className="truncate">No documents yet</span>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc}
                  className="flex items-center text-slate-600 hover:bg-slate-50 text-sm cursor-pointer transition-colors"
                  style={{ gap: '0.75rem', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}
                >
                  <span className="material-symbols-outlined text-slate-400 block" style={{ fontSize: '1.125rem' }}>folder</span>
                  <span className="truncate">{doc}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </nav>

      {/* User Profile Card */}
      <div className="border-t border-slate-100 dark:border-slate-800" style={{ padding: '1rem' }}>
        <div 
          className="flex items-center hover:bg-slate-50 cursor-pointer transition-colors"
          style={{ gap: '0.75rem', padding: '0.5rem', borderRadius: '0.75rem' }}
        >
          <div className={`flex items-center justify-center text-white shadow-sm shrink-0 ${
            isLocal ? 'bg-emerald-600' : 'bg-primary'
          }`} style={{ width: '2.25rem', height: '2.25rem', borderRadius: '9999px' }}>
            <span className="material-symbols-outlined block" style={{ fontSize: '1.125rem' }}>person</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate leading-tight">
              {modeName}
            </p>
            <p className="text-xs text-slate-500 truncate" style={{ marginTop: '0.125rem' }}>
              {isLocal ? 'GDPR Safe' : 'Cloud API'}
            </p>
          </div>
          <span className="material-symbols-outlined text-slate-400 shrink-0 block" style={{ fontSize: '1.125rem' }}>settings</span>
        </div>
      </div>
    </aside>
  );
}
