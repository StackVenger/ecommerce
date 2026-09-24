export default function CategoryLoading() {
  return (
    <div className="site-container animate-pulse px-4 py-6 sm:py-8">
      <div className="mb-4 h-3 w-40 rounded-full bg-gray-200" />

      {/* Hero skeleton */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:gap-6 lg:grid-cols-12">
        <div className="h-52 rounded-[2rem] bg-gray-200/70 lg:col-span-9" />
        <div className="h-52 rounded-[2rem] bg-card shadow-bento lg:col-span-3" />
      </div>

      <div className="flex gap-8">
        {/* Filters skeleton */}
        <div className="hidden w-60 space-y-6 rounded-[2rem] bg-card p-6 shadow-bento lg:block">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="mb-3 h-2.5 w-20 rounded-full bg-gray-100" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="h-8 w-full rounded-xl bg-gray-100" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Products grid skeleton */}
        <div className="flex-1">
          <div className="mb-6 flex justify-between">
            <div className="h-3 w-36 rounded-full bg-gray-200" />
            <div className="h-10 w-40 rounded-2xl bg-card shadow-bento" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[1.75rem] border border-foreground/[0.04] bg-card"
              >
                <div className="aspect-square bg-gray-100" />
                <div className="space-y-2.5 p-4">
                  <div className="h-3.5 rounded-full bg-gray-100" />
                  <div className="h-3 w-20 rounded-full bg-gray-100" />
                  <div className="h-5 w-16 rounded-full bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
