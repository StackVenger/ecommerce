import { IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  // Required for password users (verified server-side); ignored for
  // social-login-only users who have no password set.
  @IsOptional()
  @IsString()
  password?: string;
}
