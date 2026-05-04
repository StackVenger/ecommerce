'use client';

import { ArrowRight, Eye, ShoppingCart, ShoppingBag } from 'lucide-react';

import type { ConversionFunnel as ConversionFunnelData } from '@/lib/api/admin';

interface ConversionFunnelProps {
  data: ConversionFunnelData;
}

interface FunnelStepProps {
  label: string;
  value: number;
  percentage: number;
  color: string;
  bgColor: string;
  iconBg: string;
  icon: React.ReactNode;
}

function FunnelStep({ label, value, percentage, color, bgColor, iconBg, icon }: FunnelStepProps) {
  return (
    <div
      className="flex flex-1 flex-col items-center gap-3 rounded-xl px-4 py-5 text-center"
      style={{ backgroundColor: bgColor }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBg, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color }}>
          {value.toLocaleString()}
        </p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
      </div>
      <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold text-gray-500">
        {percentage}%
      </span>
    </div>
  );
}

function FunnelArrow({ rate, label }: { rate: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-2 sm:px-3">
      <span className="whitespace-nowrap text-xs font-semibold text-teal-600">
        {rate}% {label}
      </span>
      <ArrowRight className="h-5 w-5 text-gray-400" />
    </div>
  );
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Conversion Funnel</h3>
        <p className="text-sm text-gray-500">Product views to orders conversion</p>
      </div>

      {/* Horizontal funnel: stacks on mobile, lays out left-to-right on sm+ */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <FunnelStep
          label="Product Views"
          value={data.totalViews}
          percentage={100}
          color="#4f46e5"
          bgColor="#eef2ff"
          iconBg="#e0e7ff"
          icon={<Eye className="h-5 w-5" />}
        />

        <FunnelArrow rate={data.viewToCartRate} label="add to cart" />

        <FunnelStep
          label="Added to Cart"
          value={data.totalCartAdds}
          percentage={data.viewToCartRate}
          color="#0891b2"
          bgColor="#ecfeff"
          iconBg="#cffafe"
          icon={<ShoppingCart className="h-5 w-5" />}
        />

        <FunnelArrow rate={data.cartToOrderRate} label="purchase" />

        <FunnelStep
          label="Orders Placed"
          value={data.totalOrders}
          percentage={data.overallConversionRate}
          color="#059669"
          bgColor="#ecfdf5"
          iconBg="#d1fae5"
          icon={<ShoppingBag className="h-5 w-5" />}
        />
      </div>

      {/* Summary row */}
      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">View to Cart</p>
          <p className="text-lg font-bold text-cyan-600">{data.viewToCartRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Cart to Order</p>
          <p className="text-lg font-bold text-teal-600">{data.cartToOrderRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Overall</p>
          <p className="text-lg font-bold text-green-600">{data.overallConversionRate}%</p>
        </div>
      </div>
    </div>
  );
}
