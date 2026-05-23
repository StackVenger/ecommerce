import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Headers,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

/**
 * Shopping cart controller.
 *
 * All cart endpoints support both authenticated users and guests.
 * Guest carts are identified by the X-Session-Id header.
 */
@Controller('cart')
@UseGuards(OptionalAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ─── Cart ─────────────────────────────────────────────────────────────────────

  /**
   * Get the current cart with items, subtotal, discount, total, and item count.
   *
   * GET /cart
   */
  @Get()
  async getCart(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.getCart(
      user?.id,
      !user ? sessionId : undefined,
    );
  }

  /**
   * Get or create the current user's/guest's cart.
   *
   * POST /cart
   */
  @Post()
  async getOrCreateCart(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.getOrCreateCart(
      user?.id,
      !user ? sessionId : undefined,
    );
  }

  // ─── Items ────────────────────────────────────────────────────────────────────

  /**
   * Add an item to the cart.
   *
   * POST /cart/items
   */
  @Post('items')
  async addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.addItem(
      dto,
      user?.id,
      !user ? sessionId : undefined,
    );
  }

  /**
   * Update the quantity of a cart item.
   *
   * PATCH /cart/items/:itemId
   */
  @Patch('items/:itemId')
  async updateItemQuantity(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.updateItemQuantity(
      itemId,
      dto,
      user?.id,
      !user ? sessionId : undefined,
    );
  }

  /**
   * Remove a specific item from the cart.
   *
   * DELETE /cart/items/:itemId
   */
  @Delete('items/:itemId')
  async removeItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.removeItem(
      itemId,
      user?.id,
      !user ? sessionId : undefined,
    );
  }

  /**
   * Remove all items from the cart.
   *
   * DELETE /cart/items
   */
  @Delete('items')
  async clearCart(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.clearCart(
      user?.id,
      !user ? sessionId : undefined,
    );
  }

  // ─── Coupon ───────────────────────────────────────────────────────────────────

  /**
   * Apply a coupon code to the cart.
   *
   * POST /cart/coupon
   *
   * Validates the coupon and calculates the discount based on
   * coupon type (percentage or fixed) and cart subtotal.
   */
  @Post('coupon')
  async applyCoupon(
    @Body() dto: ApplyCouponDto,
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.applyCoupon(
      dto,
      user?.id,
      !user ? sessionId : undefined,
    );
  }

  /**
   * Remove the applied coupon from the cart.
   *
   * DELETE /cart/coupon
   */
  @Delete('coupon')
  async removeCoupon(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.removeCoupon(
      user?.id,
      !user ? sessionId : undefined,
    );
  }

  // ─── Merge ────────────────────────────────────────────────────────────────────

  /**
   * Merge a guest cart into the authenticated user's cart.
   *
   * POST /cart/merge
   */
  @Post('merge')
  @UseGuards(JwtAuthGuard)
  async mergeGuestCart(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-session-id') sessionId: string,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('You must be logged in to merge a cart');
    }
    if (!sessionId) {
      throw new BadRequestException('Session ID is required to merge a cart');
    }

    return this.cartService.mergeGuestCart(user.id, sessionId);
  }
}
