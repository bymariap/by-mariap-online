import {
  IsDateString, IsEmail, IsOptional, IsString, Length,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString() serviceId!: string;
  @IsString() specialistId!: string;
  @IsDateString() startAt!: string; // ISO UTC instant from /store/availability response

  @IsOptional() @IsEmail() guestEmail?: string;
  @IsOptional() @IsString() @Length(7, 20) guestPhone?: string;
  @IsOptional() @IsString() @Length(2, 80) guestFullName?: string;
  @IsOptional() @IsString() @Length(0, 500) notes?: string;
}
