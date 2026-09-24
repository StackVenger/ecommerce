'use client';

import type { ChatMessage } from '@/lib/api/chat';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-[1.25rem] px-4 py-2.5 text-sm font-medium ${
          isUser ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-gray-100 text-gray-900'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
      </div>
    </div>
  );
}
