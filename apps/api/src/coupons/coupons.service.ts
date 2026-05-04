import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

// ──────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────

/**
 * Coupons service.
 *
 * Handles CRUD operations for discount coupons and validation
 * of coupon codes during checkout. All monetary values in BDT (৳).
 */
@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Map a Prisma `Coupon` row (DB column names + Decimal types) to the
   * shape the API contract / admin frontend expects (camelCase aliases,
   * plain numbers). Keeps the controller-level response stable even
   * though the underlying schema uses different column names.
   */
  private toResponse<T extends Record<string, unknown> | null>(
    coupon: T,
  ): T extends null ? null : Record<string, unknown> {
    if (!coupon) {
      return null as T extends null ? null : never;
    }
    const c = coupon as Record<string, any>;
    const dec = (v: unknown): number | null => {
      if (v === null || v === undefined) {
        return null;
      }
      if (typeof v === 'number') {
        return v;
      }
      // Prisma Decimal has .toNumber(); strings come from JSON serialization
      if (typeof (v as any).toNumber === 'function') {
        return (v as any).toNumber();
      }
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return {
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.type,
      discountValue: dec(c.value) ?? 0,
      minimumOrderAmount: dec(c.minOrderAmount),
      maximumDiscount: dec(c.maxDiscount),
      usageLimit: c.usageLimit ?? null,
      usageLimitPerUser: c.perUserLimit ?? 1,
      usageCount: c.usageCount ?? 0,
      isActive: c.isActive,
      startDate: c.startsAt,
      endDate: c.expiresAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    } as T extends null ? null : Record<string, unknown>;
  }

  // ─── Create ─────────────────────────────────────────────────────────

  /**
   * Create a new coupon.
   */
  async create(dto: CreateCouponDto) {
    // Check for duplicate coupon code
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Coupon code "${dto.code}" already exists`);
    }

    const created = await this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        description: dto.description,
        type: dto.discountType,
        value: dto.discountValue,
        minOrderAmount: dto.minimumOrderAmount,
        maxDiscount: dto.maximumDiscount,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.usageLimitPerUser ?? 1,
        startsAt: new Date(dto.startDate),
        expiresAt: dto.endDate ? new Date(dto.endDate) : null,
        isActive: dto.isActive ?? true,
      },
    });
    return this.toResponse(created);
  }

  // ─── Find All ───────────────────────────────────────────────────────

  /**
   * Get all coupons with pagination and optional filtering.
   */
  async findAll(params: { page: number; limit: number; search?: string; status?: string }) {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { code: { contains: search.toUpperCase() } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
      where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }];
    } else if (status === 'expired') {
      where.expiresAt = { lt: new Date() };
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: coupons.map((c) => this.toResponse(c)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Find One ───────────────────────────────────────────────────────

  /**
   * Get a single coupon by ID.
   */
  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.toResponse(coupon);
  }

  // ─── Update ─────────────────────────────────────────────────────────

  /**
   * Update a coupon.
   */
  async update(id: string, dto: UpdateCouponDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = {};

    if (dto.code) {
      data.code = dto.code.toUpperCase();

      // Check for duplicate
      const existing = await this.prisma.coupon.findFirst({
        where: { code: data.code as string, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Coupon code "${dto.code}" already exists`);
      }
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.discountType !== undefined) {
      data.type = dto.discountType;
    }
    if (dto.discountValue !== undefined) {
      data.value = dto.discountValue;
    }
    if (dto.minimumOrderAmount !== undefined) {
      data.minOrderAmount = dto.minimumOrderAmount;
    }
    if (dto.maximumDiscount !== undefined) {
      data.maxDiscount = dto.maximumDiscount;
    }
    if (dto.usageLimit !== undefined) {
      data.usageLimit = dto.usageLimit;
    }
    if (dto.usageLimitPerUser !== undefined) {
      data.perUserLimit = dto.usageLimitPerUser;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.startDate) {
      data.startsAt = new Date(dto.startDate);
    }
    if (dto.endDate) {
      data.expiresAt = new Date(dto.endDate);
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data,
    });
    return this.toResponse(updated);
  }

  // ─── Delete ─────────────────────────────────────────────────────────

  /**
   * Delete a coupon.
   */
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.coupon.delete({
      where: { id },
    });
  }

  // ─── Validate Coupon ────────────────────────────────────────────────

  /**
   * Validate a coupon code for a given order amount.
   *
   * Checks:
   * - Coupon exists and is active
   * - Not expired
   * - Usage limit not exceeded
   * - Minimum order amount met
   *
   * Returns the calculated discount in BDT (৳).
   */
  async validateCoupon(code: string, orderAmount: number, userId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid or inactive coupon code');
    }

    // Check expiry
    const now = new Date();
    if (coupon.startsAt > now) {
      throw new BadRequestException('This coupon is not yet active');
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException('This coupon has expired');
    }

    // Check usage limit
    if (coupon.usageLimit) {
      const totalUsage = await this.prisma.order.count({
        where: { couponCode: coupon.code },
      });
      if (totalUsage >= coupon.usageLimit) {
        throw new BadRequestException('This coupon usage limit has been reached');
      }
    }

    // Check per-user usage limit
    if (coupon.perUserLimit) {
      const userUsage = await this.prisma.order.count({
        where: { couponCode: coupon.code, userId },
      });
      if (userUsage >= coupon.perUserLimit) {
        throw new BadRequestException(
          'You have already used this coupon the maximum number of times',
        );
      }
    }

    // Check minimum order amount (BDT ৳)
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount.toNumber()) {
      throw new BadRequestException(
        `Minimum order amount is ৳${coupon.minOrderAmount.toNumber()} for this coupon`,
      );
    }

    // Calculate discount
    let discount: number;
    if (coupon.type === 'PERCENTAGE') {
      discount = (orderAmount * coupon.value.toNumber()) / 100;
      // Apply maximum discount cap only when admin set a positive value.
      // `coupon.maxDiscount` is a Prisma Decimal (object → always truthy)
      // and defaults to 0 in the schema, so a plain `if` would clamp to 0.
      const maxCap = coupon.maxDiscount?.toNumber() ?? 0;
      if (maxCap > 0) {
        discount = Math.min(discount, maxCap);
      }
    } else {
      discount = coupon.value.toNumber();
    }

    // Discount cannot exceed order amount
    discount = Math.min(discount, orderAmount);

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.type,
        discountValue: coupon.value,
      },
      discount: Math.round(discount * 100) / 100,
      finalAmount: Math.round((orderAmount - discount) * 100) / 100,
    };
  }
}
