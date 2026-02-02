import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { take: 1 },
            brand: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: item.product.price,
        compareAtPrice: item.product.compareAtPrice,
        image: item.product.images[0]?.url ?? null,
        brand: item.product.brand?.name ?? null,
        category: item.product.category?.name ?? null,
        inStock: item.product.quantity > 0,
        stock: item.product.quantity,
      },
      addedAt: item.createdAt,
    }));
  }

  async addToWishlist(userId: string, productId: string) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    // Check if already in wishlist
    const existing = await this.prisma.wishlist.findFirst({
      where: { userId, productId },
    });

    if (existing) {
      throw new ConflictException('Product is already in your wishlist');
    }

    const item = await this.prisma.wishlist.create({
      data: { userId, productId },
      include: {
        product: {
          include: { images: { take: 1 } },
        },
      },
    });

    this.logger.log(`Product ${productId} added to wishlist for user ${userId}`);

    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      addedAt: item.createdAt,
    };
  }

  async removeFromWishlist(userId: string, productId: string) {
    const item = await this.prisma.wishlist.findFirst({
      where: { userId, productId },
    });

    if (!item) {
      throw new NotFoundException('Product not found in your wishlist');
    }

    await this.prisma.wishlist.delete({
      where: { id: item.id },
    });

    this.logger.log(`Product ${productId} removed from wishlist for user ${userId}`);

    return { removed: true, productId };
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const item = await this.prisma.wishlist.findFirst({
      where: { userId, productId },
    });

    return !!item;
  }

  async getWishlistCount(userId: string): Promise<number> {
    return this.prisma.wishlist.count({
      where: { userId },
    });
  }

  async clearWishlist(userId: string) {
    const { count } = await this.prisma.wishlist.deleteMany({
      where: { userId },
    });

    this.logger.log(`Wishlist cleared for user ${userId}: ${count} items removed`);

    return { cleared: true, removedCount: count };
  }
}
