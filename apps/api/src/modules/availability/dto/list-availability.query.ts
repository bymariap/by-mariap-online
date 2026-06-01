import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ListAvailabilityQuery {
  @IsOptional() @IsString() specialistId?: string;
  @IsDateString() fromDate!: string;
  @IsDateString() toDate!: string;
}
