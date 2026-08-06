import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
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
