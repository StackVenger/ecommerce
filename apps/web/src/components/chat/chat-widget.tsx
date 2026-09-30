'use client';

import { MessageCircle, X, Trash2, Send } from 'lucide-react';
import { useRef, useEffect, useState, Fragment } from 'react';

import { ChatMessageBubble } from './chat-message-bubble';
import { ChatProductCards } from './chat-product-cards';
import { ChatSuggestedQuestions } from './chat-suggested-questions';

import { useChat } from '@/hooks/use-chat';

const STARTER_QUESTIONS = [
  'What categories do you have?',
  'Show me featured products',
  'What are the best-rated products?',
];

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function ChatWidget() {
  const { messages, isLoading, isOpen, toggleChat, closeChat, sendMessage, clearMessages } =
    useChat();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) {
      return;
    }
    sendMessage(input.trim());
    setInput('');
  };

  const handleSuggestedQuestion = (question: string) => {
    if (isLoading) {
      return;
    }
    sendMessage(question);
  };

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[65] flex h-[32rem] w-[calc(100%-2rem)] max-w-[22rem] flex-col overflow-hidden border border-gray-200 bg-card shadow-bento-hover sm:right-6 sm:max-w-96">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border border-white/40">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-white">
                  Shopping Assistant
                </h3>
                <p className="text-xs text-white/80">Ask about our products</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  title="Clear chat"
                  className="p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={closeChat}
                title="Close"
                className="p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="mb-4 flex h-14 w-14 items-center justify-center">
                  <MessageCircle className="h-10 w-10 text-primary" strokeWidth={1.5} />
                </div>
                <h4 className="mb-1 font-heading text-base font-semibold text-gray-900">
                  Hi there!
                </h4>
                <p className="mb-4 text-xs text-gray-500">
                  I can help you find products, compare prices, and answer questions about our
                  store.
                </p>
                <div className="flex flex-col gap-1.5 w-full">
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSuggestedQuestion(q)}
                      className="border border-gray-200 bg-card px-4 py-2.5 text-left text-xs text-gray-700 transition-colors hover:border-primary hover:text-primary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <Fragment key={i}>
                    <ChatMessageBubble message={msg} />
                    {msg.products && msg.products.length > 0 && (
                      <ChatProductCards products={msg.products} />
                    )}
                    {msg.suggestedQuestions &&
                      msg.suggestedQuestions.length > 0 &&
                      i === messages.length - 1 && (
                        <ChatSuggestedQuestions
                          questions={msg.suggestedQuestions}
                          onSelect={handleSuggestedQuestion}
                        />
                      )}
                  </Fragment>
                ))}
                {isLoading && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about products..."
                className="field-input h-10 min-w-0 flex-1"
                disabled={isLoading}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="btn-icon bg-primary text-white hover:bg-brand-700"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 z-[65] flex h-12 w-12 items-center justify-center bg-primary text-white shadow-bento-hover transition-colors hover:bg-ink sm:right-6"
        aria-label={isOpen ? 'Close chat' : 'Open chat assistant'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
}
