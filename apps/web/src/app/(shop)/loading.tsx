export default function ShopLoading() {
  return (
    <div className="site-container animate-pulse px-4 pb-16 pt-4 sm:pt-6">
      {/* Hero bento skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="h-[380px] rounded-[2rem] bg-gray-200/70 sm:h-[440px] sm:rounded-[2.5rem] lg:col-span-8 lg:h-[520px]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:col-span-4 lg:grid-cols-1">
          <div className="h-[220px] rounded-[2rem] bg-brand-100 lg:h-auto" />
          <div className="h-[220px] rounded-[2rem] bg-gray-200/70 lg:h-auto" />
        </div>
      </div>

      {/* Trust tiles skeleton */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-[2rem] bg-card p-5 shadow-bento">
            <div className="h-10 w-10 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded-full bg-gray-100" />
              <div className="h-2.5 w-16 rounded-full bg-gray-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Products skeleton */}
      <div className="mt-4 rounded-[2.5rem] bg-card p-5 shadow-bento sm:mt-6 sm:p-8">
        <div className="mb-6 space-y-2">
          <div className="h-5 w-44 rounded-full bg-gray-100" />
          <div className="h-2.5 w-28 rounded-full bg-gray-100" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[1.75rem] border border-foreground/[0.04]"
            >
              <div className="aspect-square bg-gray-100" />
              <div className="space-y-2.5 p-4">
                <div className="h-3.5 w-full rounded-full bg-gray-100" />
                <div className="h-3 w-20 rounded-full bg-gray-100" />
                <div className="h-5 w-16 rounded-full bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
