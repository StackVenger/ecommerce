import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  BulkUpdateStatusDto,
  BulkDeleteDto,
  BulkAssignCategoryDto,
} from './dto/bulk-operation.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto, UpdateVariantDto } from './dto/create-variant.dto';
import { ProductFilterDto, ProductSortBy, SortOrder } from './dto/product-filter.dto';
import { ReplaceVariantsDto } from './dto/replace-variants.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  // ─── Utility Methods ────────────────────────────────────────────────────────

  generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    const suffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${suffix}`;
  }

  generateSku(name: string): string {
    const prefix = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);

    const uniquePart = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();

    return `${prefix}-${uniquePart}${random}`;
  }

  generateVariantSku(productSlug: string, attributeValues: string[]): string {
    const base = productSlug.toUpperCase().replace(/-/g, '').substring(0, 6);

    const attrPart = attributeValues
      .map((v) =>
        v
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 3),
      )
      .join('-');

    const random = Math.random().toString(36).substring(2, 5).toUpperCase();

    return attrPart ? `${base}-${attrPart}-${random}` : `${base}-VAR-${random}`;
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
    let currentSlug = slug;
    let counter = 0;

    // eslint-disable-next-line no-constant-condition -- loop exits via return once a unique slug is found
    while (true) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: currentSlug },
        select: { id: true },
      });

      if (!existing || existing.id === excludeId) {
        return currentSlug;
      }

      counter++;
      currentSlug = `${slug}-${counter}`;
    }
  }

  private async ensureUniqueSku(sku: string): Promise<string> {
    let currentSku = sku;

    // eslint-disable-next-line no-constant-condition -- loop exits via return once a unique sku is found
    while (true) {
      const existing = await this.prisma.product.findUnique({
        where: { sku: currentSku },
        select: { id: true },
      });

      if (!existing) {
        return currentSku;
      }

      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      currentSku = `${sku.split('-')[0]}-${random}${Date.now().toString(36).toUpperCase().slice(-3)}`;
    }
  }

  private async ensureUniqueVariantSku(sku: string): Promise<string> {
    let currentSku = sku;

    // eslint-disable-next-line no-constant-condition -- loop exits via return once a unique sku is found
    while (true) {
      const existing = await this.prisma.productVariant.findUnique({
        where: { sku: currentSku },
        select: { id: true },
      });

      if (!existing) {
        return currentSku;
      }

      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      currentSku = `${sku.split('-')[0]}-${random}${Date.now().toString(36).toUpperCase().slice(-3)}`;
    }
  }

  // ─── Product CRUD ───────────────────────────────────────────────────────────

  async create(dto: CreateProductDto) {
    this.logger.log(`Creating product: ${dto.name}`);

    const rawSlug = this.generateSlug(dto.name);
    const slug = await this.ensureUniqueSlug(rawSlug);

    const rawSku = this.generateSku(dto.name);
    const sku = await this.ensureUniqueSku(rawSku);

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${dto.categoryId}" not found`);
    }

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
        select: { id: true },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID "${dto.brandId}" not found`);
      }
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        nameBn: dto.nameBn,
        slug,
        description: dto.description,
        descriptionBn: dto.descriptionBn,
        shortDescription: dto.shortDescription,
        sku,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        costPrice: dto.costPrice,
        quantity: dto.quantity ?? 0,
        status: dto.status ?? 'DRAFT',
        category: { connect: { id: dto.categoryId } },
        brand: dto.brandId ? { connect: { id: dto.brandId } } : undefined,
        tags: dto.tags ?? [],
        weight: dto.weight,
        weightUnit: dto.weightUnit ?? 'kg',
        length: dto.length,
        width: dto.width,
        height: dto.height,
        isFeatured: dto.isFeatured ?? false,
        isDigital: dto.isDigital ?? false,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        brand: {
          select: { id: true, name: true, slug: true },
        },
        images: true,
      },
    });

    this.logger.log(`Product created: ${product.id} (${product.slug})`);
    return product;
  }

  async findAll(filters: ProductFilterDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = ProductSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
      categoryId,
      categorySlug,
      brandId,
      brandSlug,
      priceMin,
      priceMax,
      search,
      status,
      tag,
      isFeatured,
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      // Include products from child categories as well
      const childCategories = await this.prisma.category.findMany({
        where: { parentId: categoryId },
        select: { id: true },
      });
      const ids = [categoryId, ...childCategories.map((c) => c.id)];
      where.categoryId = { in: ids };
    } else if (categorySlug) {
      // Look up the category and its children to include all products in the tree
      const category = await this.prisma.category.findUnique({
        where: { slug: categorySlug },
        select: {
          id: true,
          children: { select: { id: true } },
        },
      });
      if (category) {
        const ids = [category.id, ...category.children.map((c) => c.id)];
        where.categoryId = { in: ids };
      } else {
        where.category = { slug: categorySlug };
      }
    }

    if (brandId) {
      where.brandId = brandId;
    } else if (brandSlug) {
      where.brand = { slug: brandSlug };
    }

    if (priceMin !== undefined || priceMax !== undefined) {
      where.price = {};
      if (priceMin !== undefined) {
        where.price.gte = priceMin;
      }
      if (priceMax !== undefined) {
        where.price.lte = priceMax;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          brand: {
            select: { id: true, name: true, slug: true },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: {
              id: true,
              url: true,
              thumbnailUrl: true,
              alt: true,
            },
          },
          _count: {
            select: { reviews: true, variants: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Log search term for analytics (fire-and-forget)
    if (search?.trim()) {
      this.prisma.searchLog
        .create({
          data: { term: search.trim().toLowerCase(), resultsCount: total },
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    }

    const totalPages = Math.ceil(total / limit);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            alt: true,
            isPrimary: true,
            sortOrder: true,
          },
        },
        variants: {
          orderBy: { sortOrder: 'asc' },
          include: {
            attributeValues: {
              include: { attribute: { select: { id: true, name: true, type: true } } },
            },
            images: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, url: true, thumbnailUrl: true, alt: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameBn: true,
            slug: true,
            parent: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        brand: {
          select: { id: true, name: true, nameBn: true, slug: true, logo: true },
        },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            attributeValues: {
              include: {
                attribute: {
                  select: { id: true, name: true, type: true },
                },
              },
            },
            images: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                url: true,
                thumbnailUrl: true,
                alt: true,
              },
            },
          },
        },
        attributes: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            type: true,
            values: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            alt: true,
            width: true,
            height: true,
            isPrimary: true,
            sortOrder: true,
            blurHash: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    const reviewStats = await this.prisma.review.aggregate({
      where: {
        productId: product.id,
        status: 'APPROVED',
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const ratingDistribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId: product.id,
        status: 'APPROVED',
      },
      _count: { rating: true },
    });

    this.logProductView(product.id).catch((err) => {
      this.logger.warn(`Failed to log view for product ${product.id}: ${err.message}`);
    });

    return {
      ...product,
      reviewSummary: {
        averageRating: reviewStats._avg.rating ?? 0,
        totalReviews: reviewStats._count.rating,
        ratingDistribution: ratingDistribution.reduce(
          (acc, item) => {
            acc[item.rating] = item._count.rating;
            return acc;
          },
          {} as Record<number, number>,
        ),
      },
    };
  }

  private async logProductView(productId: string): Promise<void> {
    await Promise.all([
      this.prisma.product.update({
        where: { id: productId },
        data: { viewCount: { increment: 1 } },
      }),
      this.prisma.productViewEvent.create({
        data: { productId },
      }),
    ]);
  }

  async update(id: string, dto: UpdateProductDto) {
    this.logger.log(`Updating product: ${id}`);

    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, sku: true },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const updateData: Prisma.ProductUpdateInput = {};

    // Explicit slug wins over auto-regeneration from a name change.
    const explicitSlug = dto.slug?.trim().toLowerCase();
    if (explicitSlug) {
      updateData.slug = await this.ensureUniqueSlug(explicitSlug, id);
    }

    if (dto.name !== undefined) {
      updateData.name = dto.name;

      if (!explicitSlug && dto.name !== existing.name) {
        const rawSlug = this.generateSlug(dto.name);
        updateData.slug = await this.ensureUniqueSlug(rawSlug, id);
      }
    }

    const explicitSku = dto.sku?.trim().toUpperCase();
    if (explicitSku && explicitSku !== existing.sku) {
      const clash = await this.prisma.product.findFirst({
        where: { sku: explicitSku, NOT: { id } },
        select: { id: true },
      });
      if (clash) {
        throw new BadRequestException(`SKU "${explicitSku}" is already in use`);
      }
      updateData.sku = explicitSku;
    }

    if (dto.nameBn !== undefined) {
      updateData.nameBn = dto.nameBn;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.descriptionBn !== undefined) {
      updateData.descriptionBn = dto.descriptionBn;
    }
    if (dto.shortDescription !== undefined) {
      updateData.shortDescription = dto.shortDescription;
    }
    if (dto.price !== undefined) {
      updateData.price = dto.price;
    }
    if (dto.compareAtPrice !== undefined) {
      updateData.compareAtPrice = dto.compareAtPrice;
    }
    if (dto.costPrice !== undefined) {
      updateData.costPrice = dto.costPrice;
    }
    if (dto.quantity !== undefined) {
      updateData.quantity = dto.quantity;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }
    if (dto.tags !== undefined) {
      updateData.tags = dto.tags;
    }
    if (dto.weight !== undefined) {
      updateData.weight = dto.weight;
    }
    if (dto.weightUnit !== undefined) {
      updateData.weightUnit = dto.weightUnit;
    }
    if (dto.length !== undefined) {
      updateData.length = dto.length;
    }
    if (dto.width !== undefined) {
      updateData.width = dto.width;
    }
    if (dto.height !== undefined) {
      updateData.height = dto.height;
    }
    if (dto.isFeatured !== undefined) {
      updateData.isFeatured = dto.isFeatured;
    }
    if (dto.isDigital !== undefined) {
      updateData.isDigital = dto.isDigital;
    }
    if (dto.metaTitle !== undefined) {
      updateData.metaTitle = dto.metaTitle;
    }
    if (dto.metaDescription !== undefined) {
      updateData.metaDescription = dto.metaDescription;
    }

    if (dto.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID "${dto.categoryId}" not found`);
      }

      updateData.category = { connect: { id: dto.categoryId } };
    }

    if (dto.brandId !== undefined) {
      if (dto.brandId) {
        const brand = await this.prisma.brand.findUnique({
          where: { id: dto.brandId },
          select: { id: true },
        });

        if (!brand) {
          throw new NotFoundException(`Brand with ID "${dto.brandId}" not found`);
        }

        updateData.brand = { connect: { id: dto.brandId } };
      } else {
        updateData.brand = { disconnect: true };
      }
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        brand: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { reviews: true, variants: true },
        },
      },
    });

    this.logger.log(`Product updated: ${product.id} (${product.slug})`);
    return product;
  }

  async archive(id: string) {
    this.logger.log(`Archiving product: ${id}`);

    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    if (product.status === 'ARCHIVED') {
      this.logger.warn(`Product ${id} is already archived`);
      return this.prisma.product.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
      });
    }

    const archived = await this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.log(`Product archived: ${id}`);
    return archived;
  }

  async permanentDelete(id: string) {
    this.logger.log(`Permanently deleting product: ${id}`);

    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    if (product._count.orderItems > 0) {
      throw new ForbiddenException(
        `Cannot permanently delete product "${product.name}" because it has ${product._count.orderItems} associated order item(s). Archive it instead.`,
      );
    }

    // Snapshot the image URLs before cascade-deleting the product so we can
    // destroy the remote Cloudinary assets afterwards.
    const productImages = await this.prisma.productImage.findMany({
      where: { productId: id },
      select: { url: true },
    });

    await this.prisma.product.delete({
      where: { id },
    });

    if (productImages.length > 0) {
      await this.uploadService.deleteByUrls(productImages.map((i) => i.url));
    }

    this.logger.log(`Product permanently deleted: ${id} (${product.slug})`);
    return { deleted: true, id, name: product.name };
  }

  // ─── Variant Management ─────────────────────────────────────────────────────

  async createVariant(productId: string, dto: CreateVariantDto) {
    this.logger.log(`Creating variant for product: ${productId}`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    const attrValues = dto.attributeValues?.map((av) => av.value) ?? [];
    const rawSku = this.generateVariantSku(product.slug, attrValues);
    const sku = await this.ensureUniqueVariantSku(rawSku);

    const lastVariant = await this.prisma.productVariant.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const nextSortOrder = dto.sortOrder ?? (lastVariant ? lastVariant.sortOrder + 1 : 0);

    const variant = await this.prisma.productVariant.create({
      data: {
        product: { connect: { id: productId } },
        name: dto.name,
        sku,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        costPrice: dto.costPrice,
        quantity: dto.quantity ?? 0,
        weight: dto.weight,
        weightUnit: dto.weightUnit ?? 'kg',
        isActive: dto.isActive ?? true,
        sortOrder: nextSortOrder,
        attributeValues: dto.attributeValues
          ? {
              create: dto.attributeValues.map((av) => ({
                attribute: { connect: { id: av.attributeId } },
                value: av.value,
              })),
            }
          : undefined,
      },
      include: {
        attributeValues: {
          include: {
            attribute: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });

    this.logger.log(`Variant created: ${variant.id} (${variant.sku})`);
    return variant;
  }

  async updateVariant(productId: string, variantId: string, dto: UpdateVariantDto) {
    this.logger.log(`Updating variant ${variantId} for product ${productId}`);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true },
    });

    if (!variant) {
      throw new NotFoundException(
        `Variant with ID "${variantId}" not found for product "${productId}"`,
      );
    }

    const updateData: Prisma.ProductVariantUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.price !== undefined) {
      updateData.price = dto.price;
    }
    if (dto.compareAtPrice !== undefined) {
      updateData.compareAtPrice = dto.compareAtPrice;
    }
    if (dto.costPrice !== undefined) {
      updateData.costPrice = dto.costPrice;
    }
    if (dto.quantity !== undefined) {
      updateData.quantity = dto.quantity;
    }
    if (dto.weight !== undefined) {
      updateData.weight = dto.weight;
    }
    if (dto.weightUnit !== undefined) {
      updateData.weightUnit = dto.weightUnit;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }
    if (dto.sortOrder !== undefined) {
      updateData.sortOrder = dto.sortOrder;
    }

    if (dto.attributeValues) {
      await this.prisma.productVariantAttributeValue.deleteMany({
        where: { variantId },
      });

      updateData.attributeValues = {
        create: dto.attributeValues.map((av) => ({
          attribute: { connect: { id: av.attributeId } },
          value: av.value,
        })),
      };
    }

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
      include: {
        attributeValues: {
          include: {
            attribute: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });

    this.logger.log(`Variant updated: ${updated.id}`);
    return updated;
  }

  async deleteVariant(productId: string, variantId: string) {
    this.logger.log(`Deleting variant ${variantId} from product ${productId}`);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: {
        id: true,
        sku: true,
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(
        `Variant with ID "${variantId}" not found for product "${productId}"`,
      );
    }

    if (variant._count.orderItems > 0) {
      throw new ForbiddenException(
        `Cannot delete variant "${variant.sku}" because it has associated order items. Deactivate it instead.`,
      );
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    this.logger.log(`Variant deleted: ${variantId} (${variant.sku})`);
    return { deleted: true, id: variantId, sku: variant.sku };
  }

  /**
   * Bulk-replace all variants for a product.
   *
   * The admin UI sends the full desired variant list as an `options` map per
   * variant (e.g. `{ Color: "Red", Size: "M" }`). This method:
   *   1. Upserts `ProductAttribute` rows per option key and unions their values.
   *   2. Diffs payload variants against existing ones using a canonical
   *      option-tuple fingerprint.
   *   3. Updates matched variants, deletes unmatched ones (or deactivates them
   *      if they have order history), creates brand-new ones.
   *   4. Resyncs `ProductVariantAttributeValue` join rows to match the payload.
   *   5. Cleans up `ProductAttribute` rows that no longer back any variant.
   */
  async replaceVariants(productId: string, dto: ReplaceVariantsDto) {
    this.logger.log(`Replacing variants for product ${productId}: ${dto.variants.length} items`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true, price: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    const fingerprint = (opts: Record<string, string>): string =>
      JSON.stringify(
        Object.fromEntries(Object.entries(opts).sort(([a], [b]) => a.localeCompare(b))),
      );

    // Validate: no duplicate option-tuples in the payload.
    const payloadFps = new Set<string>();
    for (const v of dto.variants) {
      const fp = fingerprint(v.options);
      if (payloadFps.has(fp)) {
        throw new BadRequestException(`Duplicate variant combination: ${fp}`);
      }
      payloadFps.add(fp);
    }

    // Collect per-attribute value sets from the payload.
    const attrValuesMap = new Map<string, Set<string>>();
    for (const v of dto.variants) {
      for (const [attrName, val] of Object.entries(v.options)) {
        if (!attrValuesMap.has(attrName)) {
          attrValuesMap.set(attrName, new Set());
        }
        attrValuesMap.get(attrName)!.add(val);
      }
    }

    // Generate fresh SKUs for any payload variants missing one, OUTSIDE the
    // transaction (ensureUniqueVariantSku uses the base prisma client).
    const payloadSkus = await Promise.all(
      dto.variants.map(async (v) => {
        if (v.sku?.trim()) {
          return v.sku.trim().toUpperCase();
        }
        const raw = this.generateVariantSku(product.slug, Object.values(v.options));
        return this.ensureUniqueVariantSku(raw);
      }),
    );

    // URLs orphaned by the transaction (variant images deleted or swapped).
    // Destroyed on Cloudinary after commit, filtered against current DB state
    // so we never nuke an asset still referenced by another row.
    const orphanedUrls: string[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert ProductAttribute rows and capture their IDs.
      const attrsByName = new Map<string, { id: string }>();
      for (const [name, values] of attrValuesMap) {
        const existing = await tx.productAttribute.findFirst({
          where: { productId, name },
          select: { id: true, values: true },
        });
        if (existing) {
          const union = Array.from(new Set([...existing.values, ...values])).sort();
          await tx.productAttribute.update({
            where: { id: existing.id },
            data: { values: union },
          });
          attrsByName.set(name, { id: existing.id });
        } else {
          const created = await tx.productAttribute.create({
            data: {
              productId,
              name,
              values: Array.from(values).sort(),
              type: 'CUSTOM',
            },
            select: { id: true },
          });
          attrsByName.set(name, created);
        }
      }

      // 2. Load existing variants with their attribute values + order count.
      const existingVariants = await tx.productVariant.findMany({
        where: { productId },
        include: {
          attributeValues: {
            include: { attribute: { select: { id: true, name: true } } },
          },
          _count: { select: { orderItems: true } },
        },
      });

      // 3. Fingerprint existing + payload.
      const existingByFp = new Map<string, (typeof existingVariants)[number]>();
      for (const v of existingVariants) {
        const opts: Record<string, string> = {};
        for (const av of v.attributeValues) {
          opts[av.attribute.name] = av.value;
        }
        existingByFp.set(fingerprint(opts), v);
      }

      // 4. Delete or deactivate variants that are no longer present.
      for (const [fp, variant] of existingByFp) {
        if (payloadFps.has(fp)) {
          continue;
        }
        if (variant._count.orderItems > 0) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { isActive: false },
          });
        } else {
          // Drop variant-scoped images first so they don't land back in the
          // product gallery as orphans via onDelete: SetNull.
          const variantImgs = await tx.productImage.findMany({
            where: { productId, variantId: variant.id },
            select: { url: true },
          });
          for (const img of variantImgs) {
            orphanedUrls.push(img.url);
          }
          await tx.productImage.deleteMany({
            where: { productId, variantId: variant.id },
          });
          await tx.productVariant.delete({ where: { id: variant.id } });
        }
      }

      // 5. Update matched + create new.
      const zipped = dto.variants.map((payload, idx) => ({
        payload,
        sku: payloadSkus[idx] ?? '',
        idx,
      }));
      for (const { payload, sku: desiredSku, idx } of zipped) {
        const fp = fingerprint(payload.options);
        const name = Object.values(payload.options).join(' / ') || 'Default';
        const price =
          payload.price !== undefined && payload.price !== null ? payload.price : product.price;

        const existing = existingByFp.get(fp);

        let variantId: string;
        if (existing) {
          const data: Prisma.ProductVariantUpdateInput = {
            name,
            price,
            quantity: payload.stock,
            isActive: payload.isActive,
          };
          if (desiredSku && desiredSku !== existing.sku) {
            // Check for clash on the new SKU; skip rename silently on conflict.
            const clash = await tx.productVariant.findFirst({
              where: { sku: desiredSku, NOT: { id: existing.id } },
              select: { id: true },
            });
            if (!clash) {
              data.sku = desiredSku;
            }
          }
          await tx.productVariant.update({ where: { id: existing.id }, data });
          await tx.productVariantAttributeValue.deleteMany({
            where: { variantId: existing.id },
          });
          for (const [attrName, val] of Object.entries(payload.options)) {
            const attr = attrsByName.get(attrName);
            if (!attr) {
              continue;
            }
            await tx.productVariantAttributeValue.create({
              data: { variantId: existing.id, attributeId: attr.id, value: val },
            });
          }
          variantId = existing.id;
        } else {
          const created = await tx.productVariant.create({
            data: {
              productId,
              name,
              sku: desiredSku,
              price,
              quantity: payload.stock,
              isActive: payload.isActive,
              sortOrder: idx,
            },
            select: { id: true },
          });
          for (const [attrName, val] of Object.entries(payload.options)) {
            const attr = attrsByName.get(attrName);
            if (!attr) {
              continue;
            }
            await tx.productVariantAttributeValue.create({
              data: { variantId: created.id, attributeId: attr.id, value: val },
            });
          }
          variantId = created.id;
        }

        // Reconcile this variant's image. Variant images are ProductImage
        // rows with `variantId` set; product-level images (variantId=null)
        // stay untouched. When the URL changes or is cleared, we drop the
        // previous variant-scoped row and create a fresh one pointing at
        // the new URL (cloning metadata from the matching product image).
        const wantUrl = payload.imageUrl?.trim() || null;
        const currentVariantImage = await tx.productImage.findFirst({
          where: { productId, variantId },
          select: { id: true, url: true },
        });

        if (!wantUrl) {
          if (currentVariantImage) {
            orphanedUrls.push(currentVariantImage.url);
            await tx.productImage.delete({ where: { id: currentVariantImage.id } });
          }
        } else if (!currentVariantImage || currentVariantImage.url !== wantUrl) {
          if (currentVariantImage) {
            orphanedUrls.push(currentVariantImage.url);
            await tx.productImage.delete({ where: { id: currentVariantImage.id } });
          }
          const source = await tx.productImage.findFirst({
            where: { productId, url: wantUrl, variantId: null },
            select: { thumbnailUrl: true, alt: true, width: true, height: true, blurHash: true },
          });
          await tx.productImage.create({
            data: {
              productId,
              variantId,
              url: wantUrl,
              thumbnailUrl: source?.thumbnailUrl ?? null,
              alt: source?.alt ?? null,
              width: source?.width ?? null,
              height: source?.height ?? null,
              blurHash: source?.blurHash ?? null,
              isPrimary: false,
              sortOrder: 0,
            },
          });
        }
      }

      // 6. Clean up attributes no longer referenced by any variant value.
      const orphanAttrs = await tx.productAttribute.findMany({
        where: { productId, variantValues: { none: {} } },
        select: { id: true },
      });
      if (orphanAttrs.length > 0) {
        await tx.productAttribute.deleteMany({
          where: { id: { in: orphanAttrs.map((a) => a.id) } },
        });
      }

      return tx.productVariant.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
        include: {
          attributeValues: {
            include: { attribute: { select: { id: true, name: true, type: true } } },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, url: true, thumbnailUrl: true, alt: true },
          },
        },
      });
    });

    // Destroy remote assets for orphaned URLs, filtered against the current
    // DB so we don't nuke one that's still referenced by another ProductImage
    // row (e.g. the product gallery cloned the same URL).
    if (orphanedUrls.length > 0) {
      const unique = Array.from(new Set(orphanedUrls));
      const stillLive = await this.prisma.productImage.findMany({
        where: { url: { in: unique } },
        select: { url: true },
      });
      const liveSet = new Set(stillLive.map((r) => r.url));
      const toDestroy = unique.filter((u) => !liveSet.has(u));
      if (toDestroy.length > 0) {
        await this.uploadService.deleteByUrls(toDestroy);
      }
    }

    return result;
  }

  // ─── Image Management ──────────────────────────────────────────────────────

  async addImage(
    productId: string,
    imageData: {
      url: string;
      thumbnailUrl?: string;
      alt?: string;
      width?: number;
      height?: number;
      isPrimary?: boolean;
      variantId?: string;
      blurHash?: string;
    },
  ) {
    this.logger.log(`Adding image to product: ${productId}`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    if (imageData.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const lastImage = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const nextSortOrder = lastImage ? lastImage.sortOrder + 1 : 0;

    const imageCount = await this.prisma.productImage.count({
      where: { productId },
    });
    const shouldBePrimary = imageData.isPrimary ?? imageCount === 0;

    const image = await this.prisma.productImage.create({
      data: {
        product: { connect: { id: productId } },
        variant: imageData.variantId ? { connect: { id: imageData.variantId } } : undefined,
        url: imageData.url,
        thumbnailUrl: imageData.thumbnailUrl,
        alt: imageData.alt,
        width: imageData.width,
        height: imageData.height,
        isPrimary: shouldBePrimary,
        sortOrder: nextSortOrder,
        blurHash: imageData.blurHash,
      },
    });

    this.logger.log(`Image added: ${image.id} to product ${productId}`);
    return image;
  }

  async removeImage(productId: string, imageId: string) {
    this.logger.log(`Removing image ${imageId} from product ${productId}`);

    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
      select: { id: true, isPrimary: true, url: true },
    });

    if (!image) {
      throw new NotFoundException(
        `Image with ID "${imageId}" not found for product "${productId}"`,
      );
    }

    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    if (image.isPrimary) {
      const firstImage = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      });

      if (firstImage) {
        await this.prisma.productImage.update({
          where: { id: firstImage.id },
          data: { isPrimary: true },
        });
      }
    }

    // Only destroy the remote asset if no other row still references it
    // (e.g. a variant may share the same URL cloned as a variant image).
    const stillReferenced = await this.prisma.productImage.count({
      where: { url: image.url },
    });
    if (stillReferenced === 0) {
      await this.uploadService.deleteByUrl(image.url);
    }

    this.logger.log(`Image removed: ${imageId} from product ${productId}`);
    return { deleted: true, id: imageId };
  }

  async reorderImages(productId: string, imageIds: string[]) {
    this.logger.log(`Reordering ${imageIds.length} images for product ${productId}`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    const existingImages = await this.prisma.productImage.findMany({
      where: { productId },
      select: { id: true },
    });

    const existingIds = new Set(existingImages.map((img) => img.id));

    for (const imageId of imageIds) {
      if (!existingIds.has(imageId)) {
        throw new BadRequestException(
          `Image with ID "${imageId}" does not belong to product "${productId}"`,
        );
      }
    }

    await this.prisma.$transaction(
      imageIds.map((imageId, index) =>
        this.prisma.productImage.update({
          where: { id: imageId },
          data: { sortOrder: index },
        }),
      ),
    );

    const updatedImages = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    this.logger.log(`Images reordered for product ${productId}`);
    return updatedImages;
  }

  // ─── Bulk Operations ───────────────────────────────────────────────────────

  /**
   * Bulk update the status of multiple products.
   */
  async bulkUpdateStatus(dto: BulkUpdateStatusDto) {
    this.logger.log(
      `Bulk updating status to "${dto.status}" for ${dto.productIds.length} products`,
    );

    // Verify all products exist
    const existingProducts = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds } },
      select: { id: true },
    });

    const existingIds = new Set(existingProducts.map((p) => p.id));
    const missingIds = dto.productIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(`Products not found: ${missingIds.join(', ')}`);
    }

    const result = await this.prisma.product.updateMany({
      where: { id: { in: dto.productIds } },
      data: { status: dto.status },
    });

    this.logger.log(`Bulk status update completed: ${result.count} products updated`);

    return {
      updated: result.count,
      status: dto.status,
      productIds: dto.productIds,
    };
  }

  /**
   * Bulk delete (archive) multiple products.
   * Products with order items will be archived instead of deleted.
   */
  async bulkDelete(dto: BulkDeleteDto) {
    this.logger.log(`Bulk deleting ${dto.productIds.length} products`);

    // Verify all products exist
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds } },
      select: {
        id: true,
        name: true,
        _count: {
          select: { orderItems: true },
        },
      },
    });

    const existingIds = new Set(products.map((p) => p.id));
    const missingIds = dto.productIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(`Products not found: ${missingIds.join(', ')}`);
    }

    // Separate products that can be deleted vs those that must be archived
    const canDelete: string[] = [];
    const mustArchive: string[] = [];

    for (const product of products) {
      if (product._count.orderItems > 0) {
        mustArchive.push(product.id);
      } else {
        canDelete.push(product.id);
      }
    }

    // Archive products with order items
    let archivedCount = 0;
    if (mustArchive.length > 0) {
      const archiveResult = await this.prisma.product.updateMany({
        where: { id: { in: mustArchive } },
        data: { status: 'ARCHIVED' },
      });
      archivedCount = archiveResult.count;
    }

    // Delete products without order items
    let deletedCount = 0;
    if (canDelete.length > 0) {
      const deleteResult = await this.prisma.product.deleteMany({
        where: { id: { in: canDelete } },
      });
      deletedCount = deleteResult.count;
    }

    this.logger.log(`Bulk delete completed: ${deletedCount} deleted, ${archivedCount} archived`);

    return {
      deleted: deletedCount,
      archived: archivedCount,
      deletedIds: canDelete,
      archivedIds: mustArchive,
    };
  }

  /**
   * Bulk assign a category to multiple products.
   */
  async bulkAssignCategory(dto: BulkAssignCategoryDto) {
    this.logger.log(
      `Bulk assigning category "${dto.categoryId}" to ${dto.productIds.length} products`,
    );

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true, name: true },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${dto.categoryId}" not found`);
    }

    // Verify all products exist
    const existingProducts = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds } },
      select: { id: true },
    });

    const existingIds = new Set(existingProducts.map((p) => p.id));
    const missingIds = dto.productIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(`Products not found: ${missingIds.join(', ')}`);
    }

    const result = await this.prisma.product.updateMany({
      where: { id: { in: dto.productIds } },
      data: { categoryId: dto.categoryId },
    });

    this.logger.log(
      `Bulk category assignment completed: ${result.count} products updated to category "${category.name}"`,
    );

    return {
      updated: result.count,
      categoryId: dto.categoryId,
      categoryName: category.name,
      productIds: dto.productIds,
    };
  }
}
