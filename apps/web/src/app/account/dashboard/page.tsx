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
import { EmptyState, SkeletonBlock, StatCard, IconTile } from '@/components/ui/bento';
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
      <div className="space-y-6">
        <SkeletonBlock className="h-40" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-36" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <SkeletonBlock className="h-72 xl:col-span-2" />
          <SkeletonBlock className="h-72" />
        </div>
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
    <div className="space-y-6">
      {/* Welcome + lifetime spend */}
      <div className="grid border border-gray-200 bg-gray-50 md:grid-cols-5">
        <div className="flex flex-col gap-5 p-6 sm:p-8 md:col-span-3">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-lg font-semibold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Welcome back</p>
              <h1 className="font-heading text-2xl font-semibold text-gray-900 sm:text-[1.75rem]">
                Hi, {user?.firstName || 'there'}!
              </h1>
            </div>
          </div>
          <p className="text-sm text-gray-600">Here&apos;s a summary of your account activity.</p>
          <Link href="/products" className="btn btn-primary w-fit">
            Continue shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex flex-col justify-center gap-2 border-t border-gray-200 p-6 sm:p-8 md:col-span-2 md:border-l md:border-t-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CreditCard className="h-4 w-4" strokeWidth={1.75} />
            Total spent
          </div>
          <p className="font-heading text-3xl font-semibold tabular-nums text-primary sm:text-4xl">
            {stats?.totalSpentFormatted || '৳0'}
          </p>
          <p className="text-sm text-gray-500">
            Across {stats?.totalOrders || 0} order{(stats?.totalOrders || 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
            className="p-5"
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Recent Orders */}
        <section className="bento-card xl:col-span-2">
          <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 className="section-title">Recent Orders</h2>
              <p className="text-sm text-gray-500">Your latest purchases</p>
            </div>
            <Link href="/account/orders" className="btn btn-secondary btn-sm shrink-0">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-gray-100 text-gray-600">
                        <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 transition-colors group-hover:text-primary">
                          Order #{order.orderNumber}
                        </p>
                        <p className="text-[13px] text-gray-500">
                          {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} •{' '}
                          {new Date(order.createdAt).toLocaleDateString('en-BD')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pl-[3.75rem] sm:justify-end sm:pl-0">
                      <PaymentBadge status={order.status} size="sm" />
                      <span className="text-sm font-bold tabular-nums text-gray-900">
                        {order.totalFormatted}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
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
        </section>

        {/* Quick Actions */}
        <section className="bento-card">
          <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
            <h2 className="section-title">Quick Links</h2>
            <p className="text-sm text-gray-500">Jump right in</p>
          </div>
          <ul className="divide-y divide-gray-200">
            {quickActions.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="group flex items-center gap-3 px-5 py-3.5 text-sm text-gray-700 transition-colors hover:text-primary sm:px-6"
                >
                  <IconTile icon={action.icon} tone={action.tone} size="sm" />
                  <span className="flex-1 font-medium">{action.label}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 transition-colors group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
