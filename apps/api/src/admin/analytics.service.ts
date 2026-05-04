import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface MostViewedProduct {
  productId: string;
  name: string;
  image: string | null;
  viewCount: number;
}

export interface MostSearchedTerm {
  term: string;
  searchCount: number;
}

export interface MostOrderedProduct {
  productId: string;
  name: string;
  image: string | null;
  totalQuantity: number;
  totalRevenue: number;
}

export interface MostCartedProduct {
  productId: string;
  name: string;
  image: string | null;
  cartAddCount: number;
}

export interface MostWishlistedProduct {
  productId: string;
  name: string;
  image: string | null;
  wishlistCount: number;
}

export interface ConversionFunnel {
  totalViews: number;
  totalCartAdds: number;
  totalOrders: number;
  viewToCartRate: number;
  cartToOrderRate: number;
  overallConversionRate: number;
}

export interface AnalyticsOverview {
  mostViewed: MostViewedProduct[];
  mostSearched: MostSearchedTerm[];
  mostOrdered: MostOrderedProduct[];
  mostCarted: MostCartedProduct[];
  mostWishlisted: MostWishlistedProduct[];
  funnel: ConversionFunnel;
}

// ──────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Date Helpers ───────────────────────────────────────────────────────────

  private getDateRange(startDate?: string, endDate?: string) {
    const now = new Date();
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : now;
    const start = startDate
      ? new Date(startDate + 'T00:00:00.000Z')
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  // ─── Analytics Overview ─────────────────────────────────────────────────────

  async getAnalyticsOverview(
    startDate?: string,
    endDate?: string,
    limit = 10,
  ): Promise<AnalyticsOverview> {
    const [mostViewed, mostSearched, mostOrdered, mostCarted, mostWishlisted, funnel] =
      await Promise.all([
        this.getMostViewedProducts(startDate, endDate, limit),
        this.getMostSearchedTerms(startDate, endDate, limit),
        this.getMostOrderedProducts(startDate, endDate, limit),
        this.getMostCartedProducts(startDate, endDate, limit),
        this.getMostWishlistedProducts(startDate, endDate, limit),
        this.getConversionFunnel(startDate, endDate),
      ]);

    return { mostViewed, mostSearched, mostOrdered, mostCarted, mostWishlisted, funnel };
  }

  // ─── Most Viewed Products ──────────────────────────────────────────────────

  async getMostViewedProducts(
    startDate?: string,
    endDate?: string,
    limit = 10,
  ): Promise<MostViewedProduct[]> {
    const { start, end } = this.getDateRange(startDate, endDate);

    const grouped = await this.prisma.productViewEvent.groupBy({
      by: ['productId'],
      _count: { productId: true },
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) {
      return [];
    }

    const productIds = grouped.map((g) => g.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
      },
    });

    const productMap = new Map(
      products.map((p) => [p.id, { name: p.name, image: p.images[0]?.url ?? null }]),
    );

    return grouped.map((g) => ({
      productId: g.productId,
      name: productMap.get(g.productId)?.name ?? 'Unknown Product',
      image: productMap.get(g.productId)?.image ?? null,
      viewCount: g._count.productId,
    }));
  }

  // ─── Most Searched Terms ───────────────────────────────────────────────────

  async getMostSearchedTerms(
    startDate?: string,
    endDate?: string,
    limit = 10,
  ): Promise<MostSearchedTerm[]> {
    const { start, end } = this.getDateRange(startDate, endDate);

    const grouped = await this.prisma.searchLog.groupBy({
      by: ['term'],
      _count: { term: true },
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { _count: { term: 'desc' } },
      take: limit,
    });

    return grouped.map((g) => ({
      term: g.term,
      searchCount: g._count.term,
    }));
  }

  // ─── Most Ordered Products ────────────────────────────────────────────────

  async getMostOrderedProducts(
    startDate?: string,
    endDate?: string,
    limit = 10,
  ): Promise<MostOrderedProduct[]> {
    const { start, end } = this.getDateRange(startDate, endDate);

    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) {
      return [];
    }

    const productIds = grouped.map((g) => g.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
      },
    });

    const productMap = new Map(
      products.map((p) => [p.id, { name: p.name, image: p.images[0]?.url ?? null }]),
    );

    return grouped.map((g) => ({
      productId: g.productId,
      name: productMap.get(g.productId)?.name ?? 'Unknown Product',
      image: productMap.get(g.productId)?.image ?? null,
      totalQuantity: g._sum.quantity ?? 0,
      totalRevenue: g._sum.totalPrice?.toNumber() ?? 0,
    }));
  }

  // ─── Most Carted Products ─────────────────────────────────────────────────

  async getMostCartedProducts(
    startDate?: string,
    endDate?: string,
    limit = 10,
  ): Promise<MostCartedProduct[]> {
    const { start, end } = this.getDateRange(startDate, endDate);

    const grouped = await this.prisma.cartItem.groupBy({
      by: ['productId'],
      _count: { productId: true },
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) {
      return [];
    }

    const productIds = grouped.map((g) => g.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
      },
    });

    const productMap = new Map(
      products.map((p) => [p.id, { name: p.name, image: p.images[0]?.url ?? null }]),
    );

    return grouped.map((g) => ({
      productId: g.productId,
      name: productMap.get(g.productId)?.name ?? 'Unknown Product',
      image: productMap.get(g.productId)?.image ?? null,
      cartAddCount: g._count.productId,
    }));
  }

  // ─── Most Wishlisted Products ─────────────────────────────────────────────

  async getMostWishlistedProducts(
    startDate?: string,
    endDate?: string,
    limit = 10,
  ): Promise<MostWishlistedProduct[]> {
    const { start, end } = this.getDateRange(startDate, endDate);

    const grouped = await this.prisma.wishlist.groupBy({
      by: ['productId'],
      _count: { productId: true },
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) {
      return [];
    }

    const productIds = grouped.map((g) => g.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
      },
    });

    const productMap = new Map(
      products.map((p) => [p.id, { name: p.name, image: p.images[0]?.url ?? null }]),
    );

    return grouped.map((g) => ({
      productId: g.productId,
      name: productMap.get(g.productId)?.name ?? 'Unknown Product',
      image: productMap.get(g.productId)?.image ?? null,
      wishlistCount: g._count.productId,
    }));
  }

  // ─── Conversion Funnel ────────────────────────────────────────────────────

  async getConversionFunnel(startDate?: string, endDate?: string): Promise<ConversionFunnel> {
    const { start, end } = this.getDateRange(startDate, endDate);

    const [totalViews, totalCartAdds, totalOrders] = await Promise.all([
      this.prisma.productViewEvent.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.cartItem.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
    ]);

    const viewToCartRate =
      totalViews > 0 ? Math.round((totalCartAdds / totalViews) * 100 * 10) / 10 : 0;
    const cartToOrderRate =
      totalCartAdds > 0 ? Math.round((totalOrders / totalCartAdds) * 100 * 10) / 10 : 0;
    const overallConversionRate =
      totalViews > 0 ? Math.round((totalOrders / totalViews) * 100 * 10) / 10 : 0;

    return {
      totalViews,
      totalCartAdds,
      totalOrders,
      viewToCartRate,
      cartToOrderRate,
      overallConversionRate,
    };
  }
}
