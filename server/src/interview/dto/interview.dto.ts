import {
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const INTERVIEW_TYPES = [
  'technical',
  'live-coding',
  'system-design',
  'behavioural',
  'mixed',
] as const;

export const LEVELS = [
  'Intern',
  'Junior',
  'Mid',
  'Senior',
  'Staff',
  'Principal',
] as const;

export class CreateInterviewDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  role: string;

  @IsIn(LEVELS as unknown as string[])
  level: string;

  @IsIn(INTERVIEW_TYPES as unknown as string[])
  interviewType: string;

  @IsInt()
  @IsIn([15, 30, 45])
  durationMin: number;

  @IsString()
  @MaxLength(15000)
  resumeText: string;
}

export class AnswerDto {
  @IsString()
  @MaxLength(20000)
  answer: string;
}
