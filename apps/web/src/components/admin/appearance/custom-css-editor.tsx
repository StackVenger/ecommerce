'use client';

import React, { useState, useRef, useEffect } from 'react';

interface CustomCSSEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const CSS_SNIPPETS = [
  {
    name: 'Hide Sale Badge',
    css: `/* Hide sale badges */\n.product-card .sale-badge {\n  display: none;\n}`,
  },
  {
    name: 'Custom Button Style',
    css: `/* Custom primary button */\n.btn-primary {\n  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));\n  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);\n  transition: all 0.3s ease;\n}\n\n.btn-primary:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);\n}`,
  },
  {
    name: 'Rounded Product Images',
    css: `/* Rounded product images */\n.product-card img {\n  border-radius: 12px;\n}`,
  },
  {
    name: 'Custom Header Background',
    css: `/* Gradient header background */\nheader {\n  background: linear-gradient(90deg, #1e3a5f, #2563eb) !important;\n}`,
  },
  {
    name: 'Animated Cart Badge',
    css: `/* Animated cart badge */\n.cart-badge {\n  animation: pulse 2s infinite;\n}\n\n@keyframes pulse {\n  0%, 100% { transform: scale(1); }\n  50% { transform: scale(1.1); }\n}`,
  },
  {
    name: 'Custom Scrollbar',
    css: `/* Custom scrollbar */\n::-webkit-scrollbar {\n  width: 8px;\n}\n\n::-webkit-scrollbar-track {\n  background: #f1f1f1;\n}\n\n::-webkit-scrollbar-thumb {\n  background: var(--color-primary);\n  border-radius: 4px;\n}\n\n::-webkit-scrollbar-thumb:hover {\n  background: var(--color-primary-dark);\n}`,
  },
];

export default function CustomCSSEditor({ value, onChange }: CustomCSSEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const lines = (value || '').split('\n').length;
    setLineCount(Math.max(lines, 20));
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    // Tab key inserts spaces instead of switching focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }

    // Auto-close braces
    if (e.key === '{') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '{\n  \n}' + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const insertSnippet = (css: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const prefix = value ? '\n\n' : '';
    const newValue = value.substring(0, start) + prefix + css + value.substring(start);
    onChange(newValue);
    textarea.focus();
  };

  const formatCSS = () => {
    // Basic CSS formatting
    const formatted = value
      .replace(/\s*{\s*/g, ' {\n  ')
      .replace(/\s*}\s*/g, '\n}\n\n')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\n {2}\n}/g, '\n}')
      .trim();
    onChange(formatted);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={formatCSS} className="btn btn-secondary btn-sm">
            Format CSS
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1.5 border rounded-lg text-xs font-medium ${
              showPreview
                ? 'border-brand-500 text-brand-600 bg-brand-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
        <span className="text-xs text-gray-400">
          {value.length} characters | {(value || '').split('\n').length} lines
        </span>
      </div>

      {/* CSS Snippets */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-2 tracking-tight">Quick Snippets</h3>
        <div className="flex flex-wrap gap-2">
          {CSS_SNIPPETS.map((snippet) => (
            <button
              key={snippet.name}
              onClick={() => insertSnippet(snippet.css)}
              className="btn btn-soft btn-sm"
            >
              + {snippet.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500">
          {/* Line Numbers */}
          <div className="bg-gray-50 border-r border-gray-300 px-3 py-3 select-none">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="text-xs text-gray-400 font-mono leading-5 text-right">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-4 py-3 text-sm font-mono leading-5 resize-none focus:outline-none bg-ink text-green-400"
            style={{ minHeight: `${lineCount * 20 + 24}px`, tabSize: 2 }}
            spellCheck={false}
            placeholder={`/* Add your custom CSS here */\n\n/* Available CSS variables: */\n/* --color-primary, --color-secondary, --color-accent */\n/* --font-heading, --font-body, --font-bangla */\n/* --border-radius, --container-max-width */`}
          />
        </div>
      </div>

      {/* Available Variables Reference */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-black text-gray-900 mb-2 tracking-tight">
          Available CSS Variables
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            '--color-primary',
            '--color-primary-light',
            '--color-primary-dark',
            '--color-secondary',
            '--color-accent',
            '--color-background',
            '--color-surface',
            '--color-text',
            '--color-text-secondary',
            '--color-border',
            '--font-heading',
            '--font-body',
            '--font-bangla',
            '--font-mono',
            '--font-size-base',
            '--border-radius',
            '--border-radius-sm',
            '--border-radius-lg',
            '--container-max-width',
          ].map((varName) => (
            <button
              key={varName}
              onClick={() => {
                const textarea = textareaRef.current;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const newValue =
                    value.substring(0, start) +
                    `var(${varName})` +
                    value.substring(textarea.selectionEnd);
                  onChange(newValue);
                  textarea.focus();
                }
              }}
              className="text-xs font-mono text-brand-600 hover:text-brand-800 text-left px-4 py-2 hover:bg-brand-50 rounded-xl font-bold transition-all"
            >
              {varName}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div>
          <h3 className="text-sm font-black text-gray-900 mb-2 tracking-tight">Live Preview</h3>
          <div className="overflow-hidden rounded-[1.25rem] border border-foreground/[0.06]">
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { font-family: system-ui, sans-serif; padding: 24px; margin: 0; }
                    .product-card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-width: 200px; }
                    .product-card img { width: 100%; height: 150px; object-fit: cover; background: #f1f5f9; display: block; }
                    .product-card .info { padding: 12px; }
                    .product-card .name { font-size: 14px; font-weight: 600; color: #1e293b; }
                    .product-card .price { font-size: 16px; font-weight: 700; color: #2563eb; margin-top: 4px; }
                    .sale-badge { position: absolute; top: 8px; right: 8px; background: #ef4444; color: white; font-size: 11px; padding: 2px 6px; border-radius: 4px; }
                    .btn-primary { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; margin-top: 8px; display: inline-block; }
                    .cart-badge { background: #ef4444; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; }
                    header { background: #1e293b; color: white; padding: 12px 24px; margin: -24px -24px 24px; }
                    ${value}
                  </style>
                </head>
                <body>
                  <header>
                    <div style="display:flex;align-items:center;justify-content:space-between">
                      <strong>BDShop</strong>
                      <span>Cart <span class="cart-badge">3</span></span>
                    </div>
                  </header>
                  <div class="product-card" style="position:relative">
                    <img src="" alt="Product">
                    <span class="sale-badge">SALE</span>
                    <div class="info">
                      <div class="name">Sample Product</div>
                      <div class="price">৳ 1,500.00</div>
                      <button class="btn-primary">Add to Cart</button>
                    </div>
                  </div>
                </body>
                </html>
              `}
              className="w-full h-80 border-0"
              title="CSS Preview"
            />
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="text-sm text-amber-800 font-medium">Caution</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Custom CSS is applied globally. Incorrect CSS may break your store's appearance. Use{' '}
              <code className="bg-amber-100 px-1 rounded">!important</code> sparingly. Test changes
              thoroughly before publishing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
