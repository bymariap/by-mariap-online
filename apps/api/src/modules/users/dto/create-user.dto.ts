import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @Length(2, 80) fullName!: string;
  @IsOptional() @IsString() @Length(7, 20) phone?: string;
  @IsString() roleId!: string;
}
