import * as React from 'react';

import { cn } from '../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * If `true`, applies error styling (red border & focus ring).
   */
  error?: boolean;
  /**
   * If `true`, the textarea auto-resizes to fit its content.
   * Uses a controlled approach with the `input` event.
   */
  autoResize?: boolean;
}

/**
 * Textarea component with optional auto-resize and error state.
 *
 * @example
 * ```tsx
 * <Textarea placeholder="Write your message..." />
 * <Textarea autoResize rows={3} />
 * <Textarea error />
 * ```
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, autoResize, onInput, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

    const handleRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const handleAutoResize = React.useCallback(
      (event: React.FormEvent<HTMLTextAreaElement>) => {
        if (autoResize && internalRef.current) {
          internalRef.current.style.height = 'auto';
          internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
        }
        onInput?.(event);
      },
      [autoResize, onInput],
    );

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full border border-gray-300 bg-card px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 transition-colors',
          autoResize && 'resize-none overflow-hidden',
          error && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        ref={handleRef}
        onInput={handleAutoResize}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
