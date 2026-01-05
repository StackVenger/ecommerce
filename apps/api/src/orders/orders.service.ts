import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import {
  UpdateOrderStatusDto,
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
} from './dto/update-order-status.dto';

/**
 * Validation result for a single cart item during checkout.
 */
interface ItemValidation {
  productId: string;
  name: string;
  requestedQuantity: number;
  availableStock: number;
  unitPrice: number;
  lineTotal: number;
  inStock: boolean;
}

/**
 * Complete checkout validation result.
 */
interface CheckoutValidation {
  valid: boolean;
  items: ItemValidation[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  errors: string[];
}

/**
 * Pagination options for order listings.
 */
interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Statuses that allow cancellation by the customer.
 */
const CUSTOMER_CANCELLABLE_STATUSES = [OrderStatus.PENDING, OrderStatus.CONFIRMED];

/**
 * Statuses that allow cancellation by an admin.
 */
const ADMIN_CANCELLABLE_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Order Number Generator ─────────────────────────────────────────────────

  async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const todayCount = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const sequence = String(todayCount + 1).padStart(4, '0');
    const orderNumber = `ORD-${dateStr}-${sequence}`;

    this.logger.debug(`Generated order number: ${orderNumber}`);

    return orderNumber;
  }

  // ─── Checkout Validation ──────────────────────────────────────────────────────

  async validateCheckout(
    dto: CheckoutDto,
    userId?: string,
    sessionId?: string,
  ): Promise<CheckoutValidation> {
    const errors: string[] = [];
    const isGuest = !userId;

    // Look up cart by userId or sessionId
    const cartWhere: any = userId ? { userId } : sessionId ? { sessionId, userId: null } : null;

    if (!cartWhere) {
      throw new BadRequestException('No cart found. Please add items to your cart first.');
    }

    const cart = await this.prisma.cart.findFirst({
      where: cartWhere,
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    const itemValidations: ItemValidation[] = [];

    for (const item of cart.items) {
      const product = item.product;
      const inStock = product.quantity >= item.quantity;

      if (!inStock) {
        errors.push(
          `"${product.name}" has only ${product.quantity} in stock (requested ${item.quantity})`,
        );
      }

      if (product.status !== 'ACTIVE') {
        errors.push(`"${product.name}" is no longer available`);
      }

      itemValidations.push({
        productId: product.id,
        name: product.name,
        requestedQuantity: item.quantity,
        availableStock: product.quantity,
        unitPrice: Number(product.price),
        lineTotal: Number(product.price) * item.quantity,
        inStock,
      });
    }

    const subtotal = itemValidations.reduce((sum, v) => sum + v.lineTotal, 0);

    // Address validation: authenticated users use addressId, guests provide inline
    if (isGuest) {
      if (!dto.guestEmail) {
        errors.push('Guest email is required');
      }
      if (!dto.guestFullName) {
        errors.push('Guest name is required');
      }
      if (!dto.guestPhone) {
        errors.push('Guest phone is required');
      }
      if (!dto.shippingAddressLine1) {
        errors.push('Shipping address is required');
      }
      if (!dto.shippingDivision) {
        errors.push('Shipping division is required');
      }
      if (!dto.shippingDistrict) {
        errors.push('Shipping district is required');
      }
      if (!dto.shippingPostalCode) {
        errors.push('Shipping postal code is required');
      }
    } else {
      if (!dto.addressId) {
        errors.push('Shipping address is required');
      } else {
        const address = await this.prisma.address.findFirst({
          where: { id: dto.addressId, userId },
        });
        if (!address) {
          errors.push('Shipping address not found or does not belong to you');
        }
      }
    }

    let discount = 0;

    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode.toUpperCase() },
      });

      if (!coupon) {
        errors.push('Invalid coupon code');
      } else if (!coupon.isActive) {
        errors.push('This coupon is no longer active');
      } else if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        errors.push('This coupon has expired');
      } else if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        errors.push('This coupon has reached its usage limit');
      } else if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
        errors.push(`Minimum order of ৳${String(coupon.minOrderAmount)} required for this coupon`);
      } else {
        if (coupon.type === 'PERCENTAGE') {
          discount = (subtotal * Number(coupon.value)) / 100;
          if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
            discount = Number(coupon.maxDiscount);
          }
        } else {
          discount = Number(coupon.value);
        }
        discount = Math.min(discount, subtotal);
      }
    }

    const shippingCost = 0;
    const total = Math.max(0, subtotal - discount + shippingCost);

    return {
      valid: errors.length === 0,
      items: itemValidations,
      subtotal,
      discount,
      shippingCost,
      total,
      errors,
    };
  }

  // ─── Order Creation ───────────────────────────────────────────────────────────

  async createOrder(dto: CheckoutDto, userId?: string, sessionId?: string) {
    const isGuest = !userId;
    const validation = await this.validateCheckout(dto, userId, sessionId);

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Checkout validation failed',
        errors: validation.errors,
      });
    }

    // Look up cart
    const cartWhere: any = userId ? { userId } : { sessionId, userId: null };

    const cart = await this.prisma.cart.findFirst({
      where: cartWhere,
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // Resolve shipping address
    let address: any;

    if (isGuest) {
      // Create a guest address record (userId = null)
      address = await this.prisma.address.create({
        data: {
          fullName: dto.shippingFullName || dto.guestFullName || 'Guest',
          phone: dto.shippingPhone || dto.guestPhone || '',
          addressLine1: dto.shippingAddressLine1 || '',
          addressLine2: dto.shippingAddressLine2 || null,
          division: dto.shippingDivision || '',
          district: dto.shippingDistrict || '',
          area: dto.shippingArea || null,
          postalCode: dto.shippingPostalCode || '',
          label: 'Guest',
        },
      });
    } else {
      address = await this.prisma.address.findFirst({
        where: { id: dto.addressId, userId },
      });

      if (!address) {
        throw new NotFoundException('Shipping address not found');
      }
    }

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const product = await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });

        if (product.quantity < 0) {
          throw new BadRequestException(`"${item.product.name}" went out of stock during checkout`);
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: userId || null,
          status: 'PENDING',
          subtotal: validation.subtotal,
          discountAmount: validation.discount,
          shippingCost: validation.shippingCost,
          taxAmount: 0,
          totalAmount: validation.total,
          couponCode: dto.couponCode?.toUpperCase() || null,
          shippingAddressId: address.id,
          // Guest contact info
          guestEmail: isGuest ? dto.guestEmail : null,
          guestPhone: isGuest ? dto.guestPhone : null,
          guestFullName: isGuest ? dto.guestFullName : null,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              productName: item.product.name,
              productSlug: item.product.slug,
              sku: item.product.sku,
              unitPrice: Number(item.product.price),
              quantity: item.quantity,
              totalPrice: Number(item.product.price) * item.quantity,
              productImage: item.product.images?.[0]?.url || null,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { couponCode: null, discount: 0 },
      });

      if (dto.couponCode) {
        await tx.coupon.update({
          where: { code: dto.couponCode.toUpperCase() },
          data: { usedCount: { increment: 1 } },
        });
      }

      return createdOrder;
    });

    this.logger.log(
      `Order ${orderNumber} created for ${isGuest ? `guest (${dto.guestEmail})` : `user ${userId}`} — ${cart.items.length} items, total ৳${validation.total}`,
    );

    return order;
  }

  // ─── Order Queries ────────────────────────────────────────────────────────────

  async findUserOrders(userId: string, options: PaginationOptions) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              productImage: true,
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOrderByNumber(orderNumber: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        shippingAddress: true,
        payments: {
          select: { method: true, status: true },
          orderBy: { createdAt: 'desc' as const },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    if (userId && order.userId !== userId) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    return order;
  }

  async findAllOrders(options: PaginationOptions & { status?: string }) {
    const { page, limit, status } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          payments: {
            select: { method: true, status: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          shipping: {
            select: {
              shippingMethod: { select: { name: true } },
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        subtotal: Number(o.subtotal),
        shippingCost: Number(o.shippingCost),
        discountAmount: Number(o.discountAmount),
        customer: o.user
          ? {
              name: `${o.user.firstName ?? ''} ${o.user.lastName ?? ''}`.trim() || 'Unknown',
              email: o.user.email,
              phone: o.user.phone ?? '',
            }
          : {
              name: (o as any).guestFullName || 'Guest',
              email: (o as any).guestEmail || '',
              phone: (o as any).guestPhone || '',
            },
        items: o._count.items,
        paymentStatus: o.payments[0]?.status ?? 'PENDING',
        paymentMethod: o.payments[0]?.method ?? '',
        shippingMethod: o.shipping?.shippingMethod?.name ?? '',
        notes: o.notes,
        cancellationReason: o.cancellationReason,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productImage: true,
            variantName: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            _count: { select: { orders: true } },
          },
        },
        payments: {
          select: {
            method: true,
            status: true,
            transactionId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        shipping: {
          select: {
            trackingNumber: true,
            carrier: true,
            shippingMethod: { select: { name: true } },
          },
        },
        shippingAddress: true,
        billingAddress: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const payment = order.payments[0];

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: payment?.status ?? 'PENDING',
      paymentMethod: payment?.method ?? '',
      transactionId: payment?.transactionId ?? null,
      customer: order.user
        ? {
            id: order.user.id,
            name: `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim() || 'Unknown',
            email: order.user.email,
            phone: order.user.phone ?? '',
            totalOrders: order.user._count.orders,
          }
        : {
            id: null,
            name: (order as any).guestFullName || 'Guest',
            email: (order as any).guestEmail || '',
            phone: (order as any).guestPhone || '',
            totalOrders: 0,
          },
      shippingAddress: order.shippingAddress
        ? {
            name: order.shippingAddress.fullName,
            phone: order.shippingAddress.phone,
            address: [order.shippingAddress.addressLine1, order.shippingAddress.addressLine2]
              .filter(Boolean)
              .join(', '),
            city: order.shippingAddress.district,
            area: order.shippingAddress.area ?? order.shippingAddress.division,
            postalCode: order.shippingAddress.postalCode,
          }
        : null,
      billingAddress: order.billingAddress
        ? {
            name: order.billingAddress.fullName,
            phone: order.billingAddress.phone,
            address: [order.billingAddress.addressLine1, order.billingAddress.addressLine2]
              .filter(Boolean)
              .join(', '),
            city: order.billingAddress.district,
            area: order.billingAddress.area ?? order.billingAddress.division,
            postalCode: order.billingAddress.postalCode,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        image: item.productImage ?? null,
        variant: item.variantName ?? null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      tax: Number(order.taxAmount),
      discount: Number(order.discountAmount),
      couponCode: order.couponCode,
      totalAmount: Number(order.totalAmount),
      shippingMethod: order.shipping?.shippingMethod?.name ?? '',
      trackingNumber: order.shipping?.trackingNumber ?? null,
      notes: order.notes,
      timeline: [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  // ─── Guest Order Lookup ───────────────────────────────────────────────────────

  /**
   * Look up a guest order by order number + email verification.
   */
  async findGuestOrder(orderNumber: string, email: string) {
    if (!orderNumber || !email) {
      throw new BadRequestException('Order number and email are required');
    }

    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        shippingAddress: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    // Verify guest email matches
    if (order.guestEmail?.toLowerCase() !== email.toLowerCase()) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      guestFullName: order.guestFullName,
      guestEmail: order.guestEmail,
      guestPhone: order.guestPhone,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      couponCode: order.couponCode,
      items: order.items,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  // ─── Order Status Update ──────────────────────────────────────────────────────

  /**
   * Update an order's status with transition validation.
   */
  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order not found`);
    }

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status] || [];

    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition order from "${order.status}" to "${dto.status}". ` +
          `Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none (terminal state)'}`,
      );
    }

    const updateData: any = {
      status: dto.status,
    };

    if (dto.status === OrderStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
    } else if (dto.status === OrderStatus.SHIPPED) {
      updateData.shippedAt = new Date();
    } else if (dto.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
      updateData.paymentStatus = 'PAID';
    } else if (dto.status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    if (dto.note) {
      updateData.statusNote = dto.note;
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: { items: true },
    });

    this.logger.log(`Order ${order.orderNumber} status updated: ${order.status} → ${dto.status}`);

    return updatedOrder;
  }

  // ─── Order Cancellation ───────────────────────────────────────────────────────

  /**
   * Cancel an order (customer-initiated).
   *
   * Validates that the order belongs to the user and is in a cancellable
   * status (PENDING or CONFIRMED). Restores inventory for all items and
   * initiates a refund if payment was already processed.
   *
   * @param orderId - The order ID to cancel
   * @param userId - The authenticated user's ID
   * @param reason - Optional cancellation reason
   * @returns The cancelled order
   */
  async cancelOrder(orderId: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status as OrderStatus)) {
      throw new BadRequestException(
        `Order cannot be cancelled. Current status: ${order.status}. ` +
          `Cancellation is only allowed for orders in ${CUSTOMER_CANCELLABLE_STATUSES.join(' or ')} status.`,
      );
    }

    return this.executeCancellation(order, reason, 'customer');
  }

  /**
   * Cancel an order (admin-initiated).
   *
   * Admins can cancel orders in PENDING, CONFIRMED, or PROCESSING status.
   * Restores inventory and initiates refund if needed.
   *
   * @param orderId - The order ID to cancel
   * @param reason - Optional cancellation reason
   * @returns The cancelled order
   */
  async adminCancelOrder(orderId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!ADMIN_CANCELLABLE_STATUSES.includes(order.status as OrderStatus)) {
      throw new BadRequestException(
        `Order cannot be cancelled. Current status: ${order.status}. ` +
          `Admin cancellation is allowed for: ${ADMIN_CANCELLABLE_STATUSES.join(', ')}`,
      );
    }

    return this.executeCancellation(order, reason, 'admin');
  }

  /**
   * Execute the cancellation: restore inventory, update status, initiate refund.
   */
  private async executeCancellation(
    order: any,
    reason: string | undefined,
    cancelledBy: 'customer' | 'admin',
  ) {
    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Restore inventory for each item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // 2. Restore coupon usage count if a coupon was applied
      if (order.couponCode) {
        await tx.coupon.update({
          where: { code: order.couponCode },
          data: { usedCount: { decrement: 1 } },
        });
      }

      // 3. Determine refund status
      const needsRefund = order.paymentStatus === 'PAID';
      const paymentStatus = needsRefund ? 'REFUND_PENDING' : 'CANCELLED';

      // 4. Update the order status
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus,
          cancelledAt: new Date(),
          statusNote: reason
            ? `Cancelled by ${cancelledBy}: ${reason}`
            : `Cancelled by ${cancelledBy}`,
        },
        include: { items: true },
      });

      return updated;
    });

    this.logger.log(
      `Order ${order.orderNumber} cancelled by ${cancelledBy}. ` +
        `${order.items.length} items restored to inventory.`,
    );

    return cancelledOrder;
  }
}
