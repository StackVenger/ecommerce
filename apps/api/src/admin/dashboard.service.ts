import { Injectable, Logger } from '@nestjs/common';

import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { PrismaService } from '../prisma/prisma.service';

interface ResolvedRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
}

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  productsGrowth: number;
  pendingOrders: number;
  processingOrders: number;
  lowStockProducts: number;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  totalSold: number;
  revenue: number;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
  percentage: number;
}

export interface ChartsData {
  revenueOverTime: ChartDataPoint[];
  topProducts: TopProduct[];
  revenueByCategory: CategoryRevenue[];
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  itemCount: number;
}

export interface RecentRegistration {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface LowStockAlert {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  image: string | null;
}

export interface ActivityData {
  recentOrders: RecentOrder[];
  recentRegistrations: RecentRegistration[];
  lowStockAlerts: LowStockAlert[];
}

// ──────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard Statistics ───────────────────────────────────────────────────

  /**
   * Get overall dashboard statistics.
   *
   * Returns aggregate metrics: total revenue, orders, customers, products,
   * along with growth percentages compared to the immediately preceding
   * window of equal length.
   *
   * If no date range is provided, defaults to the last 30 days.
   *
   * All monetary values are in BDT (৳).
   */
  async getStats(query?: DashboardQueryDto): Promise<DashboardStats> {
    const { start, end, prevStart, prevEnd } = this.resolveRange(query);

    const [
      totalRevenue,
      previousRevenue,
      totalOrders,
      previousOrders,
      totalCustomers,
      previousCustomers,
      totalProducts,
      currentProducts,
      previousProducts,
      pendingOrders,
      processingOrders,
      lowStockProducts,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: start, lte: end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: prevStart, lt: prevEnd },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: prevStart, lt: prevEnd } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: start, lte: end }, role: 'CUSTOMER' },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: prevStart, lt: prevEnd },
          role: 'CUSTOMER',
        },
      }),
      this.prisma.product.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.product.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.product.count({
        where: { createdAt: { gte: prevStart, lt: prevEnd } },
      }),
      this.prisma.order.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.order.count({
        where: { status: 'PROCESSING' },
      }),
      this.prisma.product.count({
        where: {
          status: 'ACTIVE',
          quantity: { lte: 10 },
        },
      }),
    ]);

    const currentRev = totalRevenue._sum.totalAmount?.toNumber() ?? 0;
    const prevRev = previousRevenue._sum.totalAmount?.toNumber() ?? 0;

    return {
      totalRevenue: currentRev,
      totalOrders,
      totalCustomers,
      totalProducts,
      revenueGrowth: this.calculateGrowth(currentRev, prevRev),
      ordersGrowth: this.calculateGrowth(totalOrders, previousOrders),
      customersGrowth: this.calculateGrowth(totalCustomers, previousCustomers),
      productsGrowth: this.calculateGrowth(currentProducts, previousProducts),
      pendingOrders,
      processingOrders,
      lowStockProducts,
    };
  }

  // ─── Charts Data ───────────────────────────────────────────────────────────

  /**
   * Get chart data for the admin dashboard.
   *
   * Returns revenue/orders over the requested range, top-selling products,
   * and revenue breakdown by category. Defaults to last 30 days when no
   * range is supplied. All monetary values in BDT (৳).
   */
  async getChartsData(query?: DashboardQueryDto): Promise<ChartsData> {
    const { start, end } = this.resolveRange(query);

    const [revenueOverTime, topProducts, revenueByCategory] = await Promise.all([
      this.getRevenueOverTime(start, end),
      this.getTopProducts(start, end),
      this.getRevenueByCategory(start, end),
    ]);

    return {
      revenueOverTime,
      topProducts,
      revenueByCategory,
    };
  }

  // ─── Activity Feed ─────────────────────────────────────────────────────────

  /**
   * Get recent activity for the admin dashboard.
   *
   * Includes recent orders, new customer registrations, and low stock alerts.
   * All monetary values in BDT (৳).
   */
  async getActivity(): Promise<ActivityData> {
    const [recentOrders, recentRegistrations, lowStockAlerts] = await Promise.all([
      this.getRecentOrders(),
      this.getRecentRegistrations(),
      this.getLowStockAlerts(),
    ]);

    return {
      recentOrders,
      recentRegistrations,
      lowStockAlerts,
    };
  }

  /**
   * Get the 10 most recent orders.
   */
  private async getRecentOrders(): Promise<RecentOrder[]> {
    const orders = await this.prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: `${order.user.firstName} ${order.user.lastName}`,
      customerEmail: order.user.email,
      totalAmount: order.totalAmount.toNumber(),
      status: order.status,
      createdAt: order.createdAt,
      itemCount: order._count.items,
    }));
  }

  /**
   * Get the 10 most recent customer registrations.
   */
  private async getRecentRegistrations(): Promise<RecentRegistration[]> {
    const users = await this.prisma.user.findMany({
      take: 10,
      where: { role: 'CUSTOMER' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      createdAt: user.createdAt,
    }));
  }

  /**
   * Get products with stock at or below their low stock threshold.
   */
  private async getLowStockAlerts(): Promise<LowStockAlert[]> {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        quantity: { lte: 10 },
      },
      take: 20,
      orderBy: { quantity: 'asc' },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        inventory: {
          select: { lowStockThreshold: true },
        },
      },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      stock: product.quantity,
      lowStockThreshold: product.inventory?.lowStockThreshold ?? 10,
      image: product.images?.[0]?.url ?? null,
    }));
  }

  // ─── Chart Data Helpers ─────────────────────────────────────────────────────

  /**
   * Get daily revenue and order counts for the given date range.
   */
  private async getRevenueOverTime(startDate: Date, endDate: Date): Promise<ChartDataPoint[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyMap = new Map<string, { revenue: number; orders: number }>();

    // Initialize all dates in range
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      dailyMap.set(dateKey, { revenue: 0, orders: 0 });
      current.setDate(current.getDate() + 1);
    }

    // Aggregate order data
    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.revenue += order.totalAmount.toNumber();
        existing.orders += 1;
      }
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue),
      orders: data.orders,
    }));
  }

  /**
   * Get top-selling products by quantity sold within the date range.
   */
  private async getTopProducts(start: Date, end: Date): Promise<TopProduct[]> {
    const orderItems = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: 10,
    });

    const productIds = orderItems.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return orderItems.map((item) => ({
      id: item.productId,
      name: productMap.get(item.productId) ?? 'Unknown Product',
      totalSold: item._sum.quantity ?? 0,
      revenue: item._sum.totalPrice?.toNumber() ?? 0,
    }));
  }

  /**
   * Get revenue breakdown by category within the date range.
   */
  private async getRevenueByCategory(start: Date, end: Date): Promise<CategoryRevenue[]> {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
      select: {
        totalPrice: true,
        product: {
          select: {
            category: {
              select: { name: true },
            },
          },
        },
      },
    });

    const categoryMap = new Map<string, number>();
    let totalRevenue = 0;

    for (const item of orderItems) {
      const categoryName = item.product.category?.name ?? 'Uncategorized';
      const amount = item.totalPrice.toNumber();
      categoryMap.set(categoryName, (categoryMap.get(categoryName) ?? 0) + amount);
      totalRevenue += amount;
    }

    return Array.from(categoryMap.entries())
      .map(([category, revenue]) => ({
        category,
        revenue: Math.round(revenue),
        percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Resolve the requested date range plus the immediately preceding window
   * of equal length (used for growth comparisons). Defaults to the last 30
   * days when nothing is supplied. Invalid dates fall back to the default.
   */
  private resolveRange(query?: DashboardQueryDto): ResolvedRange {
    const now = new Date();
    const parse = (s?: string): Date | null => {
      if (!s) {
        return null;
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    let start = parse(query?.startDate);
    let end = parse(query?.endDate);

    if (!start || !end || start > end) {
      end = now;
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // Treat endDate as end-of-day so a single-day range is inclusive.
      end = new Date(end);
      end.setHours(23, 59, 59, 999);
    }

    const durationMs = Math.max(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start.getTime());
    const prevStart = new Date(start.getTime() - durationMs);

    return { start, end, prevStart, prevEnd };
  }

  /**
   * Calculate percentage growth between two values.
   */
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }
}
