'use client';

import {
  Package,
  Truck,
  CheckCircle,
  CreditCard,
  MapPin,
  Heart,
  Settings,
  ArrowRight,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { PaymentBadge } from '@/components/payment/payment-badge';
import {
  EmptyState,
  SectionHeader,
  SkeletonBlock,
  StatCard,
  IconTile,
} from '@/components/ui/bento';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api/client';

interface OrderStats {
  totalOrders: number;
  totalSpent: number;
  totalSpentFormatted: string;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalFormatted: string;
  itemCount: number;
  createdAt: string;
}

export default function AccountDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          apiClient.get('/users/orders/stats'),
          apiClient.get('/users/orders?limit=5'),
        ]);

        setStats(statsRes.data.data);
        setRecentOrders(ordersRes.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-6 xl:grid-cols-12">
        <SkeletonBlock className="h-48 rounded-[2rem] col-span-2 md:col-span-6 xl:col-span-7" />
        <SkeletonBlock className="h-48 rounded-[2rem] col-span-2 md:col-span-6 xl:col-span-5" />
        {[...Array(4)].map((_, i) => (
          <SkeletonBlock key={i} className="h-40 rounded-[2rem] md:col-span-3" />
        ))}
        <SkeletonBlock className="h-72 rounded-[2rem] col-span-2 md:col-span-6 xl:col-span-8" />
        <SkeletonBlock className="h-72 rounded-[2rem] col-span-2 md:col-span-6 xl:col-span-4" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: Package,
      tone: 'brand' as const,
    },
    {
      label: 'Processing',
      value: (stats?.pending || 0) + (stats?.confirmed || 0) + (stats?.processing || 0),
      icon: Clock,
      tone: 'purple' as const,
    },
    {
      label: 'In Transit',
      value: stats?.shipped || 0,
      icon: Truck,
      tone: 'orange' as const,
    },
    {
      label: 'Delivered',
      value: stats?.delivered || 0,
      icon: CheckCircle,
      tone: 'emerald' as const,
    },
  ];

  const quickActions = [
    { label: 'My Orders', href: '/account/orders', icon: Package, tone: 'brand' as const },
    { label: 'Addresses', href: '/account/addresses', icon: MapPin, tone: 'blue' as const },
    { label: 'Wishlist', href: '/account/wishlist', icon: Heart, tone: 'rose' as const },
    { label: 'Settings', href: '/account/profile', icon: Settings, tone: 'purple' as const },
  ];

  const initial = (user?.firstName?.charAt(0) || 'U').toUpperCase();

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-6 xl:grid-cols-12">
      {/* Welcome tile */}
      <div className="bento-primary flex flex-col justify-between gap-6 p-6 sm:p-8 col-span-2 md:col-span-6 xl:col-span-7">
        <div className="bento-glow -right-12 -top-12 h-48 w-48 bg-white/10" aria-hidden />
        <div className="bento-glow -bottom-12 -left-12 h-48 w-48 bg-black/10" aria-hidden />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-black text-white backdrop-blur-md">
            {initial}
          </div>
          <span className="rounded-xl bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/80 backdrop-blur-md">
            My account
          </span>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
            Welcome back
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight tracking-tighter text-white sm:text-3xl">
            Hi, {user?.firstName || 'there'}!
          </h2>
          <p className="mt-1 text-sm font-bold text-white/80">
            Here&apos;s a summary of your account activity.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-card px-5 py-2.5 text-xs font-black text-primary transition-all hover:scale-105 active:scale-95"
          >
            Continue shopping
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      {/* Lifetime spend tile */}
      <div className="bento-dark flex flex-col justify-between gap-6 p-6 sm:p-8 col-span-2 md:col-span-6 xl:col-span-5">
        <div className="bento-glow -right-10 -top-10 h-56 w-56 bg-primary/20" aria-hidden />
        <div className="bento-glow -bottom-10 -left-10 h-40 w-40 bg-blue-500/10" aria-hidden />
        <div className="relative z-10 flex items-center gap-3 text-white/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
            <CreditCard className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Total spent</span>
        </div>
        <div className="relative z-10">
          <p className="text-4xl font-black tabular-nums tracking-tighter text-white sm:text-5xl">
            {stats?.totalSpentFormatted || '৳0'}
          </p>
          <p className="mt-2 text-xs font-bold text-white/50">
            Across {stats?.totalOrders || 0} order{(stats?.totalOrders || 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stat tiles */}
      {statCards.map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          tone={stat.tone}
          className="p-5 md:col-span-3 sm:p-6"
        />
      ))}

      {/* Recent Orders */}
      <div className="bento-card p-6 sm:p-8 col-span-2 md:col-span-6 xl:col-span-8">
        <SectionHeader
          title="Recent Orders"
          caption="Your latest purchases"
          action={
            <Link href="/account/orders" className="btn btn-soft btn-sm">
              View all
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          }
        />

        {recentOrders.length > 0 ? (
          <div className="flex flex-col gap-2">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.orderNumber}`}
                className="group flex flex-col gap-3 rounded-[1.5rem] p-3 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 transition-transform duration-500 group-hover:scale-110">
                    <ShoppingBag className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-gray-900 transition-colors group-hover:text-primary">
                      Order #{order.orderNumber}
                    </p>
                    <p className="text-[11px] font-bold text-gray-500">
                      {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} •{' '}
                      {new Date(order.createdAt).toLocaleDateString('en-BD')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pl-16 sm:justify-end sm:pl-0">
                  <PaymentBadge status={order.status} size="sm" />
                  <span className="text-sm font-black tabular-nums tracking-tight text-gray-900">
                    {order.totalFormatted}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            bare
            icon={Package}
            title="No orders yet"
            description="When you place an order it will show up here."
            action={
              <Link href="/" className="btn btn-primary btn-sm">
                Start shopping
              </Link>
            }
            className="py-10"
          />
        )}
      </div>

      {/* Quick Actions */}
      <div className="bento-card p-6 sm:p-8 col-span-2 md:col-span-6 xl:col-span-4">
        <SectionHeader title="Quick Links" caption="Jump right in" />
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col items-center gap-3 rounded-[1.5rem] border border-foreground/[0.03] p-4 text-center transition-all hover:bg-gray-50 hover:shadow-bento"
            >
              <IconTile
                icon={action.icon}
                tone={action.tone}
                size="sm"
                className="group-hover:scale-110"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
