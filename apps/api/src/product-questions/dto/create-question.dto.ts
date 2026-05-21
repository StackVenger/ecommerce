import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateProductQuestionDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @Length(5, 1000, { message: 'Question must be between 5 and 1000 characters' })
  question: string;
}
