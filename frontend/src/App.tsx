/** App — route-backed shell assembling the sidebar and main content panels. */

import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { Dashboard } from './components/Dashboard';
import { DocumentReader } from './components/DocumentReader';
import { DocumentUpload } from './components/DocumentUpload';
import { Header } from './components/Header';
import { RightPanel } from './components/RightPanel';
import { useChat, useDashboard, useDocuments, useMetrics, useMode } from './hooks/useApp';
import { api } from './lib/api';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, clearChat, sessions, activeSessionId, selectSession, deleteSession } = useChat();
  const { mode, setMode, isToggling } = useMode();
  const { metrics } = useMetrics();
  const { analytics, isLoading: isDashboardLoading } = useDashboard();
  const { documents, refresh: refreshDocuments, addDocument } = useDocuments();

  const handleDeleteDocument = async (doc: string) => {
    try {
      await api.deleteDocument(doc);
      refreshDocuments();
      if (location.pathname === `/documents/${encodeURIComponent(doc)}`) {
        navigate('/chat');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        mode={mode}
        documents={documents}
        onClearChat={clearChat}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onDocumentClick={(doc) => navigate(`/documents/${encodeURIComponent(doc)}`)}
        onDeleteDocument={handleDeleteDocument}
      />

      <main className="flex-1 flex flex-col bg-white dark:bg-slate-950 relative min-w-0">
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route
            path="/chat"
            element={
              <ChatInterface
                messages={messages}
                isLoading={isLoading}
                onSend={sendMessage}
                mode={mode}
                onSetMode={setMode}
                isToggling={isToggling}
                activeSessionId={activeSessionId}
                onUploadComplete={refreshDocuments}
                onAddDocument={addDocument}
              />
            }
          />
          <Route
            path="/upload"
            element={
              <RoutePage isLocal={mode?.mode === 'local'} title="Upload Documents">
                <DocumentUpload onUploadComplete={refreshDocuments} sessionId={activeSessionId} />
              </RoutePage>
            }
          />
          <Route
            path="/dashboard"
            element={<Dashboard analytics={analytics} isLoading={isDashboardLoading} mode={mode} />}
          />
          <Route
            path="/documents/:filename"
            element={<DocumentPreviewPage onClose={() => navigate('/chat')} />}
          />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </main>

      {location.pathname === '/chat' && (
        <RightPanel documents={documents} metrics={metrics} mode={mode} />
      )}
    </div>
  );
}

function RoutePage({
  children,
  isLocal,
  title,
}: {
  children: ReactNode;
  isLocal: boolean;
  title: string;
}) {
  return (
    <div className="flex flex-col w-full relative" style={{ height: '100%' }}>
      <Header isLocal={isLocal} title={title} />
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/70" style={{ padding: '2rem' }}>
        <div className="mx-auto" style={{ maxWidth: '72rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function DocumentPreviewPage({ onClose }: { onClose: () => void }) {
  const params = useParams();
  const filename = params.filename ? decodeURIComponent(params.filename) : null;

  if (!filename) {
    return <Navigate to="/chat" replace />;
  }

  return <DocumentReader filename={filename} onClose={onClose} />;
}
