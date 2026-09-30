export default function ShopLoading() {
  return (
    <div className="animate-pulse bg-background pb-16">
      {/* Hero skeleton */}
      <div className="h-[340px] bg-gray-50 sm:h-[420px] lg:h-[500px]" />

      <div className="site-container px-4 sm:px-6 lg:px-8">
        {/* Feature strip skeleton */}
        <div className="grid grid-cols-2 gap-6 border-b border-gray-200 py-8 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-gray-100" />
                <div className="h-2.5 w-16 bg-gray-100" />
              </div>
            </div>
          ))}
        </div>

        {/* Products skeleton */}
        <div className="pt-12">
          <div className="mb-7 space-y-2.5">
            <div className="h-5 w-44 bg-gray-100" />
            <div className="h-0.5 w-12 bg-primary/40" />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-7 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square bg-gray-100" />
                <div className="space-y-2.5 border border-t-0 border-gray-200 p-4">
                  <div className="h-3.5 w-3/4 bg-gray-100" />
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 bg-gray-100" />
                    <div className="h-5 w-5 bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
