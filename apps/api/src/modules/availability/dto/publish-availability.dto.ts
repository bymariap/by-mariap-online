import { IsDateString, IsInt, Max, Min } from 'class-validator';

export class PublishAvailabilityDto {
  @IsDateString() date!: string; // YYYY-MM-DD in Bogota tz
  @IsInt() @Min(0) @Max(1440) startMinute!: number;
  @IsInt() @Min(0) @Max(1440) endMinute!: number;
}
