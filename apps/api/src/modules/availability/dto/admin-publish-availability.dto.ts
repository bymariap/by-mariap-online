import { IsDateString, IsInt, IsString, Max, Min } from 'class-validator';

export class AdminPublishAvailabilityDto {
  @IsString() specialistId!: string;
  @IsDateString() date!: string; // YYYY-MM-DD in Bogota tz
  @IsInt() @Min(0) @Max(1440) startMinute!: number;
  @IsInt() @Min(0) @Max(1440) endMinute!: number;
}
