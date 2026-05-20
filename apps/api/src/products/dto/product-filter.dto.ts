import { Transform, Type } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export enum ProductSortBy {
  CREATED_AT = 'createdAt',
  PRICE = 'price',
  NAME = 'name',
  VIEW_COUNT = 'viewCount',
  AVERAGE_RATING = 'averageRating',
  TOTAL_REVIEWS = 'totalReviews',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum ProductStatusFilter {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export class ProductFilterDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsEnum(ProductSortBy)
  @IsOptional()
  sortBy?: ProductSortBy = ProductSortBy.CREATED_AT;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  categorySlug?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  brandSlug?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  priceMin?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  priceMax?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(ProductStatusFilter)
  @IsOptional()
  status?: ProductStatusFilter;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsOptional()
  @Type(() => Boolean)
  isFeatured?: boolean;

  // Inventory-condition filters, kept separate from `status` since they're
  // computed from stock levels rather than the admin-managed status enum.
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  lowStock?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  outOfStock?: boolean;
}
