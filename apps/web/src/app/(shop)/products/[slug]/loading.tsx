import { SkeletonBlock } from '@/components/ui/bento';

export default function ProductLoading() {
  return <ProductDetailSkeleton />;
}

/** Skeleton mirroring the PDP layout (breadcrumb strip, gallery + bordered info panel). */
function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Breadcrumb skeleton */}
      <div className="breadcrumb-bar">
        <div className="site-container px-4 py-3 sm:px-6 lg:px-8">
          <SkeletonBlock className="h-4 w-64" />
        </div>
      </div>

      <div className="site-container px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Image gallery skeleton */}
          <div className="lg:col-span-6">
            <SkeletonBlock className="aspect-square" />
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBlock
                  key={i}
                  className={`aspect-square ${i === 4 ? 'hidden sm:block' : ''}`}
                />
              ))}
            </div>
          </div>

          {/* Product info skeleton */}
          <div className="space-y-4 border border-gray-200 p-5 sm:p-6 lg:col-span-6">
            <SkeletonBlock className="h-7 w-3/4" />
            <SkeletonBlock className="h-8 w-32" />
            <div className="space-y-2">
              <SkeletonBlock className="h-3.5 w-40" />
              <SkeletonBlock className="h-3.5 w-48" />
              <SkeletonBlock className="h-3.5 w-36" />
            </div>
            <SkeletonBlock className="h-16 w-full" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-10 w-12" />
              ))}
            </div>
            <div className="flex gap-3">
              <SkeletonBlock className="h-[3.125rem] w-32" />
              <SkeletonBlock className="h-[3.125rem] flex-1" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-10" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
