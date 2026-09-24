'use client';

import { ArrowRight, Eye, ShoppingCart, ShoppingBag, Filter } from 'lucide-react';

import type { ConversionFunnel as ConversionFunnelData } from '@/lib/api/admin';

import { SectionHeader } from '@/components/ui/bento';
import { cn } from '@/lib/utils';

interface ConversionFunnelProps {
  data: ConversionFunnelData;
}

interface FunnelStepProps {
  label: string;
  value: number;
  percentage: number;
  /** Tile classes (bg + fg) for the icon. */
  toneClass: string;
  /** Fill class for the progress bar. */
  barClass: string;
  icon: React.ReactNode;
}

function FunnelStep({ label, value, percentage, toneClass, barClass, icon }: FunnelStepProps) {
  return (
    <div className="group flex flex-1 flex-col items-center gap-4 rounded-[1.75rem] bg-gray-50 px-5 py-6 text-center transition-all hover:bg-card hover:shadow-bento-hover">
      <div
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110',
          toneClass,
        )}
      >
        {icon}
      </div>
      <div>
        <p className="stat-value text-3xl">{value.toLocaleString()}</p>
        <p className="eyebrow mt-1">{label}</p>
      </div>
      <div className="w-full max-w-[10rem]">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200/70">
          <div
            className={cn('h-full rounded-full', barClass)}
            style={{ width: `${Math.max(Math.min(percentage, 100), 2)}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] font-black tabular-nums text-gray-500">{percentage}%</p>
      </div>
    </div>
  );
}

function FunnelArrow({ rate, label }: { rate: number; label: string }) {
  return (
    <div className="flex flex-row items-center justify-center gap-2 px-1 sm:flex-col sm:px-2">
      <span className="whitespace-nowrap rounded-xl bg-brand-50 px-2.5 py-1 text-[10px] font-black tabular-nums text-brand-700">
        {rate}% {label}
      </span>
      <ArrowRight className="h-4 w-4 rotate-90 text-gray-300 sm:rotate-0" strokeWidth={2.5} />
    </div>
  );
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  return (
    <div className="bento-card p-6 sm:p-8">
      <SectionHeader title="Conversion Funnel" caption="Product views to orders" icon={Filter} />

      {/* Horizontal funnel: stacks on mobile, lays out left-to-right on sm+ */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <FunnelStep
          label="Product Views"
          value={data.totalViews}
          percentage={100}
          toneClass="bg-indigo-50 text-indigo-500"
          barClass="bg-indigo-500"
          icon={<Eye className="h-6 w-6" strokeWidth={2.25} />}
        />

        <FunnelArrow rate={data.viewToCartRate} label="add to cart" />

        <FunnelStep
          label="Added to Cart"
          value={data.totalCartAdds}
          percentage={data.viewToCartRate}
          toneClass="bg-orange-50 text-orange-500"
          barClass="bg-orange-400"
          icon={<ShoppingCart className="h-6 w-6" strokeWidth={2.25} />}
        />

        <FunnelArrow rate={data.cartToOrderRate} label="purchase" />

        <FunnelStep
          label="Orders Placed"
          value={data.totalOrders}
          percentage={data.overallConversionRate}
          toneClass="bg-emerald-50 text-emerald-500"
          barClass="bg-emerald-500"
          icon={<ShoppingBag className="h-6 w-6" strokeWidth={2.25} />}
        />
      </div>

      {/* Summary row */}
      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-foreground/[0.04] pt-6">
        {[
          { label: 'View to Cart', value: data.viewToCartRate, className: 'text-orange-500' },
          { label: 'Cart to Order', value: data.cartToOrderRate, className: 'text-primary' },
          { label: 'Overall', value: data.overallConversionRate, className: 'text-emerald-600' },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="eyebrow">{item.label}</p>
            <p
              className={cn(
                'mt-1 text-xl font-black tabular-nums tracking-tighter',
                item.className,
              )}
            >
              {item.value}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
