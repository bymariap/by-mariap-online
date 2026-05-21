import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { WompiClient } from "./wompi.client";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, WompiClient],
})
export class PaymentsModule {}
