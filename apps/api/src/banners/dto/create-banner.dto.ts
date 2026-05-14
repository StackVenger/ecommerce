import { IsString, IsOptional, IsBoolean, IsDateString, IsNotEmpty, IsIn } from 'class-validator';

export const BANNER_POSITIONS = ['HERO', 'SIDEBAR', 'FOOTER', 'POPUP'] as const;
export type BannerPositionDto = (typeof BANNER_POSITIONS)[number];

export class CreateBannerDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  titleBn?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  subtitleBn?: string;

  @IsString()
  @IsNotEmpty()
  image: string;

  @IsString()
  @IsOptional()
  imageMobile?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsIn(BANNER_POSITIONS)
  @IsOptional()
  position?: BannerPositionDto;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  buttonText?: string;

  @IsString()
  @IsOptional()
  buttonTextBn?: string;

  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @IsString()
  @IsOptional()
  textColor?: string;
}
