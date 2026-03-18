/** ChatInterface — composition root matching the Stitch layout. */

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
  onToggleMode: () => void;
  isToggling: boolean;
}

export function ChatInterface({
  messages,
  isLoading,
  onSend,
  mode,
  onToggleMode,
  isToggling,
}: ChatInterfaceProps) {
  const isLocal = mode?.mode === 'local';

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
          input=""
          isLoading={isLoading}
          isLocal={isLocal}
          isToggling={isToggling}
          onInputChange={() => {}}
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const input = form.querySelector('input') as HTMLInputElement;
            if (input.value.trim()) {
              onSend(input.value);
              input.value = '';
            }
          }}
          onToggleMode={onToggleMode}
        />
      </div>
    </div>
  );
}
