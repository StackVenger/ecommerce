'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { apiClient } from '@/lib/api/client';

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  image: string | null;
  categoryName: string | null;
}

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced autocomplete fetch
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.get(`/search/suggest?q=${encodeURIComponent(q)}&limit=8`);
      setSuggestions(data.data);
      setIsOpen(data.data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      return;
    }
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          const product = suggestions[selectedIndex];
          setIsOpen(false);
          router.push(`/product/${product.slug}`);
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const formatPrice = (price: number) => `৳${price.toLocaleString('en-BD')}`;

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products..."
          className="w-full rounded-2xl border border-foreground/[0.04] bg-card py-3 pl-11 pr-4 text-sm font-medium shadow-sm outline-none transition-all placeholder:text-gray-400 focus:ring-4 focus:ring-primary/10"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="search-suggestions"
        />

        {/* Search icon */}
        <svg
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
          </div>
        )}
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="search-suggestions"
          role="listbox"
          className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-3xl border border-foreground/[0.04] bg-card p-2 shadow-bento-hover"
        >
          {suggestions.map((item, index) => (
            <Link
              key={item.id}
              href={`/product/${item.slug}`}
              role="option"
              aria-selected={index === selectedIndex}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
                index === selectedIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => setIsOpen(false)}
            >
              {item.image ? (
                <img src={item.image} alt="" className="h-11 w-11 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
                {item.categoryName && <p className="text-xs text-gray-500">{item.categoryName}</p>}
              </div>
              <div className="text-right">
                {item.salePrice ? (
                  <>
                    <p className="text-sm font-black text-rose-600">
                      {formatPrice(item.salePrice)}
                    </p>
                    <p className="text-xs text-gray-400 line-through">{formatPrice(item.price)}</p>
                  </>
                ) : (
                  <p className="text-sm font-black text-gray-900">{formatPrice(item.price)}</p>
                )}
              </div>
            </Link>
          ))}

          {/* View all results link */}
          <div className="mt-1 border-t border-foreground/[0.04] px-2 pt-2">
            <button
              onClick={handleSubmit as any}
              className="w-full rounded-xl py-2 text-center text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              View all results for &quot;{query}&quot;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
