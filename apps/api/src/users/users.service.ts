import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // Avatar Upload
  // ──────────────────────────────────────────────────────────

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    // Resize to a 200x200 webp profile image and hand it to the configured
    // storage adapter (Cloudinary in prod; local-disk fallback otherwise).
    const resized = await sharp(file.buffer)
      .resize(200, 200, { fit: 'cover', position: 'centre' })
      .webp({ quality: 85 })
      .toBuffer();

    const filename = `avatar_${userId}_${Date.now()}.webp`;
    const result = await this.uploadService.uploadFile(resized, filename, 'image/webp', {
      directory: 'avatars',
      isPublic: true,
    });

    // Best-effort cleanup of the previous avatar (Cloudinary or local).
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });
    if (user?.avatar) {
      try {
        await this.uploadService.deleteByUrl(user.avatar);
      } catch (error) {
        this.logger.warn(`Could not delete old avatar: ${error.message}`);
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: result.url, updatedAt: new Date() },
    });

    this.logger.log(`Avatar uploaded for user ${userId}: ${result.url}`);

    return {
      avatar: result.url,
      message: 'Avatar uploaded successfully',
    };
  }

  // ──────────────────────────────────────────────────────────
  // Address Management
  // ──────────────────────────────────────────────────────────

  async getAddresses(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses;
  }

  async getAddressById(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException(`Address ${addressId} not found`);
    }

    return address;
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    this.logger.log(`Creating address for user ${userId}: ${dto.city}, ${dto.district}`);

    const existingCount = await this.prisma.address.count({
      where: { userId },
    });

    if (existingCount >= 10) {
      throw new BadRequestException('Maximum 10 addresses allowed per account');
    }

    if (dto.isDefault || existingCount === 0) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        user: { connect: { id: userId } },
        fullName: dto.fullName,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        district: dto.district,
        division: dto.division,
        postalCode: dto.postalCode,
        landmark: dto.landmark,
        label: dto.label || 'Home',
        isDefault: dto.isDefault ?? existingCount === 0,
      },
    });

    this.logger.log(`Address ${address.id} created for user ${userId}`);

    return address;
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    await this.getAddressById(userId, addressId);

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Address ${addressId} updated for user ${userId}`);

    return updated;
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.getAddressById(userId, addressId);

    // Address may be referenced by Order.shippingAddressId or
    // billingAddressId (both NO ACTION). Hard-deleting in that case
    // throws a FK violation, which renders as a generic 500 to the
    // customer. Detect referenced rows up front and orphan them
    // (userId=null) so they disappear from the user's list but the
    // historical orders still resolve their address.
    const referenceCount = await this.prisma.order.count({
      where: {
        OR: [{ shippingAddressId: addressId }, { billingAddressId: addressId }],
      },
    });

    let archived = false;
    if (referenceCount > 0) {
      await this.prisma.address.update({
        where: { id: addressId },
        data: { userId: null, isDefault: false },
      });
      archived = true;
    } else {
      await this.prisma.address.delete({
        where: { id: addressId },
      });
    }

    if (address.isDefault) {
      const nextDefault = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (nextDefault) {
        await this.prisma.address.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    this.logger.log(
      `Address ${addressId} ${archived ? 'orphaned' : 'deleted'} for user ${userId}` +
        (archived ? ` (referenced by ${referenceCount} order(s))` : ''),
    );

    return { deleted: !archived, archived, id: addressId };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.getAddressById(userId, addressId);

    await this.prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return updated;
  }

  // ──────────────────────────────────────────────────────────
  // Order History
  // ──────────────────────────────────────────────────────────

  async getOrderHistory(
    userId: string,
    params: { page?: number; limit?: number; status?: string },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (params.status) {
      where.status = params.status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { take: 1 },
                },
              },
            },
          },
          payments: { take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.payments?.[0]?.status ?? null,
      paymentMethod: order.payments?.[0]?.method ?? null,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.totalAmount,
      totalFormatted: `৳${Number(order.totalAmount).toLocaleString('en-BD')}`,
      itemCount: order.items.length,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        price: item.unitPrice,
        image: item.productImage ?? null,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return {
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async getOrderStats(userId: string) {
    const [totalOrders, totalSpentResult, statusCounts] = await Promise.all([
      this.prisma.order.count({ where: { userId } }),
      // Sum totalAmount across orders that aren't CANCELLED/REFUNDED.
      // The schema column is `totalAmount` (Decimal), and there's no
      // paymentStatus on Order — payment state lives on the Payment row.
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          userId,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    statusCounts.forEach((item) => {
      statusMap[item.status] = item._count.id;
    });

    const totalSpent = Number(totalSpentResult._sum.totalAmount ?? 0);

    return {
      totalOrders,
      totalSpent,
      totalSpentFormatted: `৳${totalSpent.toLocaleString('en-BD')}`,
      pending: statusMap['PENDING'] || 0,
      confirmed: statusMap['CONFIRMED'] || 0,
      processing: statusMap['PROCESSING'] || 0,
      shipped: statusMap['SHIPPED'] || 0,
      delivered: statusMap['DELIVERED'] || 0,
      cancelled: statusMap['CANCELLED'] || 0,
    };
  }
}
