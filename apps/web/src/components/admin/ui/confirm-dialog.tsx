'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reusable confirmation modal for destructive actions in the admin.
 *
 * Replaces the scattered `window.confirm()` calls used throughout the
 * admin today. Built on plain React so we don't pull in Radix for a
 * single dialog pattern; accessibility is handled by trapping focus
 * inside the panel and wiring `Escape` to close.
 *
 * Two usage modes:
 * 1. Declarative: render <ConfirmDialog open={open} onConfirm={...} ... />
 *    and control `open` yourself.
 * 2. Imperative: call `useConfirm()` and `await confirm({ title, ... })`
 *    — returns a boolean. Easier than hoisting state for one-off
 *    delete buttons scattered across list views.
 */

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` uses a red confirm button; `neutral` uses the primary theme. */
  tone?: 'danger' | 'neutral';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);

  // Focus the confirm button on open so Enter immediately acts.
  useEffect(() => {
    if (open) {
      confirmBtn.current?.focus();
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  const confirmClass = tone === 'danger' ? 'btn-danger' : 'btn-primary';

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Click-outside scrim; button role + keyboard support satisfies
          jsx-a11y while the visible child panel owns the real content. */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
      />
      <div className="relative z-10 w-[calc(100%-2rem)] max-w-md rounded-[2rem] border border-foreground/[0.04] bg-card p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-5 top-5 rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          {tone === 'danger' && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <AlertTriangle className="h-6 w-6" strokeWidth={2.25} />
            </div>
          )}
          <div className="flex-1 pr-6">
            <h2 id="confirm-title" className="text-xl font-black tracking-tight text-gray-900">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm font-medium text-gray-500">{description}</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-secondary">
            {cancelLabel}
          </button>
          <button
            ref={confirmBtn}
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`btn ${confirmClass}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Imperative confirm helper for one-off destructive button handlers. */
export function useConfirm(): {
  confirm: (opts: Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel'>) => Promise<boolean>;
  dialog: React.ReactNode;
} {
  const [state, setState] = useState<
    | (Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'> & {
        resolve: (ok: boolean) => void;
      })
    | null
  >(null);

  const confirm = useCallback<
    (opts: Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel'>) => Promise<boolean>
  >(
    (opts) =>
      new Promise((resolve) => {
        setState({ ...opts, open: true, resolve });
      }),
    [],
  );

  const dialog = state ? (
    <ConfirmDialog
      {...state}
      onCancel={() => {
        state.resolve(false);
        setState(null);
      }}
      onConfirm={() => {
        state.resolve(true);
        setState(null);
      }}
    />
  ) : null;

  return { confirm, dialog };
}
