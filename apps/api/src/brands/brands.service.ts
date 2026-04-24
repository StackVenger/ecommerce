import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

/**
 * Pagination result for brand listings.
 */
export interface PaginatedBrands {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  // ─── Query Operations ───────────────────────────────────────────────────────

  /**
   * Find all brands with pagination and optional search.
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<PaginatedBrands> {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.BrandWhereInput = {};

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options?.search) {
      const searchTerm = options.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { nameBn: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [brands, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
      this.prisma.brand.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: brands.map((brand) => ({
        ...brand,
        productCount: brand._count.products,
        _count: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Find a single brand by slug.
   */
  async findBySlug(slug: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with slug "${slug}" not found`);
    }

    return {
      ...brand,
      productCount: brand._count.products,
      _count: undefined,
    };
  }

  // ─── CRUD Operations ───────────────────────────────────────────────────────

  /**
   * Create a new brand.
   */
  async create(dto: CreateBrandDto) {
    // Check for duplicate slug
    const existingSlug = await this.prisma.brand.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSlug) {
      throw new ConflictException(`A brand with slug "${dto.slug}" already exists`);
    }

    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name,
        nameBn: dto.nameBn,
        slug: dto.slug,
        logo: dto.logo,
        coverImage: dto.coverImage,
        description: dto.description,
        website: dto.website,
        metaTitle: dto.metaTitle || dto.name,
        metaDescription: dto.metaDescription || dto.description,
      },
    });

    this.logger.log(`Created brand "${brand.name}" (${brand.id})`);

    return brand;
  }

  /**
   * Update an existing brand.
   */
  async update(id: string, dto: UpdateBrandDto) {
    const existing = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Brand with ID "${id}" not found`);
    }

    // Check for duplicate slug (if changing slug)
    if (dto.slug && dto.slug !== existing.slug) {
      const existingSlug = await this.prisma.brand.findUnique({
        where: { slug: dto.slug },
      });

      if (existingSlug) {
        throw new ConflictException(`A brand with slug "${dto.slug}" already exists`);
      }
    }

    const brand = await this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameBn !== undefined && { nameBn: dto.nameBn }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.logo !== undefined && { logo: dto.logo }),
        ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // Destroy Cloudinary assets for replaced logo / cover image.
    const orphans: string[] = [];
    if (dto.logo !== undefined && existing.logo && dto.logo !== existing.logo) {
      orphans.push(existing.logo);
    }
    if (
      dto.coverImage !== undefined &&
      existing.coverImage &&
      dto.coverImage !== existing.coverImage
    ) {
      orphans.push(existing.coverImage);
    }
    if (orphans.length > 0) {
      await this.uploadService.deleteByUrls(orphans);
    }

    this.logger.log(`Updated brand "${brand.name}" (${brand.id})`);

    return {
      ...brand,
      productCount: brand._count.products,
      _count: undefined,
    };
  }

  /**
   * Delete a brand by ID.
   * Cannot delete brands that have associated products.
   */
  async delete(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID "${id}" not found`);
    }

    if (brand._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete brand "${brand.name}" - it has ${brand._count.products} associated products. ` +
          'Please reassign or remove the products first.',
      );
    }

    await this.prisma.brand.delete({
      where: { id },
    });
    await this.uploadService.deleteByUrls([brand.logo, brand.coverImage]);

    this.logger.log(`Deleted brand "${brand.name}" (${id})`);

    return {
      message: `Brand "${brand.name}" has been deleted`,
    };
  }
}
