import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReplaceVariantItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsObject()
  options: Record<string, string>;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price?: number | null;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}

export class ReplaceVariantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplaceVariantItemDto)
  variants: ReplaceVariantItemDto[];
}
