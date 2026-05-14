import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateMeDto {
  @IsOptional() @IsString() @Length(2, 80) fullName?: string;
  @IsOptional() @IsString() @Length(7, 20)  phone?: string;
}
