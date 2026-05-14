import Link from 'next/link';

import type { Banner } from '@/lib/config/site-config';

interface FooterBannersProps {
  banners: Banner[];
}

export function FooterBanners({ banners }: FooterBannersProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-gray-100 bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={
            banners.length === 1
              ? 'grid grid-cols-1'
              : 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'
          }
        >
          {banners.map((b) => {
            const inner = (
              <div className="group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md">
                <img
                  src={b.image}
                  alt={b.title}
                  className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {(b.title || b.titleBn) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                )}
                {(b.title || b.titleBn) && (
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="text-base font-semibold drop-shadow">{b.title}</h3>
                    {b.titleBn && <p className="text-xs opacity-90 drop-shadow">{b.titleBn}</p>}
                  </div>
                )}
              </div>
            );
            return b.link ? (
              <Link key={b.id} href={b.link}>
                {inner}
              </Link>
            ) : (
              <div key={b.id}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
