import { SkeletonBlock } from '@/components/ui/bento';

export default function ProductLoading() {
  return <ProductDetailSkeleton />;
}

/** Bento skeleton mirroring the PDP layout (gallery tile + info tile). */
function ProductDetailSkeleton() {
  return (
    <div className="site-container px-4 py-6 sm:py-8">
      {/* Breadcrumb skeleton */}
      <SkeletonBlock className="mb-6 h-4 w-64 rounded-xl" />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Image gallery skeleton */}
        <div className="bento-card p-3 sm:p-4 lg:col-span-7">
          <SkeletonBlock className="aspect-square rounded-[1.5rem]" />
          <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="aspect-square rounded-[1rem]" />
            ))}
          </div>
        </div>

        {/* Product info skeleton */}
        <div className="bento-card space-y-4 p-6 sm:p-8 lg:col-span-5">
          <SkeletonBlock className="h-3 w-32 rounded-xl" />
          <SkeletonBlock className="h-9 w-3/4 rounded-xl" />
          <SkeletonBlock className="h-4 w-40 rounded-xl" />
          <SkeletonBlock className="h-20 w-full rounded-[1.5rem]" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-10 w-16 rounded-xl" />
            ))}
          </div>
          <div className="flex gap-3">
            <SkeletonBlock className="h-12 w-32 rounded-2xl" />
            <SkeletonBlock className="h-12 flex-1 rounded-2xl" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-24 rounded-[1.25rem]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
