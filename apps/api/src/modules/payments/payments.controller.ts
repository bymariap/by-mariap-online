import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { PaymentsService } from "./payments.service";

@Controller()
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Public()
  @Get("store/payments/intent/:orderReference")
  intent(@Param("orderReference") orderReference: string) {
    return this.svc.createIntent(orderReference);
  }

  @Public()
  @Post("webhooks/wompi")
  async webhook(
    @Body() body: any,
    @Headers("x-event-checksum") headerChecksum: string,
  ) {
    await this.svc.processWebhook(body, headerChecksum ?? "");
    return { ok: true };
  }
}
