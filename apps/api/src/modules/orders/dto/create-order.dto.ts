import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ShippingAddressDto {
  @IsString() @Length(2, 80) fullName!: string;
  @IsString() @Length(7, 20) phone!: string;
  @IsString() @Length(5, 200) address!: string;
  @IsString() @Length(2, 80) city!: string;
  @IsOptional() @IsString() @Length(0, 300) notes?: string;
}

export class CreateOrderDto {
  @IsString() shippingZoneId!: string;
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;
  @IsOptional() @IsEmail() guestEmail?: string;
  @IsOptional() @IsString() @Length(7, 20) guestPhone?: string;
}
