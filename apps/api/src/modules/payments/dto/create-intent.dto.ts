import { IsString } from "class-validator";

export class CreateIntentDto {
  @IsString() orderReference!: string;
}
