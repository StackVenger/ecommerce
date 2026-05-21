import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

/**
 * Shipping zone definitions for Bangladesh.
 */
export enum ShippingZone {
  INSIDE_DHAKA = 'INSIDE_DHAKA',
  OUTSIDE_DHAKA = 'OUTSIDE_DHAKA',
}

/**
 * Shipping method with cost and delivery estimate.
 *
 * `baseCost` is the rate-card cost before free-shipping is applied;
 * `cost` is the effective cost the customer pays (0 when isFree).
 * Keeping both lets the storefront strike-through the original price
 * once the order crosses the configured threshold.
 */
export interface ShippingMethod {
  id: string;
  name: string;
  zone: ShippingZone;
  baseCost: number;
  cost: number;
  estimatedDays: string;
  freeAbove: number;
  isFree: boolean;
}

/**
 * Shipping cost calculation result.
 */
export interface ShippingCalculation {
  zone: ShippingZone;
  methods: ShippingMethod[];
  subtotal: number;
  qualifiesForFreeShipping: boolean;
  freeShippingThreshold: number;
}

/**
 * Shipping rates configuration.
 *
 * - Inside Dhaka: ৳60 (standard), ৳120 (express)
 * - Outside Dhaka: ৳120 (standard), ৳200 (express)
 *
 * Free-shipping threshold and toggle live in admin settings
 * (SHIPPING.free_shipping_threshold / SHIPPING.enable_free_shipping).
 */
const SHIPPING_RATES = {
  [ShippingZone.INSIDE_DHAKA]: {
    standard: 60,
    express: 120,
  },
  [ShippingZone.OUTSIDE_DHAKA]: {
    standard: 120,
    express: 200,
  },
};

/**
 * Districts within Dhaka division that qualify for "Inside Dhaka" shipping.
 */
const DHAKA_DISTRICTS = ['Dhaka', 'Gazipur', 'Narayanganj', 'Munshiganj', 'Manikganj', 'Narsingdi'];

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Determine the shipping zone based on the address district.
   */
  getShippingZone(district: string): ShippingZone {
    const normalized = district.trim();

    if (DHAKA_DISTRICTS.some((d) => d.toLowerCase() === normalized.toLowerCase())) {
      return ShippingZone.INSIDE_DHAKA;
    }

    return ShippingZone.OUTSIDE_DHAKA;
  }

  /**
   * Read the admin-configured free-shipping policy. Returns a disabled
   * policy (threshold = +Infinity) if the toggle is off so no caller has
   * to special-case the disabled state.
   */
  private async getFreeShippingPolicy(): Promise<{ enabled: boolean; threshold: number }> {
    try {
      const pub = await this.settings.getPublicSettings();
      return {
        enabled: pub.shipping.enable_free_shipping,
        threshold: pub.shipping.enable_free_shipping
          ? pub.shipping.free_shipping_threshold
          : Number.POSITIVE_INFINITY,
      };
    } catch (err) {
      this.logger.warn(
        `Failed to load shipping settings, defaulting to disabled: ${(err as Error).message}`,
      );
      return { enabled: false, threshold: Number.POSITIVE_INFINITY };
    }
  }

  /**
   * Resolve the cart subtotal for a user. Mirrors the cart service's own
   * calculation (item.price × quantity) — the cart locks in the line
   * price at add-to-cart time, which can differ from the current product
   * price (variant pricing, sales, etc).
   */
  private async getCartSubtotal(userId?: string, sessionId?: string): Promise<number> {
    if (!userId && !sessionId) {
      return 0;
    }
    const cart = await this.prisma.cart.findFirst({
      where: userId ? { userId } : { sessionId, userId: null },
      include: { items: true },
    });
    if (!cart) {
      return 0;
    }
    return cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  }

  private buildMethods(
    zone: ShippingZone,
    subtotal: number,
    threshold: number,
  ): { methods: ShippingMethod[]; qualifiesForFreeShipping: boolean } {
    const rates = SHIPPING_RATES[zone];
    const qualifiesForFreeShipping = subtotal >= threshold;

    const methods: ShippingMethod[] = [
      {
        id: 'standard',
        name:
          zone === ShippingZone.INSIDE_DHAKA
            ? 'Standard Delivery (Inside Dhaka)'
            : 'Standard Delivery (Outside Dhaka)',
        zone,
        baseCost: rates.standard,
        cost: qualifiesForFreeShipping ? 0 : rates.standard,
        estimatedDays: zone === ShippingZone.INSIDE_DHAKA ? '1-2 days' : '3-5 days',
        freeAbove: threshold,
        isFree: qualifiesForFreeShipping,
      },
      {
        id: 'express',
        name:
          zone === ShippingZone.INSIDE_DHAKA
            ? 'Express Delivery (Inside Dhaka)'
            : 'Express Delivery (Outside Dhaka)',
        zone,
        baseCost: rates.express,
        // Express is always paid — free-shipping only covers standard,
        // matching the displayed delivery-information copy.
        cost: rates.express,
        estimatedDays: zone === ShippingZone.INSIDE_DHAKA ? 'Same day' : '1-2 days',
        freeAbove: threshold,
        isFree: false,
      },
    ];

    return { methods, qualifiesForFreeShipping };
  }

  /**
   * Calculate shipping cost for a given address.
   *
   * GET /shipping/calculate?addressId=x[&subtotal=3000]
   */
  async calculateShipping(
    addressId: string,
    userId?: string,
    providedSubtotal?: number,
    sessionId?: string,
  ): Promise<ShippingCalculation> {
    const where: any = { id: addressId };
    if (userId) {
      where.userId = userId;
    }

    const address = await this.prisma.address.findFirst({ where });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const zone = this.getShippingZone(address.district);

    // Trust the caller's subtotal when given (it matches what the cart
    // sidebar displayed), else recompute from the persisted cart.
    const subtotal =
      providedSubtotal !== undefined && providedSubtotal >= 0
        ? providedSubtotal
        : await this.getCartSubtotal(userId, sessionId);

    const policy = await this.getFreeShippingPolicy();
    const { methods, qualifiesForFreeShipping } = this.buildMethods(
      zone,
      subtotal,
      policy.threshold,
    );

    this.logger.debug(
      `Shipping calculated for ${address.district}: zone=${zone}, subtotal=৳${subtotal}, threshold=৳${policy.threshold}, free=${qualifiesForFreeShipping}`,
    );

    return {
      zone,
      methods,
      subtotal,
      qualifiesForFreeShipping,
      freeShippingThreshold: policy.threshold,
    };
  }

  /**
   * Calculate shipping methods by division name (for guests without a
   * saved address). Accepts an optional subtotal/session so free shipping
   * applies consistently for guests as well as authenticated buyers.
   */
  async calculateShippingByDivision(
    division: string,
    opts?: { subtotal?: number; sessionId?: string; userId?: string },
  ): Promise<ShippingCalculation> {
    const zone = DHAKA_DISTRICTS.some((d) => d.toLowerCase() === division.trim().toLowerCase())
      ? ShippingZone.INSIDE_DHAKA
      : ShippingZone.OUTSIDE_DHAKA;

    const subtotal =
      opts?.subtotal !== undefined && opts.subtotal >= 0
        ? opts.subtotal
        : await this.getCartSubtotal(opts?.userId, opts?.sessionId);

    const policy = await this.getFreeShippingPolicy();
    const { methods, qualifiesForFreeShipping } = this.buildMethods(
      zone,
      subtotal,
      policy.threshold,
    );

    return {
      zone,
      methods,
      subtotal,
      qualifiesForFreeShipping,
      freeShippingThreshold: policy.threshold,
    };
  }
}
