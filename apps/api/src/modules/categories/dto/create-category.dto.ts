import { IsString, Length, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @Length(2, 60) name!: string;
  @IsString() @Length(2, 60) @Matches(/^[a-z0-9-]+$/, { message: 'slug must be kebab-case lowercase' })
  slug!: string;
}
