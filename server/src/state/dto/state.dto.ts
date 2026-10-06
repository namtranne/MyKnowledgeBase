import { IsDefined, IsString, MaxLength, MinLength } from 'class-validator';

// Body for PUT /api/state. `value` is any JSON-serialisable value.
// The key lives in the body (not the URL) because keys contain "/" (doc routes).
export class PutStateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  key: string;

  @IsDefined()
  value: unknown;
}
