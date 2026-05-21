import { IsEnum, IsOptional, IsString } from "class-validator";
import { ProductStatus } from "@prisma/client";

export class ListProductsQuery {
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() search?: string;
}
