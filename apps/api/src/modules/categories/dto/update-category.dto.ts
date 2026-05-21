import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional() @IsString() @Length(2, 60) name?: string;
  @IsOptional() @IsString() @Length(2, 60) @Matches(/^[a-z0-9-]+$/) slug?: string;
}
