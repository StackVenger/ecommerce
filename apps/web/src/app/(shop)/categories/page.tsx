'use client';

import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Breadcrumbs, EmptyState, ShopSectionHeading } from '@/components/ui/bento';
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

// Fallback cover images for categories that have no `image` set in the DB.
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
    <div className="min-h-screen bg-background">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Categories' }]} />

      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ShopSectionHeading
          as="h1"
          title="Browse Categories"
          caption={
            <>
              Explore our wide range of products across{' '}
              <span className="font-medium text-gray-900">{categories.length} categories</span>
              {totalProducts > 0 && (
                <>
                  {' '}
                  with{' '}
                  <span className="font-medium text-gray-900">
                    {totalProducts.toLocaleString()}+
                  </span>{' '}
                  products
                </>
              )}
            </>
          }
        />

        {/* Category grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-gray-100" />
                <div className="space-y-2.5 border border-t-0 border-gray-200 p-5">
                  <div className="h-4 w-1/2 bg-gray-100" />
                  <div className="h-3 w-1/3 bg-gray-100" />
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
            {categories.map((cat) => {
              const totalCount = getCatProductCount(cat);
              const hasChildren = cat.children && cat.children.length > 0;
              const bgImage = cat.image || CATEGORY_IMAGES[cat.slug];

              // Skip categories with zero products and no children
              if (totalCount === 0 && !hasChildren) {
                return null;
              }

              return (
                <section
                  key={cat.id}
                  className="flex flex-col border border-gray-200 bg-card transition-shadow duration-300 hover:shadow-bento-hover"
                >
                  {/* Parent category tile */}
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="group relative block aspect-[4/3] overflow-hidden bg-gray-50"
                  >
                    {bgImage ? (
                      <img
                        src={bgImage}
                        alt={cat.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        <LayoutGrid className="h-12 w-12" strokeWidth={1.25} />
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col border-t border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-heading text-lg font-semibold text-gray-900">
                          <Link
                            href={`/categories/${cat.slug}`}
                            className="transition-colors hover:text-primary"
                          >
                            {cat.name}
                          </Link>
                        </h3>
                        {cat.nameBn && <p className="mt-0.5 text-sm text-gray-500">{cat.nameBn}</p>}
                      </div>
                      {totalCount > 0 && (
                        <span className="shrink-0 pt-1 text-[13px] tabular-nums text-gray-500">
                          {totalCount} products
                        </span>
                      )}
                    </div>

                    {cat.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-500">{cat.description}</p>
                    )}

                    {/* Subcategory links */}
                    {hasChildren && (
                      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-gray-200 pt-4">
                        {cat.children!.map((sub) => {
                          const subCount = sub.productCount ?? sub._count?.products ?? 0;
                          return (
                            <li key={sub.id}>
                              <Link
                                href={`/categories/${sub.slug}`}
                                className="text-[13px] text-gray-700 transition-colors hover:text-primary"
                              >
                                {sub.name}
                                {subCount > 0 && (
                                  <span className="ml-1 tabular-nums text-gray-500">
                                    ({subCount})
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
