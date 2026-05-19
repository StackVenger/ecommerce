import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  Matches,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';

import { ProductStatus } from './create-product.dto';

/**
 * DTO for updating an existing product.
 * All fields are optional - only provided fields will be updated.
 * This is a manual PartialType implementation to keep decorators explicit.
 */
export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  nameBn?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumerics separated by single hyphens',
  })
  slug?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'sku must be uppercase alphanumerics and hyphens only',
  })
  sku?: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  description?: string;

  @IsString()
  @IsOptional()
  descriptionBn?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  shortDescription?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  compareAtPrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  costPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  quantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  lowStockThreshold?: number;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @IsString()
  @IsOptional()
  weightUnit?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  length?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  width?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  height?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  isDigital?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  metaDescription?: string;
}
