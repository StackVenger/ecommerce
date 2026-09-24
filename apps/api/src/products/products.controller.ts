import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

import {
  BulkUpdateStatusDto,
  BulkDeleteDto,
  BulkAssignCategoryDto,
} from './dto/bulk-operation.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto, UpdateVariantDto } from './dto/create-variant.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ReplaceVariantsDto } from './dto/replace-variants.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * DTO for adding an image to a product.
 * In production, this would be handled via multipart form upload.
 */
class AddImageDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  alt?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  width?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  height?: number;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsString()
  @IsOptional()
  blurHash?: string;
}

class ReorderImagesDto {
  @IsArray()
  @IsString({ each: true })
  imageIds: string[];
}

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── Bulk Operation Endpoints ───────────────────────────────────────────────
  // NOTE: These must be defined BEFORE parameterized routes like :slug/:id
  // to prevent NestJS from interpreting "bulk" as a route parameter.

  /**
   * Bulk update status of multiple products.
   * Restricted to ADMIN and SUPER_ADMIN roles.
   */
  @Post('bulk/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateStatus(
    @Body() bulkUpdateStatusDto: BulkUpdateStatusDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.bulkUpdateStatus(bulkUpdateStatusDto);
  }

  /**
   * Bulk delete (archive) multiple products.
   * Products with order history will be archived instead of deleted.
   * Restricted to ADMIN and SUPER_ADMIN roles.
   */
  @Post('bulk/delete')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto, @CurrentUser() _user: AuthenticatedUser) {
    return this.productsService.bulkDelete(bulkDeleteDto);
  }

  /**
   * Bulk assign a category to multiple products.
   * Restricted to ADMIN and SUPER_ADMIN roles.
   */
  @Post('bulk/category')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async bulkAssignCategory(
    @Body() bulkAssignCategoryDto: BulkAssignCategoryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.bulkAssignCategory(bulkAssignCategoryDto);
  }

  // ─── Product Endpoints ──────────────────────────────────────────────────────

  /**
   * Create a new product.
   * Restricted to ADMIN and SUPER_ADMIN roles.
   */
  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.create(createProductDto);
  }

  /**
   * List products with pagination, sorting, and filtering.
   * Public endpoint - no authentication required.
   */
  @Get()
  @Public()
  async findAll(@Query() filters: ProductFilterDto, @CurrentUser() user: AuthenticatedUser | null) {
    return this.productsService.findAll(filters, user?.role);
  }

  /**
   * Get a single product by ID — admin-only, used by the edit form.
   * Declared before the public :slug route so Nest matches /by-id/:id first.
   */
  @Get('by-id/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  /**
   * Resolve a historical slug to the product's current canonical slug.
   * The storefront calls this when /products/[slug] 404s so it can issue
   * a 301 redirect to the new URL instead of dropping the user on a 404.
   * Declared before the public :slug route so Nest matches it first.
   */
  @Get('slug-alias/:slug')
  @Public()
  async resolveSlugAlias(@Param('slug') slug: string) {
    return this.productsService.resolveSlugAlias(slug);
  }

  /**
   * Get a single product by slug with full details.
   * Public endpoint - no authentication required.
   */
  @Get(':slug')
  @Public()
  async findBySlug(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser | null) {
    return this.productsService.findBySlug(slug, user?.role);
  }

  /**
   * Update an existing product by ID.
   * Restricted to ADMIN and SUPER_ADMIN roles.
   */
  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  /**
   * Delete a product by ID.
   * By default, this archives the product (soft delete).
   * Pass ?permanent=true to permanently delete (SUPER_ADMIN only).
   */
  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id') id: string,
    @Query('permanent') permanent: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    if (permanent === 'true') {
      if (_user.role !== 'SUPER_ADMIN') {
        throw new Error('Only SUPER_ADMIN can permanently delete products');
      }
      return this.productsService.permanentDelete(id);
    }

    return this.productsService.archive(id);
  }

  // ─── Variant Endpoints ──────────────────────────────────────────────────────

  /**
   * Bulk-replace variants for a product. The admin UI sends the full desired
   * variant list; the server diffs against existing variants, upserts
   * attributes, and creates/updates/deletes rows in one transaction.
   *
   * Declared BEFORE parametric :id/variants/:variantId routes so Nest
   * matches the literal "replace" segment first.
   */
  @Put(':id/variants/replace')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async replaceVariants(
    @Param('id') productId: string,
    @Body() dto: ReplaceVariantsDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.replaceVariants(productId, dto);
  }

  /**
   * Create a new variant for a product.
   */
  @Post(':id/variants')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createVariant(
    @Param('id') productId: string,
    @Body() createVariantDto: CreateVariantDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.createVariant(productId, createVariantDto);
  }

  /**
   * Update an existing variant.
   */
  @Patch(':id/variants/:variantId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateVariant(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() updateVariantDto: UpdateVariantDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.updateVariant(productId, variantId, updateVariantDto);
  }

  /**
   * Delete a variant from a product.
   */
  @Delete(':id/variants/:variantId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async deleteVariant(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.deleteVariant(productId, variantId);
  }

  // ─── Image Endpoints ───────────────────────────────────────────────────────

  /**
   * Add an image to a product.
   * In production, this endpoint would accept multipart/form-data
   * and handle file upload to a cloud storage service.
   */
  @Post(':id/images')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async addImage(
    @Param('id') productId: string,
    @Body() addImageDto: AddImageDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.addImage(productId, addImageDto);
  }

  /**
   * Remove an image from a product.
   */
  @Delete(':id/images/:imageId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async removeImage(
    @Param('id') productId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.removeImage(productId, imageId);
  }

  /**
   * Reorder images for a product.
   * Accepts an array of image IDs in the desired display order.
   */
  @Patch(':id/images/reorder')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async reorderImages(
    @Param('id') productId: string,
    @Body() reorderDto: ReorderImagesDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.productsService.reorderImages(productId, reorderDto.imageIds);
  }
}
