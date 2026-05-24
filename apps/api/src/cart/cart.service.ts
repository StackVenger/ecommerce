import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

/**
 * Cart summary with calculated totals.
 */
export interface CartSummary {
  id: string;
  userId: string | null;
  sessionId: string | null;
  items: CartItemWithProduct[];
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
  couponCode: string | null;
  /**
   * Items the server silently removed during this load because the product
   * was archived or the variant deactivated. Empty when nothing changed.
   */
  removedItems: { name: string; reason: 'archived' | 'variant_inactive' }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemVariantSummary {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  isActive: boolean;
  options: Record<string, string>;
}

export interface CartItemWithProduct {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    sku: string;
    quantity: number;
    stock: number;
    images: any[];
    status: string;
  };
  variant: CartItemVariantSummary | null;
}

/**
 * Shopping cart service.
 *
 * Handles cart lifecycle management for both authenticated users and
 * anonymous guests. Guest carts are identified by a session ID and
 * can be merged into a user cart upon authentication.
 */
@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Cart Lifecycle ──────────────────────────────────────────────────────────

  /**
   * Get or create a cart for the given user or guest session.
   */
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<CartSummary> {
    let cart = await this.findCartRaw(userId, sessionId);

    if (cart) {
      return this.buildCartSummary(cart);
    }

    cart = await this.prisma.cart.create({
      data: {
        ...(userId ? { userId } : {}),
        ...(sessionId ? { sessionId } : {}),
        expiresAt: this.getCartExpiry(),
      },
      include: {
        items: {
          include: { product: this.productSelect(), variant: this.variantSelect() },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    this.logger.debug(
      `Created new cart: ${cart.id} for ${userId ? `user ${userId}` : `guest ${sessionId}`}`,
    );

    return this.buildCartSummary(cart);
  }

  /**
   * Get the cart with full details and calculated totals.
   */
  async getCart(userId?: string, sessionId?: string): Promise<CartSummary> {
    const cart = await this.findCartRaw(userId, sessionId);

    if (!cart) {
      return this.getOrCreateCart(userId, sessionId);
    }

    return this.buildCartSummary(cart);
  }

  // ─── Item Operations ─────────────────────────────────────────────────────────

  /**
   * Add an item to the cart with stock validation.
   */
  async addItem(dto: AddCartItemDto, userId?: string, sessionId?: string): Promise<CartSummary> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== 'ACTIVE') {
      throw new BadRequestException('Product is not available for purchase');
    }

    // If a variant was specified, resolve it and use its price/stock.
    // Otherwise fall back to the base product's price/stock.
    let variant: { id: string; price: unknown; quantity: number; isActive: boolean } | null = null;
    if (dto.variantId) {
      variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: dto.productId },
        select: { id: true, price: true, quantity: true, isActive: true },
      });

      if (!variant) {
        throw new NotFoundException('Variant not found for this product');
      }
      if (!variant.isActive) {
        throw new BadRequestException('The selected variant is not available');
      }
    }

    const availableStock = variant ? variant.quantity : product.quantity;
    const lineUnitPrice = variant ? variant.price : product.price;

    if (availableStock < dto.quantity) {
      throw new BadRequestException(`Insufficient stock. Only ${availableStock} items available.`);
    }

    const cartSummary = await this.getOrCreateCart(userId, sessionId);

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cartSummary.id,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;

      if (availableStock < newQuantity) {
        throw new BadRequestException(
          `Cannot add ${dto.quantity} more. You already have ${existingItem.quantity} in cart and only ${availableStock} are available.`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity, price: lineUnitPrice as never },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cartSummary.id,
          productId: dto.productId,
          variantId: dto.variantId || null,
          quantity: dto.quantity,
          price: lineUnitPrice as never,
        },
      });
    }

    return this.getCartByIdSummary(cartSummary.id);
  }

  /**
   * Update the quantity of a specific cart item.
   */
  async updateItemQuantity(
    itemId: string,
    dto: UpdateCartItemDto,
    userId?: string,
    sessionId?: string,
  ): Promise<CartSummary> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, product: true, variant: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    this.verifyCartOwnership(cartItem.cart, userId, sessionId);

    const availableStock = cartItem.variant ? cartItem.variant.quantity : cartItem.product.quantity;

    if (availableStock < dto.quantity) {
      throw new BadRequestException(`Insufficient stock. Only ${availableStock} items available.`);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCartByIdSummary(cartItem.cartId);
  }

  /**
   * Remove a specific item from the cart.
   */
  async removeItem(itemId: string, userId?: string, sessionId?: string): Promise<CartSummary> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    this.verifyCartOwnership(cartItem.cart, userId, sessionId);

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.getCartByIdSummary(cartItem.cartId);
  }

  /**
   * Remove all items from the cart.
   */
  async clearCart(userId?: string, sessionId?: string): Promise<CartSummary> {
    const cart = await this.findCartRaw(userId, sessionId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: null, discount: 0 },
    });

    return this.getCartByIdSummary(cart.id);
  }

  // ─── Coupon Operations ────────────────────────────────────────────────────────

  /**
   * Apply a coupon code to the cart.
   *
   * Validates the coupon exists, is active, has not expired, and has not
   * exceeded its usage limit. Calculates the discount based on coupon type
   * (percentage or fixed amount) and minimum order requirements.
   *
   * @param dto - Coupon code to apply
   * @param userId - Authenticated user ID (optional)
   * @param sessionId - Guest session identifier (optional)
   * @returns Updated cart summary with discount applied
   */
  async applyCoupon(
    dto: ApplyCouponDto,
    userId?: string,
    sessionId?: string,
  ): Promise<CartSummary> {
    const cart = await this.findCartRaw(userId, sessionId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Look up the coupon
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    // Validate coupon is active
    if (!coupon.isActive) {
      throw new BadRequestException('This coupon is no longer active');
    }

    // Validate expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new BadRequestException('This coupon has expired');
    }

    // Validate start date
    if (coupon.startsAt && new Date(coupon.startsAt) > new Date()) {
      throw new BadRequestException('This coupon is not yet active');
    }

    // Validate usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    // Calculate cart subtotal for minimum order validation
    const cartSummary = this.buildCartSummary(cart);

    if (coupon.minOrderAmount && cartSummary.subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `Minimum order amount of ৳${Number(coupon.minOrderAmount)} required for this coupon`,
      );
    }

    // Calculate discount
    let discount: number;

    if (coupon.type === 'PERCENTAGE') {
      discount = (cartSummary.subtotal * Number(coupon.value)) / 100;

      // Apply max discount cap only when the admin actually set a positive
      // value. `coupon.maxDiscount` is a Prisma Decimal (always truthy as an
      // object), and the column defaults to 0 — so a plain truthiness check
      // would clamp every PERCENTAGE coupon's discount to 0.
      const maxCap = Number(coupon.maxDiscount ?? 0);
      if (maxCap > 0 && discount > maxCap) {
        discount = maxCap;
      }
    } else {
      // FIXED amount discount
      discount = Number(coupon.value);
    }

    // Ensure discount does not exceed subtotal
    discount = Math.min(discount, cartSummary.subtotal);

    // Apply coupon to cart
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: coupon.code,
        discount,
      },
    });

    this.logger.log(
      `Applied coupon "${coupon.code}" to cart ${cart.id}: discount ৳${discount.toFixed(2)}`,
    );

    return this.getCartByIdSummary(cart.id);
  }

  /**
   * Remove the applied coupon from the cart.
   *
   * @param userId - Authenticated user ID (optional)
   * @param sessionId - Guest session identifier (optional)
   * @returns Updated cart summary with coupon removed
   */
  async removeCoupon(userId?: string, sessionId?: string): Promise<CartSummary> {
    const cart = await this.findCartRaw(userId, sessionId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (!cart.couponCode) {
      throw new BadRequestException('No coupon is applied to this cart');
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: null,
        discount: 0,
      },
    });

    this.logger.log(`Removed coupon from cart ${cart.id}`);

    return this.getCartByIdSummary(cart.id);
  }

  // ─── Cart Merge ───────────────────────────────────────────────────────────────

  /**
   * Merge a guest cart into an authenticated user's cart.
   */
  async mergeGuestCart(userId: string, sessionId: string): Promise<CartSummary> {
    const guestCart = await this.prisma.cart.findFirst({
      where: { sessionId, userId: null },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return this.getOrCreateCart(userId);
    }

    const userCartSummary = await this.getOrCreateCart(userId);
    const userCartId = userCartSummary.id;

    for (const guestItem of guestCart.items) {
      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId: userCartId,
          productId: guestItem.productId,
          variantId: guestItem.variantId,
        },
      });

      if (existingItem) {
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + guestItem.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCartId,
            productId: guestItem.productId,
            variantId: guestItem.variantId,
            quantity: guestItem.quantity,
            price: guestItem.price,
          },
        });
      }
    }

    await this.prisma.cart.delete({ where: { id: guestCart.id } });

    this.logger.log(
      `Merged guest cart ${guestCart.id} (${guestCart.items.length} items) into user cart ${userCartId}`,
    );

    return this.getCartByIdSummary(userCartId);
  }

  /**
   * Get a cart by ID with calculated totals.
   */
  async getCartByIdSummary(cartId: string): Promise<CartSummary> {
    const rawCart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { product: this.productSelect(), variant: this.variantSelect() },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!rawCart) {
      throw new NotFoundException('Cart not found');
    }

    const cart = await this.purgeInvalidItems(rawCart);
    return this.buildCartSummary(cart);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async findCartRaw(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      return null;
    }

    const cart = await this.prisma.cart.findFirst({
      where: {
        ...(userId ? { userId } : { sessionId, userId: null }),
      },
      include: {
        items: {
          include: { product: this.productSelect(), variant: this.variantSelect() },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!cart) {
      return cart;
    }
    return this.purgeInvalidItems(cart);
  }

  /**
   * Strip cart items whose underlying product was archived or whose
   * variant was deactivated. Cart items reference live product/variant
   * rows; if the admin pulls a product from sale the customer should not
   * be allowed to check it out. Deletes the row in the DB AND removes it
   * from the in-memory cart object so callers see the post-purge state.
   * Records the removed item names on the cart so buildCartSummary can
   * surface them to the frontend as a one-time notice.
   */
  private async purgeInvalidItems(cart: any) {
    const removed: { name: string; reason: 'archived' | 'variant_inactive' }[] = [];
    const survivors: any[] = [];
    const deletions: string[] = [];
    for (const item of cart.items as any[]) {
      const productArchived = item.product?.status === 'ARCHIVED';
      const variantInactive = item.variant && item.variant.isActive === false;
      if (productArchived) {
        removed.push({
          name: item.product?.name ?? 'Unknown item',
          reason: 'archived',
        });
        deletions.push(item.id);
        continue;
      }
      if (variantInactive) {
        removed.push({
          name: item.variant?.name
            ? `${item.product?.name ?? 'Unknown'} (${item.variant.name})`
            : item.product?.name ?? 'Unknown item',
          reason: 'variant_inactive',
        });
        deletions.push(item.id);
        continue;
      }
      survivors.push(item);
    }
    if (deletions.length > 0) {
      await this.prisma.cartItem.deleteMany({
        where: { id: { in: deletions } },
      });
    }
    cart.items = survivors;
    cart.__removedItems = removed;
    return cart;
  }

  private productSelect() {
    return {
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        sku: true,
        quantity: true,
        images: true,
        status: true,
      },
    };
  }

  private variantSelect() {
    return {
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        quantity: true,
        isActive: true,
        attributeValues: {
          select: {
            value: true,
            attribute: { select: { id: true, name: true, type: true } },
          },
        },
      },
    };
  }

  private buildCartSummary(cart: any): CartSummary {
    const items: CartItemWithProduct[] = (cart.items || []).map((item: any) => {
      let variant: CartItemVariantSummary | null = null;
      if (item.variant) {
        const options: Record<string, string> = {};
        for (const av of item.variant.attributeValues ?? []) {
          if (av?.attribute?.name) {
            options[av.attribute.name] = av.value;
          }
        }
        variant = {
          id: item.variant.id,
          name: item.variant.name,
          sku: item.variant.sku,
          price: Number(item.variant.price),
          quantity: item.variant.quantity,
          isActive: item.variant.isActive,
          options,
        };
      }
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: Number(item.price),
        lineTotal: Number(item.price) * item.quantity,
        product: {
          ...item.product,
          stock: item.product.quantity,
        },
        variant,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Number(cart.discount || 0);
    const total = Math.max(0, subtotal - discount);
    const itemCount = items.reduce((count, item) => count + item.quantity, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      items,
      subtotal,
      discount,
      total,
      itemCount,
      couponCode: cart.couponCode || null,
      // Surfaced from purgeInvalidItems — empty when nothing was stripped.
      removedItems: cart.__removedItems ?? [],
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  private verifyCartOwnership(cart: any, userId?: string, sessionId?: string): void {
    if (userId && cart.userId === userId) {
      return;
    }
    if (sessionId && cart.sessionId === sessionId && !cart.userId) {
      return;
    }

    throw new BadRequestException('You do not have access to this cart');
  }

  private getCartExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    return expiry;
  }
}
