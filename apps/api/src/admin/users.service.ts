import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { AdminUserQueryDto, CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdminUserQueryDto) {
    const { search, role, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        addresses: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(dto: CreateAdminUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        phone: dto.phone,
        status: 'ACTIVE',
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    await this.findById(id);

    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName;
    }
    if (dto.email !== undefined) {
      data.email = dto.email;
    }
    if (dto.role !== undefined) {
      data.role = dto.role;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true },
    });
  }

  async toggleActive(id: string) {
    const user = await this.findById(id);
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    return this.prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, status: true },
    });
  }

  /**
   * Hard-delete a user and all their traces from the database.
   *
   * Several relations default to ON DELETE RESTRICT (Order, Review) so a
   * naked `user.delete` fails for any account with order or review history.
   * We explicitly clear those, plus AuditLog rows authored by this user
   * (the schema defaults to SetNull, but "all trace" means the rows go too).
   * Account, Address, Cart, Wishlist, Notification cascade automatically.
   * Pages keep their content with authorId nulled (they aren't customer data).
   */
  async remove(id: string, currentUserId?: string) {
    if (currentUserId && id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot delete a SUPER_ADMIN account');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({ where: { userId: id } });
      await tx.review.deleteMany({ where: { userId: id } });
      // Order children (OrderItem, Payment, OrderShipping) all cascade on the
      // Order FK, so deleting the orders is enough.
      await tx.order.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    this.logger.log(`User hard-deleted: ${id} (${user.email})`);
    return { deleted: true, id };
  }
}
