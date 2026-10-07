import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Upsert the state of a single checklist item (check state and/or answer).
export class UpsertItemDto {
  @IsString()
  @MaxLength(120)
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  checked?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  answer?: string;
}

export const GRADE_LEVELS = ['Intern', 'Junior', 'Mid', 'Senior', 'Staff', 'Principal'];

// Ask the AI to grade (and save) the answer for one checklist item.
export class GradeItemDto {
  @IsString()
  @MaxLength(120)
  categoryId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(600)
  question: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  section?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  answer: string;

  @IsOptional()
  @IsIn(GRADE_LEVELS)
  level?: string;
}
