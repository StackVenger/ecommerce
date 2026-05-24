import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

import { WishlistService } from './wishlist.service';

@Controller('wishlist')
@UseGuards(AuthGuard('jwt'))
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async getWishlist(@Req() req: Request) {
    const userId = (req.user as any).id;
    const { items, removedItems } = await this.wishlistService.getWishlist(userId);

    return {
      success: true,
      data: items,
      count: items.length,
      removedItems,
    };
  }

  @Post(':productId')
  async addToWishlist(
    @Req() req: Request,
    @Param('productId') productId: string,
  ) {
    const userId = (req.user as any).id;
    const item = await this.wishlistService.addToWishlist(userId, productId);

    return {
      success: true,
      data: item,
      message: 'Product added to wishlist',
    };
  }

  @Delete(':productId')
  async removeFromWishlist(
    @Req() req: Request,
    @Param('productId') productId: string,
  ) {
    const userId = (req.user as any).id;
    const result = await this.wishlistService.removeFromWishlist(userId, productId);

    return {
      success: true,
      data: result,
      message: 'Product removed from wishlist',
    };
  }

  @Get('check/:productId')
  async isInWishlist(
    @Req() req: Request,
    @Param('productId') productId: string,
  ) {
    const userId = (req.user as any).id;
    const inWishlist = await this.wishlistService.isInWishlist(userId, productId);

    return {
      success: true,
      data: { inWishlist },
    };
  }

  @Get('count')
  async getWishlistCount(@Req() req: Request) {
    const userId = (req.user as any).id;
    const count = await this.wishlistService.getWishlistCount(userId);

    return {
      success: true,
      data: { count },
    };
  }

  @Delete()
  async clearWishlist(@Req() req: Request) {
    const userId = (req.user as any).id;
    const result = await this.wishlistService.clearWishlist(userId);

    return {
      success: true,
      data: result,
      message: 'Wishlist cleared',
    };
  }
}
