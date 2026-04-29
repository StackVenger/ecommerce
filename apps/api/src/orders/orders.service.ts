import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, PaymentMethod } from './dto/checkout.dto';
import {
  UpdateOrderStatusDto,
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
} from './dto/update-order-status.dto';
import { ShippingService } from './shipping.service';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingService: ShippingService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

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
      } else if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
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

    // Resolve shipping cost via the same calculation the frontend used at
    // the shipping step. The IDs ('standard', 'express') and per-zone rates
    // come from ShippingService — not the shipping_methods admin table,
    // which is currently a separate, unused config surface.
    let shippingCost = 0;
    if (dto.shippingMethodId) {
      try {
        const calc =
          !isGuest && dto.addressId
            ? await this.shippingService.calculateShipping(dto.addressId, userId)
            : this.shippingService.calculateShippingByDivision(
                dto.shippingDivision || dto.shippingDistrict || 'Dhaka',
              );

        const chosen = calc.methods.find((m) => m.id === dto.shippingMethodId);
        if (!chosen) {
          errors.push('Selected shipping method is not available');
        } else {
          shippingCost = chosen.cost;
        }
      } catch {
        errors.push('Could not calculate shipping for the selected address');
      }
    }

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
          // Pull the first product image too so we can snapshot it on
          // OrderItem.productImage at order-creation time.
          include: {
            product: {
              include: {
                images: {
                  orderBy: { sortOrder: 'asc' },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
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

      // Persist a Payment row so admin views can read a real
      // method/status pair instead of falling back to 'PENDING' / ''.
      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          method: this.mapPaymentMethod(dto.paymentMethod),
          status: 'PENDING',
          amount: validation.total,
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
          data: { usageCount: { increment: 1 } },
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

  /**
   * Build a CSV export of admin orders matching the supplied filters.
   * Filters mirror the list view (`status`, `paymentStatus`,
   * `dateFrom`/`dateTo`) but no pagination — capped at 50 000 rows so
   * a runaway query can't OOM the API.
   */
  async exportOrdersCsv(filters: {
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<string> {
    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status;
    }

    const createdAt: { gte?: Date; lte?: Date } = {};
    if (filters.dateFrom) {
      createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      // Treat dateTo as inclusive end-of-day.
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: { select: { email: true, firstName: true, lastName: true, phone: true } },
        payments: {
          select: { method: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50000,
    });

    // paymentStatus lives on the latest payment row, not the order — filter
    // here in JS since it's not on the order itself.
    const filtered = filters.paymentStatus
      ? orders.filter((o) => (o.payments[0]?.status ?? 'PENDING') === filters.paymentStatus)
      : orders;

    const escape = (v: unknown): string => {
      const s = v === null || v === undefined ? '' : String(v);
      if (/[",\r\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const header = [
      'Order Number',
      'Created At',
      'Status',
      'Payment Status',
      'Payment Method',
      'Subtotal',
      'Shipping Cost',
      'Discount',
      'Total',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Item Count',
    ];

    const rows = filtered.map((o) => {
      const guestName = (o as { guestFullName?: string | null }).guestFullName;
      const guestEmail = (o as { guestEmail?: string | null }).guestEmail;
      const guestPhone = (o as { guestPhone?: string | null }).guestPhone;
      const customerName = o.user
        ? `${o.user.firstName ?? ''} ${o.user.lastName ?? ''}`.trim() || 'Unknown'
        : guestName || 'Guest';
      const customerEmail = o.user?.email ?? guestEmail ?? '';
      const customerPhone = o.user?.phone ?? guestPhone ?? '';

      return [
        o.orderNumber,
        o.createdAt.toISOString(),
        o.status,
        o.payments[0]?.status ?? 'PENDING',
        o.payments[0]?.method ?? '',
        Number(o.subtotal).toFixed(2),
        Number(o.shippingCost).toFixed(2),
        Number(o.discountAmount).toFixed(2),
        Number(o.totalAmount).toFixed(2),
        customerName,
        customerEmail,
        customerPhone,
        o._count.items,
      ]
        .map(escape)
        .join(',');
    });

    return [header.map(escape).join(','), ...rows].join('\r\n') + '\r\n';
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
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    // Verify guest email matches
    if (order.guestEmail?.toLowerCase() !== email.toLowerCase()) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    const payment = order.payments[0];

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: payment?.method ?? null,
      paymentStatus: payment?.status ?? null,
      guestFullName: order.guestFullName,
      guestEmail: order.guestEmail,
      guestPhone: order.guestPhone,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      total: Number(order.totalAmount),
      couponCode: order.couponCode,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        productSlug: item.productSlug,
        sku: item.sku,
        quantity: item.quantity,
        price: Number(item.unitPrice),
        image: item.productImage ?? null,
      })),
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

    const updateData: {
      status: OrderStatus;
      deliveredAt?: Date;
      cancelledAt?: Date;
      notes?: string;
    } = {
      status: dto.status,
    };

    // Order schema only carries deliveredAt and cancelledAt timestamps —
    // CONFIRMED / PROCESSING / SHIPPED transitions update the status
    // column without a dedicated stamp.
    if (dto.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (dto.status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    if (dto.note) {
      // Append a timestamped status note to the Order.notes field —
      // the schema's general-purpose place for free-text remarks.
      const stamp = new Date().toISOString();
      const prefix = order.notes ? `${order.notes}\n` : '';
      updateData.notes = `${prefix}[${stamp}] ${dto.status}: ${dto.note}`;
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: { items: true },
      });

      // When the order completes, also mark the latest Payment row as
      // PAID so the admin list reflects post-delivery payment state.
      if (dto.status === OrderStatus.DELIVERED) {
        const latestPayment = await tx.payment.findFirst({
          where: { orderId },
          orderBy: { createdAt: 'desc' },
        });
        if (latestPayment && latestPayment.status !== 'PAID') {
          await tx.payment.update({
            where: { id: latestPayment.id },
            data: { status: 'PAID', paidAt: new Date() },
          });
        }
      }

      return next;
    });

    this.logger.log(`Order ${order.orderNumber} status updated: ${order.status} → ${dto.status}`);

    if (dto.notifyCustomer) {
      await this.deliverStatusChangeEmail(orderId, dto.status, dto.note);
    }

    return updatedOrder;
  }

  // Send a customer-facing email announcing the new order status. Errors are
  // logged but never thrown — a transient SMTP issue must not roll back the
  // status update that already committed to the database.
  private async deliverStatusChangeEmail(
    orderId: string,
    status: OrderStatus,
    note: string | undefined,
  ): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          orderNumber: true,
          guestEmail: true,
          guestFullName: true,
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      });

      if (!order) {
        this.logger.warn(`Status email skipped: order ${orderId} not found`);
        return;
      }

      const recipient = order.user?.email ?? order.guestEmail;
      if (!recipient) {
        this.logger.warn(
          `Status email skipped for order ${order.orderNumber}: no email on user or guest`,
        );
        return;
      }

      const fullName = order.user
        ? `${order.user.firstName} ${order.user.lastName}`.trim()
        : (order.guestFullName ?? 'Customer');

      const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
      const orderUrl = `${webUrl}/account/orders/${orderId}`;

      await this.emailService.sendEmail({
        to: recipient,
        subject: `Order ${order.orderNumber} — ${status}`,
        template: 'order-status',
        context: {
          customerName: fullName || 'Customer',
          orderNumber: order.orderNumber,
          status,
          note: note ?? '',
          orderUrl,
        },
      });

      this.logger.log(
        `Status email sent for order ${order.orderNumber} → ${status} → ${recipient}`,
      );
    } catch (error) {
      const err = error as Error & { code?: string };
      this.logger.error(
        `Failed to send status email for order ${orderId}: ${err.message} (code=${err.code ?? 'n/a'})`,
        err.stack,
      );
    }
  }

  /**
   * Translate the narrow checkout PaymentMethod enum (CARD/COD/BKASH)
   * into the wider DB enum the Payment row stores. Adding new options
   * means extending both the DTO and this map.
   */
  private mapPaymentMethod(method: PaymentMethod): 'CREDIT_CARD' | 'CASH_ON_DELIVERY' | 'BKASH' {
    switch (method) {
      case PaymentMethod.CARD:
        return 'CREDIT_CARD';
      case PaymentMethod.COD:
        return 'CASH_ON_DELIVERY';
      case PaymentMethod.BKASH:
        return 'BKASH';
      default:
        return 'CASH_ON_DELIVERY';
    }
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
          data: { quantity: { increment: item.quantity } },
        });
      }

      // 2. Restore coupon usage count if a coupon was applied
      if (order.couponCode) {
        await tx.coupon.update({
          where: { code: order.couponCode },
          data: { usageCount: { decrement: 1 } },
        });
      }

      // 3. Latest payment status drives whether we need a refund
      const latestPayment = await tx.payment.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: 'desc' },
      });
      const needsRefund = latestPayment?.status === 'PAID';

      // 4. Update the order status — append a free-text cancellation
      //    note to Order.notes (Order has no statusNote / paymentStatus columns).
      const cancellationNote = reason
        ? `Cancelled by ${cancelledBy}: ${reason}`
        : `Cancelled by ${cancelledBy}`;
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          notes: order.notes ? `${order.notes}\n${cancellationNote}` : cancellationNote,
        },
        include: { items: true },
      });

      // 5. Reflect the cancellation on the Payment row for admin views.
      //    Already-PAID payments stay PAID until admin issues an
      //    explicit refund (which flips them to REFUNDED) — there is
      //    no REFUND_PENDING status in the schema.
      if (latestPayment && !needsRefund) {
        await tx.payment.update({
          where: { id: latestPayment.id },
          data: { status: 'CANCELLED' },
        });
      }

      return updated;
    });

    this.logger.log(
      `Order ${order.orderNumber} cancelled by ${cancelledBy}. ` +
        `${order.items.length} items restored to inventory.`,
    );

    return cancelledOrder;
  }
}
