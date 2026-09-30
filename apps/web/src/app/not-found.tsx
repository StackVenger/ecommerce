import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-5">
        {/* 404 tile */}
        <div className="bento-dark flex flex-col justify-between p-8 md:col-span-2 md:p-10">
          <p className="relative z-10 text-sm text-white/60">Error code</p>
          <p className="relative z-10 mt-10 font-heading text-8xl font-semibold tabular-nums leading-none text-white md:text-9xl">
            404
          </p>
        </div>

        {/* Content tile */}
        <div className="bento-card p-8 md:col-span-3 md:p-10">
          <p className="eyebrow mb-3">Lost in the aisles</p>
          <h1 className="mb-3 font-heading text-3xl font-semibold text-gray-900">Page Not Found</h1>
          <p className="mb-2 text-gray-600">পেজটি খুঁজে পাওয়া যায়নি</p>
          <p className="mb-8 text-sm text-gray-500">
            The page you are looking for might have been removed, had its name changed, or is
            temporarily unavailable.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="btn btn-primary">
              Go to Homepage
            </Link>
            <Link href="/products" className="btn btn-soft">
              Browse Products
            </Link>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500">Looking for something specific? Try searching:</p>
            <form action="/search" method="GET" className="mt-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  name="q"
                  placeholder="Search products..."
                  aria-label="Search products"
                  className="field-input min-w-0 flex-1"
                />
                <button type="submit" className="btn btn-dark">
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
