import { IsEnum, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { ServiceStatus } from '@prisma/client';

export class CreateServiceDto {
  @IsString() @Length(2, 80)  name!: string;
  @IsString() @Length(2, 80) @Matches(/^[a-z0-9-]+$/) slug!: string;
  @IsOptional() @IsString() @Length(0, 2000) description?: string;
  @IsInt() @Min(5) durationMinutes!: number;
  @IsInt() @Min(0) priceCop!: number;
  @IsEnum(ServiceStatus) status!: ServiceStatus;
}
