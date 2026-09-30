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
    <section className="pb-12 pt-4">
      <div className="site-container px-4 sm:px-6 lg:px-8">
        <div
          className={
            banners.length === 1
              ? 'grid grid-cols-1'
              : 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'
          }
        >
          {banners.map((b) => {
            const inner = (
              <div className="group relative overflow-hidden rounded-lg bg-gray-50">
                <img
                  src={b.image}
                  alt={b.title}
                  className="h-40 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-48"
                  loading="lazy"
                />
                {(b.title || b.titleBn) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
                )}
                {(b.title || b.titleBn) && (
                  <div className="absolute inset-y-0 left-6 right-6 flex flex-col justify-center text-white">
                    <h3 className="font-heading text-xl font-semibold sm:text-2xl">{b.title}</h3>
                    {b.titleBn && <p className="mt-1 text-sm opacity-90">{b.titleBn}</p>}
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
