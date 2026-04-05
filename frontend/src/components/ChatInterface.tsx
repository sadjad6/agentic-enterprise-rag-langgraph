/** ChatInterface — composition root matching the Stitch layout. */

import { useState } from 'react';
import { Header } from './Header';
import { ChatMessage as ChatMessageBubble, LoadingIndicator, EmptyState } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ModeInfo } from '../lib/api';
import type { ChatMessage } from '../hooks/useApp';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (content: string) => void;
  mode: ModeInfo | null;
  onSetMode: (targetMode: 'local' | 'cloud') => void;
  isToggling: boolean;
  onUploadComplete?: () => void;
  onAddDocument?: (fileName: string) => void;
}

export function ChatInterface({
  messages,
  isLoading,
  onSend,
  mode,
  onSetMode,
  isToggling,
  onUploadComplete,
  onAddDocument,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const isLocal = mode?.mode === 'local';

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // You can add api to imports if missing, wait I'll add it in the next chunk if needed. Wait I forgot to import api!
      // I'll import it in the next step. Let's assume it's imported for now or I will fix it.
      const { api } = await import('../lib/api');
      await api.upload(file);
      onUploadComplete?.();
      onAddDocument?.(file.name);
      alert(`File ${file.name} uploaded successfully!`);
    } catch (e) {
      alert(`Upload failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col w-full relative" style={{ height: '100%' }}>
      <Header isLocal={isLocal} title="Current Session" />

      {/* Main chat area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '2rem' }}>
        <div className="mx-auto flex flex-col" style={{ maxWidth: '56rem', gap: '2rem' }}>
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {messages.map((msg, i) => (
                <ChatMessageBubble key={i} message={msg} />
              ))}
            </>
          )}

          {isLoading && <LoadingIndicator />}
        </div>
      </div>

      {/* Sticky Input Area */}
      <div className="shrink-0 w-full">
        <ChatInput
          input={inputValue}
          isLoading={isLoading || isUploading}
          isLocal={isLocal}
          isToggling={isToggling}
          onInputChange={setInputValue}
          onFileSelect={handleFileUpload}
          onSubmit={(e) => {
            e.preventDefault();
            if (inputValue.trim()) {
              onSend(inputValue);
              setInputValue('');
            }
          }}
          onSetMode={onSetMode}
        />
      </div>
    </div>
  );
}
