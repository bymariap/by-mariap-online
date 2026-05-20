import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from "class-validator";

export class UpsertSpecialistDto {
  @IsOptional() @IsString() @Length(0, 1000) bio?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  specialties?: string[];
  @IsOptional() @IsUrl() avatarUrl?: string;
}
