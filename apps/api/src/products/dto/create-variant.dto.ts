import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  attributeId: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: number;

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

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @IsString()
  @IsOptional()
  weightUnit?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeValueDto)
  @IsOptional()
  attributeValues?: VariantAttributeValueDto[];
}

export class UpdateVariantDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

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

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @IsString()
  @IsOptional()
  weightUnit?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeValueDto)
  @IsOptional()
  attributeValues?: VariantAttributeValueDto[];
}
