import { IsString, IsOptional, IsBoolean, IsPostalCode, Length, Matches } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @Length(2, 100)
  fullName: string;

  @IsString()
  @Matches(/^(\+880|0)[0-9]{10}$/, {
    message: 'Phone number must be a valid Bangladeshi number (e.g., +8801XXXXXXXXX)',
  })
  phone: string;

  @IsString()
  @Length(2, 255)
  addressLine1: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  addressLine2?: string;

  @IsString()
  @Length(2, 100)
  city: string;

  @IsString()
  @Length(2, 100)
  district: string;

  @IsString()
  @IsOptional()
  @Length(2, 100)
  division?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  landmark?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
