import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Min,
} from "class-validator";
import { ProductStatus } from "@prisma/client";

export class CreateProductDto {
  @IsString() @Length(2, 120) name!: string;
  @IsString() @Length(2, 140) @Matches(/^[a-z0-9-]+$/) slug!: string;
  @IsOptional() @IsString() @Length(0, 5000) description?: string;
  @IsInt() @Min(0) priceCop!: number;
  @IsInt() @Min(0) stockQuantity!: number;
  @IsArray() @IsUrl({}, { each: true }) @ArrayMaxSize(10) imageUrls!: string[];
  @IsArray() @IsString({ each: true }) categoryIds!: string[];
  @IsEnum(ProductStatus) status!: ProductStatus;
}
