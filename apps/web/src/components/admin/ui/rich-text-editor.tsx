'use client';

import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Eraser,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';

import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum height for the editing area in pixels. */
  minHeight?: number;
  /** Accessible label for the editor region. */
  ariaLabel?: string;
  /** Optional error-state styling — adds a red border. */
  invalid?: boolean;
  /** Disable interaction (e.g. while saving). */
  disabled?: boolean;
}

/**
 * Admin rich-text editor backed by TipTap. Emits HTML strings so the
 * storefront can render directly via `<RichText>`.
 *
 * Important: `immediatelyRender: false` is required by Next.js App Router
 * — without it the server renders an empty doc and React hydrates with
 * the populated one, producing a mismatch warning.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write here…',
  minHeight = 180,
  ariaLabel,
  invalid = false,
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer' },
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn('prose prose-sm max-w-none focus:outline-none sm:prose-base', 'px-3 py-2'),
        'aria-label': ariaLabel ?? 'Rich text editor',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      // TipTap returns "<p></p>" for an empty doc — collapse to "" so
      // required-field validation still trips. Callers always normalise
      // with `.trim()`, but this keeps stored payloads tidy too.
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Sync external value changes (e.g. when the parent loads data
  // asynchronously and replaces `value` after mount). Skip when the
  // incoming HTML already matches what the editor has, otherwise every
  // local edit would round-trip and reset the caret.
  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = editor.getHTML();
    const next = value || '';
    if (next === current || (!next && current === '<p></p>')) {
      return;
    }
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div
        className={cn('rounded-lg border border-gray-300 bg-white', invalid && 'border-red-300')}
        style={{ minHeight }}
      />
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500',
        invalid && 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} style={{ minHeight }} className="cursor-text" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Toolbar
// ──────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40',
        active && 'bg-teal-50 text-teal-700 hover:bg-teal-100 hover:text-teal-700',
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? '');
    if (url === null) {
      return;
    }
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        label="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        label="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        label="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        label="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        label="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />

      <ToolbarButton onClick={setLink} active={editor.isActive('link')} label="Insert link">
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        label="Clear formatting"
      >
        <Eraser className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        label="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        label="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}
