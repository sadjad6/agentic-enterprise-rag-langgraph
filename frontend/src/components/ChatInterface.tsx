/** ChatInterface — matches the Stitch dashboard main chat area exactly.
 *  Composes Header, ChatMessage, and ChatInput sub-components.
 */

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../hooks/useApp';
import type { ModeInfo } from '../lib/api';
import { Header } from './Header';
import { MessageBubble, EmptyState, LoadingIndicator } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (query: string, mode: 'rag' | 'agent') => void;
  mode?: ModeInfo | null;
  onToggleMode: () => void;
  isToggling: boolean;
}

export function ChatInterface({ messages, isLoading, onSend, mode, onToggleMode, isToggling }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLocal = mode?.mode === 'local';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim(), 'agent');
    setInput('');
  };

  return (
    <>
      {/* Header — exact Stitch match */}
      <Header isLocal={isLocal} />

      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && <EmptyState />}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <LoadingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Sticky Input Area — exact Stitch match */}
      <ChatInput
        input={input}
        isLoading={isLoading}
        isLocal={isLocal}
        isToggling={isToggling}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onToggleMode={onToggleMode}
      />
    </>
  );
}
