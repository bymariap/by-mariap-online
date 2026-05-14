import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() @Length(2, 80) fullName?: string;
  @IsOptional() @IsString() @Length(7, 20) phone?: string;
  @IsOptional() @IsString() roleId?: string;
}
