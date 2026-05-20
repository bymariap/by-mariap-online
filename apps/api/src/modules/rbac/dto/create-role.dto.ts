import { IsOptional, IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @IsString() @Length(2, 40) name!: string;
  @IsOptional() @IsString() description?: string;
}
