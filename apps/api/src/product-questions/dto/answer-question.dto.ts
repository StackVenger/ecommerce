import { IsNotEmpty, IsString, Length } from 'class-validator';

export class AnswerProductQuestionDto {
  @IsString()
  @Length(2, 2000, { message: 'Answer must be between 2 and 2000 characters' })
  @IsNotEmpty()
  answer: string;
}
