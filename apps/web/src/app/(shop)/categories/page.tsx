'use client';

import { ArrowUpRight, ChevronRight, LayoutGrid, Package, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { BentoGlow, EmptyState, StatCard } from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';

interface Category {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  description: string | null;
  image: string | null;
  productCount?: number;
  _count?: { products: number };
  children?: Category[];
}

function getCatProductCount(cat: Category): number {
  const own = cat.productCount ?? cat._count?.products ?? 0;
  const childTotal = (cat.children ?? []).reduce((sum, c) => sum + getCatProductCount(c), 0);
  return own + childTotal;
}

// Category background images from Unsplash
const CATEGORY_IMAGES: Record<string, string> = {
  electronics:
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=600&fit=crop&q=80',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600&fit=crop&q=80',
  'home-living':
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&h=600&fit=crop&q=80',
  'beauty-health':
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop&q=80',
  groceries: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&q=80',
  'baby-kids':
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&h=600&fit=crop&q=80',
  'sports-outdoors':
    'https://images.unsplash.com/photo-1461896836934-bd45ba8a0bca?w=800&h=600&fit=crop&q=80',
  'books-stationery':
    'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=800&h=600&fit=crop&q=80',
  automotive:
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop&q=80',
  pets: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=600&fit=crop&q=80',
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/categories?tree=true')
      .then(({ data }) => {
        setCategories(data.data ?? data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalProducts = categories.reduce((sum, cat) => sum + getCatProductCount(cat), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="site-container px-4 py-6 sm:py-8">
        <nav className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900">Categories</span>
        </nav>

        {/* Bento header */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:mb-8 sm:gap-6 lg:grid-cols-12">
          <div className="bento-dark col-span-2 rounded-[2rem] p-8 sm:p-10 lg:col-span-8">
            <BentoGlow variant="dark" />
            <div className="relative z-10">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                <LayoutGrid className="h-6 w-6 text-white" strokeWidth={2.25} />
              </div>
              <h1 className="text-3xl font-black leading-none tracking-tighter text-white sm:text-5xl">
                Browse Categories
              </h1>
              <p className="mt-4 max-w-xl text-sm font-bold text-white/60 sm:text-base">
                Explore our wide range of products across{' '}
                <span className="text-white">{categories.length} categories</span>
                {totalProducts > 0 && (
                  <>
                    {' '}
                    with <span className="text-white">{totalProducts.toLocaleString()}+</span>{' '}
                    products
                  </>
                )}
              </p>
            </div>
          </div>
          <StatCard
            className="lg:col-span-2"
            icon={LayoutGrid}
            tone="brand"
            label="Categories"
            value={categories.length}
            loading={loading}
          />
          <StatCard
            className="lg:col-span-2"
            icon={Package}
            tone="blue"
            label="Products"
            value={totalProducts.toLocaleString()}
            loading={loading}
          />
        </div>

        {/* Category bento grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-6 lg:grid-cols-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`animate-pulse rounded-[2rem] bg-card p-3 shadow-bento ${
                  i < 2 ? 'md:col-span-3 lg:col-span-6' : 'md:col-span-3 lg:col-span-4'
                }`}
              >
                <div className={`rounded-[1.5rem] bg-gray-100 ${i < 2 ? 'h-64' : 'h-44'}`} />
                <div className="flex gap-2 p-3">
                  <div className="h-8 w-20 rounded-xl bg-gray-100" />
                  <div className="h-8 w-24 rounded-xl bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No categories found."
            description="Check back soon for new arrivals!"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-6 lg:grid-cols-12">
            {categories.map((cat, idx) => {
              const totalCount = getCatProductCount(cat);
              const hasChildren = cat.children && cat.children.length > 0;
              const isTall = idx < 2;
              const bgImage = CATEGORY_IMAGES[cat.slug];

              // Skip categories with zero products and no children
              if (totalCount === 0 && !hasChildren) {
                return null;
              }

              return (
                <section
                  key={cat.id}
                  className={`bento-card bento-card-hover flex flex-col p-3 ${
                    isTall ? 'md:col-span-3 lg:col-span-6' : 'md:col-span-3 lg:col-span-4'
                  }`}
                >
                  {/* Parent category tile */}
                  <Link
                    href={`/categories/${cat.slug}`}
                    className={`group relative block overflow-hidden rounded-[1.5rem] ${
                      isTall ? 'h-64 sm:h-72' : 'h-48'
                    }`}
                  >
                    {bgImage ? (
                      <img
                        src={bgImage}
                        alt={cat.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-400 to-brand-700" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />

                    <div className="relative flex h-full flex-col justify-end p-5 sm:p-6">
                      {totalCount > 0 && (
                        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-xl bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                          <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                          {totalCount} products
                        </span>
                      )}

                      <h3 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                        {cat.name}
                      </h3>

                      {cat.nameBn && (
                        <p className="mt-0.5 text-sm font-bold text-white/60">{cat.nameBn}</p>
                      )}

                      {cat.description && isTall && (
                        <p className="mt-2 line-clamp-2 text-sm font-medium text-white/60">
                          {cat.description}
                        </p>
                      )}
                    </div>

                    <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-card text-gray-900 shadow-lg shadow-black/10 transition-all duration-300 group-hover:scale-110 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                      <ArrowUpRight className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                  </Link>

                  {/* Subcategory chips */}
                  {hasChildren && (
                    <div className="flex flex-wrap gap-2 px-2 pb-2 pt-4">
                      {cat.children!.map((sub) => {
                        const subCount = sub.productCount ?? sub._count?.products ?? 0;
                        return (
                          <Link
                            key={sub.id}
                            href={`/categories/${sub.slug}`}
                            className="group/sub inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 transition-all hover:bg-brand-50 hover:text-brand-700"
                          >
                            <span className="truncate">{sub.name}</span>
                            {subCount > 0 && (
                              <span className="rounded-lg bg-card px-1.5 py-0.5 text-[10px] font-black tabular-nums text-gray-400 group-hover/sub:text-brand-600">
                                {subCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
