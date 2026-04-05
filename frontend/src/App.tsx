/** App — root component assembling the sidebar and main content panels. */

import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { DocumentUpload } from './components/DocumentUpload';
import { RightPanel } from './components/RightPanel';
import { useChat, useMode, useMetrics, useDocuments } from './hooks/useApp';
import { api } from './lib/api';

import { DocumentReader } from './components/DocumentReader';

type Tab = 'chat' | 'documents' | 'upload' | 'dashboard' | 'preview';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [activePreviewDoc, setActivePreviewDoc] = useState<string | null>(null);
  const { messages, isLoading, sendMessage, clearChat, sessions, activeSessionId, selectSession, deleteSession } = useChat();
  const { mode, setMode, isToggling } = useMode();
  const { metrics } = useMetrics();
  const { documents, refresh: refreshDocuments, addDocument } = useDocuments();

  const handleDeleteDocument = async (doc: string) => {
    try {
      await api.deleteDocument(doc);
      refreshDocuments();
      // If we're previewing the deleted doc, go back to chat
      if (activePreviewDoc === doc) {
        setActivePreviewDoc(null);
        setActiveTab('chat');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface messages={messages} isLoading={isLoading} onSend={sendMessage} mode={mode} onSetMode={setMode} isToggling={isToggling} onUploadComplete={refreshDocuments} onAddDocument={addDocument} />;
      case 'upload':
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <h2 className="text-xl font-bold mb-6">Upload Document</h2>
            <DocumentUpload onUploadComplete={refreshDocuments} />
          </div>
        );
      case 'preview':
        return activePreviewDoc ? <DocumentReader filename={activePreviewDoc} onClose={() => setActiveTab('chat')} /> : <div className="p-8">No document selected.</div>;
      default:
        // documents and dashboard tabs are now integrated into RightPanel
        return <ChatInterface messages={messages} isLoading={isLoading} onSend={sendMessage} mode={mode} onSetMode={setMode} isToggling={isToggling} onUploadComplete={refreshDocuments} onAddDocument={addDocument} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mode={mode}
        documents={documents}
        onClearChat={clearChat}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onDocumentClick={(doc) => {
          setActivePreviewDoc(doc);
          setActiveTab('preview');
        }}
        onDeleteDocument={handleDeleteDocument}
      />
      
      <main className="flex-1 flex flex-col bg-white dark:bg-slate-950 relative min-w-0">
        {/* We moved the header logic into ChatInterface so it matches Stitch perfectly. 
            For the upload tab, it just renders normally. */}
        {renderContent()}
      </main>

      {/* Right Insights Panel - Visible alongside the chat */}
      {activeTab === 'chat' && (
        <RightPanel documents={documents} metrics={metrics} mode={mode} />
      )}
    </div>
  );
}
