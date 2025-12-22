import * as fs from 'fs/promises';
import * as path from 'path';

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as sharp from 'sharp';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'avatars');

  constructor(private readonly prisma: PrismaService) {
    void this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.warn(`Could not create avatar upload directory: ${error.message}`);
    }
  }

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

    const timestamp = Date.now();
    const ext = 'webp';

    // Generate two sizes: 200x200 (profile) and 50x50 (thumbnail)
    const avatarFilename = `avatar_${userId}_${timestamp}.${ext}`;
    const thumbFilename = `avatar_${userId}_${timestamp}_thumb.${ext}`;

    const avatarPath = path.join(this.uploadDir, avatarFilename);
    const thumbPath = path.join(this.uploadDir, thumbFilename);

    // Resize to 200x200 for profile display
    await sharp(file.buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 85 })
      .toFile(avatarPath);

    // Resize to 50x50 for thumbnail/navbar
    await sharp(file.buffer)
      .resize(50, 50, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    // Delete old avatar files if they exist
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (user?.avatar) {
      const oldFilename = path.basename(user.avatar);
      const oldThumbFilename = oldFilename.replace('.webp', '_thumb.webp');

      try {
        await fs.unlink(path.join(this.uploadDir, oldFilename));
        await fs.unlink(path.join(this.uploadDir, oldThumbFilename));
      } catch {
        // Old files may not exist — ignore
      }
    }

    const avatarUrl = `/uploads/avatars/${avatarFilename}`;
    const thumbUrl = `/uploads/avatars/${thumbFilename}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatar: avatarUrl,
        avatarThumb: thumbUrl,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Avatar uploaded for user ${userId}: ${avatarFilename}`);

    return {
      avatar: avatarUrl,
      thumbnail: thumbUrl,
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

    await this.prisma.address.delete({
      where: { id: addressId },
    });

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

    this.logger.log(`Address ${addressId} deleted for user ${userId}`);

    return { deleted: true, id: addressId };
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
    const [totalOrders, totalSpent, statusCounts] = await Promise.all([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { userId, paymentStatus: 'PAID' },
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

    return {
      totalOrders,
      totalSpent: totalSpent._sum.total || 0,
      totalSpentFormatted: `৳${(totalSpent._sum.total || 0).toLocaleString('en-BD')}`,
      pending: statusMap['PENDING'] || 0,
      confirmed: statusMap['CONFIRMED'] || 0,
      processing: statusMap['PROCESSING'] || 0,
      shipped: statusMap['SHIPPED'] || 0,
      delivered: statusMap['DELIVERED'] || 0,
      cancelled: statusMap['CANCELLED'] || 0,
    };
  }
}
